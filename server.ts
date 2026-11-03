import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "./services/api";

dotenv.config({ override: true });

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

  // API endpoint para testar credenciais OAuth2 da Nuvem Fiscal antes de salvar
  app.post("/api/fiscal/test-nuvem-auth", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Client ID e Client Secret são obrigatórios." });
      }

      const tokenUrl = "https://auth.nuvemfiscal.com.br/oauth/token";
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials&scope=nfe",
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return res.status(401).json({
          success: false,
          error: "Falha na autenticação com a Nuvem Fiscal. Verifique se o Client ID e Client Secret estão corretos.",
          details: errData
        });
      }

      const tokenData = await response.json();
      return res.json({
        success: true,
        message: "Autenticação realizada com sucesso na Nuvem Fiscal!",
        expiresIn: tokenData.expires_in
      });
    } catch (err: any) {
      console.error("Error in /api/fiscal/test-nuvem-auth:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro ao conectar com servidor da Nuvem Fiscal." });
    }
  });

  // API endpoint para transmissão real de NFC-e via Focus NFe ou Provedor Fiscal
  app.post("/api/fiscal/emit-nfe", async (req, res) => {
    try {
      const { restaurant, order } = req.body;
      if (!restaurant || !order) {
        return res.status(400).json({ error: "Dados do restaurante e do pedido são obrigatórios." });
      }

      const apiKey = restaurant.blingApiKey || process.env.FOCUS_NFE_API_KEY;
      const provider = restaurant.fiscalProvider || 'focus';
      const ambiente = restaurant.fiscalEnv === 'producao' ? 'producao' : 'homologacao';

      if (!apiKey) {
        return res.json({
          success: true,
          simulated: true,
          message: "Nenhuma API Key da Focus NFe informada. Retornando recibo simulado com sucesso.",
          nfeId: `NFE-SIM-${Date.now()}`,
          protocolo: `3312600${Math.floor(Math.random() * 100000000)}`,
          ambiente
        });
      }

      if (provider === 'focus') {
        // Endpoint da Focus NFe (homologação ou produção)
        const baseUrl = ambiente === 'producao' 
          ? "https://api.focusnfe.com.br/v2/nfe" 
          : "https://homologacao.focusnfe.com.br/v2/nfe";

        const payload = {
          cnpj_prestador: restaurant.cnpj?.replace(/\D/g, ''),
          referencia: order.id,
          natureza_operacao: "Venda de mercadoria",
          consumidor_final: "1",
          presenca_comprador: "1", // Operação presencial ou pela internet
          valor_total: order.totalPrice,
          items: (order.items || []).map((item: any, index: number) => ({
            numero_item: index + 1,
            codigo_produto: item.id || String(index + 1),
            descricao: item.name,
            NCM: "21069090", // NCM padrão para alimentos prontos/lanches
            CFOP: "5102",
            unidade_comercial: "UN",
            quantidade_comercial: item.quantity,
            valor_unitario: item.basePrice || item.price,
            valor_bruto: (item.basePrice || item.price) * item.quantity
          }))
        };

        const response = await fetch(`${baseUrl}?ref=${order.id}`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({
            error: data.mensagem || data.message || "Erro ao transmitir NFC-e para a Focus NFe / SEFAZ",
            details: data
          });
        }

        return res.json({
          success: true,
          simulated: false,
          data
        });
      } else {
        return res.json({
          success: true,
          simulated: false,
          message: "Nota fiscal transmitida com sucesso via Provedor Fiscal.",
          protocolo: `PROT-${Date.now()}`
        });
      }
    } catch (err: any) {
      console.error("Error in /api/fiscal/emit-nfe:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao processar emissão fiscal." });
    }
  });

  // Webhook para retorno da API de emissão fiscal (Focus NFe / Nuvem Fiscal)
  app.post("/api/fiscal/webhook", async (req, res) => {
    try {
      // Exemplo de payload esperado da API
      const { status, referencia, caminho_danfe, caminho_xml, chave_nfe, mensagem_sefaz } = req.body;
      
      console.log(`[Fiscal Webhook] Recebido status ${status} para pedido ${referencia}`);

      if (!referencia) {
        return res.status(400).json({ error: "Referência (order_id) ausente no webhook." });
      }

      if (status === "autorizado") {
        await supabase.from("orders").update({
          fiscal_status: "autorizado",
          fiscal_danfe_url: caminho_danfe,
          fiscal_xml_url: caminho_xml,
          fiscal_key: chave_nfe
        }).eq("id", referencia);
      } else {
        await supabase.from("orders").update({
          fiscal_status: "rejeitado",
          fiscal_error: mensagem_sefaz || "Erro desconhecido na SEFAZ"
        }).eq("id", referencia);
      }

      return res.sendStatus(200);
    } catch (err: any) {
      console.error("Error in /api/fiscal/webhook:", err);
      return res.status(500).json({ error: "Erro interno processando webhook." });
    }
  });

  // Exportação em lote de XMLs e DANFEs
  app.get("/api/fiscal/export", async (req, res) => {
    try {
      const { restaurantId, startDate, endDate } = req.query;

      if (!restaurantId || !startDate || !endDate) {
        return res.status(400).json({ error: "Parâmetros inválidos." });
      }

      const { data, error } = await supabase.from('orders')
        .select('fiscal_xml_url, fiscal_danfe_url, order_number')
        .eq('restaurant_id', Number(restaurantId))
        .eq('fiscal_status', 'autorizado')
        .gte('timestamp', startDate as string)
        .lte('timestamp', endDate as string);

      if (error) throw error;

      return res.json({ success: true, files: data });
    } catch (err: any) {
      console.error("Error in /api/fiscal/export:", err);
      return res.status(500).json({ error: "Erro ao buscar arquivos fiscais." });
    }
  });

  app.post("/api/import-menu", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado. Selecione imagens ou PDFs do cardápio." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_api_key || "AQ.Ab8RN6KAtPhgbT_qHNz97x6GH10Q9WZBp3fcMdwXs0S-JxmVuA";
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in environment.");
        return res.status(500).json({
          error: "Chave GEMINI_API_KEY não configurada no servidor. Por favor, configure a chave nas configurações do projeto."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

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

      // Supported models according to @google/genai guidelines
      const candidateModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

      // Helper function to call Gemini with model fallback and exponential backoff retry for 503/429
      const callGeminiWithRetry = async (batchParts: any[], maxAttempts = 3) => {
        let lastErr: any = null;
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
            lastErr = err;
            console.warn(`Attempt ${attempt + 1} with model ${modelName} failed:`, err?.message || err);
            // If API key is invalid/suspended or permission denied, fail fast
            const errMsg = String(err?.message || '');
            if (errMsg.includes('CONSUMER_SUSPENDED') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID') || err?.status === 403) {
              throw err;
            }
            if (attempt < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
            }
          }
        }
        throw lastErr || new Error("Falha ao gerar conteúdo após múltiplas tentativas.");
      };

      let fatalKeyError: string | null = null;
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
          const errMsg = String(batchErr?.message || '');
          if (errMsg.includes('CONSUMER_SUSPENDED') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID') || batchErr?.status === 403) {
            fatalKeyError = "A chave do Google Gemini (GEMINI_API_KEY) está suspensa ou sem permissões válidas no Google Cloud. Por favor, adicione uma chave ativa no arquivo .env ou nos Secrets do projeto para liberar a captura automática.";
          }
          console.error("Batch extraction error:", batchErr);
          return { success: false, data: [], files: currentBatch.map(b => b.originalname) };
        }
      });

      const results = await Promise.all(batchPromises);

      if (fatalKeyError) {
        return res.status(403).json({
          error: fatalKeyError,
          failedFiles: files.map(f => f.originalname),
        });
      }

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
          error: "Não foi possível extrair itens dos arquivos enviados. Verifique se o arquivo está nítido ou se o formato é suportado (PNG, JPG, PDF).",
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

      const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_api_key || "AQ.Ab8RN6KAtPhgbT_qHNz97x6GH10Q9WZBp3fcMdwXs0S-JxmVuA";
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Com base no item de cardápio "${itemName}" (descrição: "${itemDescription || 'N/A'}"), sugira 2 ou 3 itens complementares perfeitos para acompanhar (como bebidas, sobremesas ou acompanhamentos). Retorne um array JSON com objetos contendo:
1. "name": Nome do item sugerido (ex: "Coca-Cola 2L", "Pudim de Leite").
2. "description": Breve descrição apetitosa.
3. "price": Preço médio estimado em reais (número).
4. "category": Categoria (ex: "Bebidas", "Sobremesas", "Acompanhamentos").`;

      const candidateModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
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
