import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
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

  app.use(express.json({ limit: '50mb' }));

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

      const allExtractedData: any[] = [];
      const BATCH_SIZE = 4; // Process in chunks to prevent timeouts and optimize token usage

      for (let i = 0; i < validParts.length; i += BATCH_SIZE) {
        const currentBatch = validParts.slice(i, i + BATCH_SIZE);
        const batchParts = currentBatch.map(b => b.part);

        const prompt = `Você é um assistente especializado em digitalizar cardápios de restaurantes a partir de imagens e arquivos PDF.
Analise todas as páginas e imagens enviadas neste lote.
Elas fazem parte de um cardápio de restaurante.

Instruções fundamentais:
1. Identifique e extraia todas as categorias de produtos (ex: "Lanches", "Pizzas Tradicionais", "Pastéis Doces", "Bebidas", "Porções", "Combos").
2. Se uma categoria começa em uma página/imagem e continua na seguinte, agrupe todos os itens na mesma categoria.
3. Para cada produto, extraia:
   - "name": Nome claro do produto (ex: "X-Salada Especial").
   - "description": Ingredientes, acompanhamentos ou detalhes (se houver).
   - "price": Preço numérico em Reais (ex: 28.50). Se houver vários tamanhos, use o preço base/inicial.
4. Não invente produtos nem adicione informações não presentes no cardápio.
5. Retorne a lista de categorias em formato JSON padronizado.`;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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
                            description: "Descrição ou ingredientes",
                          },
                          price: {
                            type: Type.NUMBER,
                            description: "Preço em formato numérico (ex: 25.00)",
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

          const responseText = response.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed)) {
              allExtractedData.push(...parsed);
            }
          }
        } catch (batchErr: any) {
          console.error(`Error processing batch starting at index ${i}:`, batchErr);
          currentBatch.forEach(b => failedFiles.push(b.originalname));
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
