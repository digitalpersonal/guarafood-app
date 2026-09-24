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

  // ==========================================
  // WhatsApp & Typebot Evolution API Integration
  // ==========================================
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://app.api.guarafood.com.br";
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "token_secreto_guara_2026";
  const TYPEBOT_URL = process.env.TYPEBOT_URL || "https://typebot.co";
  const TYPEBOT_NAME = process.env.TYPEBOT_NAME || "guarafood";

  // Obter status da instância do restaurante
  app.get("/api/whatsapp/status/:restaurantId", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
        return res.status(400).json({ connected: false, state: "disconnected", error: "ID do restaurante inválido" });
      }
      const instanceName = `restaurante_${restaurantId}`;

      const checkRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVOLUTION_API_KEY },
        signal: AbortSignal.timeout(6000)
      });

      if (!checkRes.ok) {
        return res.json({ connected: false, state: "disconnected", instanceName });
      }

      const checkData = await checkRes.json();
      const state = checkData?.instance?.state || "disconnected";
      const isConnected = state === "open";

      // Se conectado, busca dados do perfil
      let profile = null;
      if (isConnected) {
        try {
          const instRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
            headers: { apikey: EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(6000)
          });
          if (instRes.ok) {
            const instList = await instRes.json();
            const found = Array.isArray(instList) ? instList.find((i: any) => i.name === instanceName) : null;
            if (found) {
              profile = {
                profileName: found.profileName || "",
                profilePicUrl: found.profilePicUrl || "",
                ownerJid: found.ownerJid || ""
              };
            }
          }
        } catch (_) {}
      }

      return res.json({
        connected: isConnected,
        state,
        instanceName,
        profile
      });
    } catch (err: any) {
      console.error("Error in /api/whatsapp/status:", err);
      return res.json({ connected: false, state: "disconnected", error: err.message });
    }
  });

  // Conectar / Gerar QR Code para o restaurante
  app.post("/api/whatsapp/connect/:restaurantId", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
        return res.status(400).json({ error: "ID de restaurante inválido ou não autenticado" });
      }
      const instanceName = `restaurante_${restaurantId}`;

      // 1. Verifica se a instância já existe
      const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY },
        signal: AbortSignal.timeout(8000)
      });
      const instances = fetchRes.ok ? await fetchRes.json() : [];
      const existing = Array.isArray(instances) ? instances.find((i: any) => i.name === instanceName) : null;

      let qrCodeBase64: string | null = null;
      let pairingCode: string | null = null;
      let state = "connecting";

      if (!existing) {
        // Cria nova instância com QR Code habilitado
        const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          }),
          signal: AbortSignal.timeout(12000)
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          console.error("Error creating Evolution instance:", errData);
          return res.status(400).json({ error: "Falha ao criar instância no WhatsApp", details: errData });
        }

        const createData = await createRes.json();
        qrCodeBase64 = createData?.qrcode?.base64 || createData?.base64 || null;
        pairingCode = createData?.qrcode?.pairingCode || createData?.pairingCode || null;
      } else {
        // Se já existe e está conectada
        if (existing.connectionStatus === "open") {
          return res.json({
            connected: true,
            state: "open",
            instanceName,
            profile: {
              profileName: existing.profileName,
              profilePicUrl: existing.profilePicUrl,
              ownerJid: existing.ownerJid
            }
          });
        }

        // Se existe mas precisa de reconexão / novo QR Code
        const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          headers: { apikey: EVOLUTION_API_KEY },
          signal: AbortSignal.timeout(10000)
        });
        if (connectRes.ok) {
          const connData = await connectRes.json();
          qrCodeBase64 = connData?.base64 || connData?.qrcode?.base64 || null;
          pairingCode = connData?.pairingCode || connData?.qrcode?.pairingCode || null;
          state = connData?.instance?.state || "connecting";
          if (state === "open") {
            return res.json({ connected: true, state: "open", instanceName });
          }
        }

        // Se não veio QR Code na tentativa de connect simples, dispara restart para gerar
        if (!qrCodeBase64) {
          try {
            const restartRes = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
              method: "POST",
              headers: { apikey: EVOLUTION_API_KEY },
              signal: AbortSignal.timeout(10000)
            });
            if (restartRes.ok) {
              const restData = await restartRes.json();
              qrCodeBase64 = restData?.base64 || restData?.qrcode?.base64 || null;
              pairingCode = restData?.pairingCode || restData?.qrcode?.pairingCode || null;
            }
          } catch (_) {}
        }
      }

      // 2. Configura Typebot em background (sem travar a resposta do QR Code)
      setTimeout(async () => {
        try {
          await fetch(`${EVOLUTION_API_URL}/typebot/create/${instanceName}`, {
            method: "POST",
            headers: {
              apikey: EVOLUTION_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url: TYPEBOT_URL,
              typebot: TYPEBOT_NAME,
              enabled: true,
              triggerType: "all",
              expire: 20,
              keywordFinish: "atendente",
              delayMessage: 1000,
              unknownMessage: "",
              listeningFromMe: false
            })
          });
        } catch (_) {}
      }, 500);

      return res.json({
        connected: false,
        state,
        instanceName,
        qrcode: qrCodeBase64,
        pairingCode
      });
    } catch (err: any) {
      console.error("Error in /api/whatsapp/connect:", err);
      return res.status(500).json({ error: err.message || "Erro ao conectar com servidor WhatsApp." });
    }
  });

  // Reiniciar instância do WhatsApp para forçar novo QR Code
  app.post("/api/whatsapp/restart/:restaurantId", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
        return res.status(400).json({ error: "ID de restaurante inválido" });
      }
      const instanceName = `restaurante_${restaurantId}`;

      const restartRes = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY },
        signal: AbortSignal.timeout(10000)
      });

      if (restartRes.ok) {
        const restData = await restartRes.json();
        return res.json({
          connected: false,
          state: "connecting",
          instanceName,
          qrcode: restData?.base64 || restData?.qrcode?.base64 || null,
          pairingCode: restData?.pairingCode || restData?.qrcode?.pairingCode || null
        });
      }

      return res.status(400).json({ error: "Não foi possível reiniciar a instância." });
    } catch (err: any) {
      console.error("Error in /api/whatsapp/restart:", err);
      return res.status(500).json({ error: err.message || "Erro ao reiniciar instância." });
    }
  });

  // Desconectar instância do restaurante
  app.post("/api/whatsapp/disconnect/:restaurantId", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
        return res.status(400).json({ error: "ID de restaurante inválido" });
      }
      const instanceName = `restaurante_${restaurantId}`;

      await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
        signal: AbortSignal.timeout(8000)
      });

      return res.json({ success: true, instanceName });
    } catch (err: any) {
      console.error("Error in /api/whatsapp/disconnect:", err);
      return res.status(500).json({ error: err.message || "Erro ao desconectar WhatsApp." });
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
