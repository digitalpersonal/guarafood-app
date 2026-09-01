import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

// Use memory storage for quick and safe processing without disk IO bottlenecks
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB per file
    files: 30, // up to 30 files
  }
});

// Helper to consolidate and deduplicate menu items across batches/files
function consolidateMenuCategories(rawCategories: any[]): any[] {
  const categoryMap = new Map<string, { name: string; items: Map<string, { name: string; description: string; price: number }> }>();

  for (const cat of rawCategories) {
    if (!cat || typeof cat !== 'object') continue;
    const catName = typeof cat.name === 'string' ? cat.name.trim() : '';
    if (!catName) continue;

    // Normalizing category name (case-insensitive, accent-insensitive for grouping)
    const catKey = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        name: catName,
        items: new Map()
      });
    }

    const targetCat = categoryMap.get(catKey)!;
    const rawItems = Array.isArray(cat.items) ? cat.items : [];

    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const itemName = typeof item.name === 'string' ? item.name.trim() : '';
      if (!itemName) continue;

      // Normalize item key for duplicate detection (removes special chars, dashes, extra spaces)
      const itemKey = itemName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (typeof item.price === 'string') {
        const cleanedPrice = item.price.replace(/[^\d.,]/g, '').replace(',', '.');
        price = parseFloat(cleanedPrice) || 0;
      }

      const description = typeof item.description === 'string' ? item.description.trim() : '';

      if (!targetCat.items.has(itemKey)) {
        targetCat.items.set(itemKey, {
          name: itemName,
          description,
          price: Math.max(0, price)
        });
      } else {
        const existing = targetCat.items.get(itemKey)!;
        // Keep longer/more detailed description
        if (!existing.description && description) {
          existing.description = description;
        }
        // If existing had 0 price but new has valid price, update it
        if (existing.price === 0 && price > 0) {
          existing.price = price;
        }
      }
    }
  }

  return Array.from(categoryMap.values()).map(cat => ({
    name: cat.name,
    items: Array.from(cat.items.values())
  })).filter(cat => cat.items.length > 0);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.post("/api/import-menu", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado. Selecione imagens ou PDFs do cardápio." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in environment.");
        return res.status(500).json({
          error: "Chave GEMINI_API_KEY não configurada no servidor. Por favor, configure a chave nas configurações do projeto."
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Convert files into Gemini inlineData parts
      const validParts: { originalname: string; part: any }[] = [];
      const failedFiles: string[] = [];

      for (const file of files) {
        try {
          let mimeType = file.mimetype;
          if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = path.extname(file.originalname).toLowerCase();
            if (ext === '.pdf') mimeType = 'application/pdf';
            else if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
          }

          validParts.push({
            originalname: file.originalname,
            part: {
              inlineData: {
                mimeType,
                data: file.buffer.toString('base64'),
              },
            },
          });
        } catch (err) {
          console.error(`Failed to process buffer for file ${file.originalname}:`, err);
          failedFiles.push(file.originalname);
        }
      }

      if (validParts.length === 0) {
        return res.status(400).json({ error: "Nenhum dos arquivos enviados pôde ser lido." });
      }

      // Process batches with retry and fallback model support
      const BATCH_SIZE = 2;
      const batches: typeof validParts[] = [];
      for (let i = 0; i < validParts.length; i += BATCH_SIZE) {
        batches.push(validParts.slice(i, i + BATCH_SIZE));
      }

      const prompt = `Extraia itens e categorias deste cardápio em JSON.
Regras:
1. Identifique categorias (ex: Lanches, Pizzas, Bebidas).
2. Para cada item: "name", "description" (se houver) e "price" (número em reais).
3. Não invente produtos.`;

      // Helper function to call Gemini with model fallback and exponential backoff retry for 503/429
      const callGeminiWithRetry = async (batchParts: any[], maxAttempts = 3) => {
        const candidateModels = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const modelName = candidateModels[attempt % candidateModels.length];
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...batchParts,
                prompt,
              ],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: {
                        type: Type.STRING,
                        description: "Nome da categoria",
                      },
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: {
                              type: Type.STRING,
                              description: "Nome do item",
                            },
                            description: {
                              type: Type.STRING,
                              description: "Descrição",
                            },
                            price: {
                              type: Type.NUMBER,
                              description: "Preço numérico",
                            },
                          },
                          required: ["name", "price"],
                        },
                      },
                    },
                    required: ["name", "items"],
                  },
                },
              },
            });

            return response;
          } catch (err: any) {
            console.warn(`Attempt ${attempt + 1} with model ${modelName} failed:`, err?.message || err);
            if (attempt < maxAttempts - 1) {
              // Wait 1.5s before retry with next model
              await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
            } else {
              throw err;
            }
          }
        }
        throw new Error("Falha ao gerar conteúdo após múltiplas tentativas.");
      };

      const batchPromises = batches.map(async (currentBatch) => {
        const batchParts = currentBatch.map(b => b.part);
        try {
          const response = await callGeminiWithRetry(batchParts);
          const responseText = response.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed)) {
              return { success: true, data: parsed, files: currentBatch.map(b => b.originalname) };
            }
          }
          return { success: false, data: [], files: currentBatch.map(b => b.originalname) };
        } catch (batchErr: any) {
          console.error("Batch extraction error:", batchErr);
          return { success: false, data: [], files: currentBatch.map(b => b.originalname) };
        }
      });

      const results = await Promise.all(batchPromises);
      const allExtractedData: any[] = [];

      for (const res of results) {
        if (res.success && res.data.length > 0) {
          allExtractedData.push(...res.data);
        } else {
          failedFiles.push(...res.files);
        }
      }

      // Consolidate categories, merge across files, and remove duplicates
      const finalConsolidatedMenu = consolidateMenuCategories(allExtractedData);

      if (finalConsolidatedMenu.length === 0 && failedFiles.length > 0) {
        return res.status(400).json({
          error: "Não foi possível extrair itens dos arquivos enviados. Verifique a qualidade e o formato das imagens/PDFs.",
          failedFiles,
        });
      }

      return res.json({
        categories: finalConsolidatedMenu,
        failedFiles,
      });
    } catch (error: any) {
      console.error("Critical error in /api/import-menu:", error);
      return res.status(500).json({
        error: error.message || "Ocorreu um erro interno ao processar os arquivos do cardápio."
      });
    }
  });

  // API endpoint for smart AI product suggestions (complements like drinks, desserts, sides)
  app.post("/api/product-suggestions", async (req, res) => {
    try {
      const { itemName, itemDescription } = req.body;
      if (!itemName) {
        return res.status(400).json({ error: "itemName é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Com base no item de cardápio "${itemName}" (descrição: "${itemDescription || 'N/A'}"), sugira 2 ou 3 itens complementares perfeitos para acompanhar (como bebidas, sobremesas ou acompanhamentos). Retorne um array JSON com objetos contendo:
1. "name": Nome do item sugerido (ex: "Coca-Cola 2L", "Pudim de Leite").
2. "description": Breve descrição apetitosa.
3. "price": Preço médio estimado em reais (número).
4. "category": Categoria (ex: "Bebidas", "Sobremesas", "Acompanhamentos").`;

      const candidateModels = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];
      let responseText = "";

      for (let attempt = 0; attempt < candidateModels.length; attempt++) {
        const modelName = candidateModels[attempt];
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [prompt],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["name", "price", "category"]
                }
              }
            }
          });
          responseText = response.text || "";
          if (responseText) break;
        } catch (err: any) {
          console.warn(`Attempt ${attempt + 1} with model ${modelName} failed for suggestions:`, err?.message || err);
        }
      }

      if (!responseText) {
        return res.json({
          suggestions: [
            { name: "Coca-Cola 2L", description: "Refrigerante gelado", price: 14.00, category: "Bebidas" },
            { name: "Pudim de Leite", description: "Sobremesa caseira", price: 10.00, category: "Sobremesas" }
          ]
        });
      }

      const parsed = JSON.parse(responseText);
      return res.json({ suggestions: Array.isArray(parsed) ? parsed : [] });
    } catch (error: any) {
      console.error("Error in /api/product-suggestions:", error);
      return res.status(500).json({ error: error.message || "Erro ao gerar sugestões." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
