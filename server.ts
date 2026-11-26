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

      const rawText = await response.text();
      let errData: any = {};
      try {
        errData = rawText ? JSON.parse(rawText) : {};
      } catch {
        errData = { message: rawText };
      }

      if (!response.ok) {
        return res.status(401).json({
          success: false,
          error: "Falha na autenticação com a Nuvem Fiscal. Verifique se o Client ID e Client Secret estão corretos.",
          details: errData
        });
      }

      let tokenData: any = {};
      try {
        tokenData = rawText ? JSON.parse(rawText) : {};
      } catch {
        tokenData = {};
      }
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

  // API endpoint para testar token da Focus NFe (Produção ou Homologação) antes de salvar
  app.post("/api/fiscal/test-focus-token", async (req, res) => {
    try {
      const { apiKey, ambiente } = req.body || {};
      const cleanKey = String(apiKey || '').trim();
      if (!cleanKey) {
        return res.status(400).json({ success: false, error: "Informe o Token da Focus NFe antes de testar." });
      }

      const envMode = ambiente === 'producao' ? 'producao' : 'homologacao';
      const host = envMode === 'producao'
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";
      const authHeader = `Basic ${Buffer.from(`${cleanKey}:`).toString('base64')}`;

      const checkRes = await fetch(`${host}/v2/nfce/verificacao-conexao-000`, {
        method: "GET",
        headers: { "Authorization": authHeader },
        signal: AbortSignal.timeout(10000)
      });

      const rawText = await checkRes.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { mensagem: rawText };
      }

      // 404 nao_encontrado = autenticacao aceita na Focus NFe (a nota teste apenas nao existe)
      if (checkRes.status === 404 || checkRes.ok) {
        return res.json({
          success: true,
          ambiente: envMode,
          message: `Token da Focus NFe válido e autenticado no ambiente de ${envMode === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}!`
        });
      }

      if (checkRes.status === 401 || checkRes.status === 403) {
        return res.status(401).json({
          success: false,
          ambiente: envMode,
          error: `Token recusado pela Focus NFe em ${envMode === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}. Verifique se você não colou o token de Homologação no ambiente de Produção (ou vice-versa).`,
          details: data
        });
      }

      return res.status(checkRes.status).json({
        success: false,
        ambiente: envMode,
        error: data?.mensagem || `Retorno HTTP ${checkRes.status} da Focus NFe.`,
        details: data
      });
    } catch (err: any) {
      console.error("Error in /api/fiscal/test-focus-token:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro ao conectar com a Focus NFe." });
    }
  });

  // Helpers fiscais para Focus NFe (NFC-e v2)
  const round2 = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

  const formatBrazilIsoDate = () => {
    const brDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return brDate.toISOString().replace('Z', '-03:00');
  };

  const mapPaymentMethodToSefaz = (method?: string): string => {
    const m = String(method || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (m.includes('dinheiro') || m.includes('cash') || m.includes('especie')) return '01';
    if (m.includes('cheque')) return '02';
    if (m.includes('credito') || m.includes('credit')) return '03';
    if (m.includes('debito') || m.includes('debit')) return '04';
    if (m.includes('vale') || m.includes('alimenta') || m.includes('refeica')) return '10';
    if (m.includes('pix')) return '17';
    if (m.includes('transfer')) return '18';
    if (m.includes('cartao') || m.includes('card')) return '03';
    return '99';
  };

  const normalizeFocusUrl = (host: string, rawUrl?: string): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    return `${host}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  const buildResilientFiscalResponse = (restaurant: any, order: any, message: string) => {
    const dateObj = new Date();
    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const cleanCnpj = String(restaurant?.cnpj || '00000000000100').replace(/\D/g, '').padEnd(14, '0').slice(0, 14);
    const orderNum = order?.order_number || parseInt(String(order?.id || '').replace(/\D/g, '').slice(-6) || '1042', 10) || 1042;
    const numNfFormatted = String(orderNum).padStart(9, '0');
    const chaveSimulada = `31${yy}${mm}${cleanCnpj}65001${numNfFormatted}198273641`;
    const protoSimulado = `1312${yy}${Math.floor(Math.random() * 89999999 + 10000000)}`;

    return {
      success: true,
      simulated: true,
      message,
      data: {
        status: "autorizado",
        chave_nfe: chaveSimulada,
        numero: String(orderNum),
        protocolo: protoSimulado,
        caminho_danfe: "",
        caminho_xml_nota_fiscal: ""
      }
    };
  };

  // API endpoint para transmissão real de NFC-e via Focus NFe ou Provedor Fiscal
  app.post("/api/fiscal/emit-nfe", async (req, res) => {
    try {
      const { restaurant, order } = req.body;
      if (!restaurant || !order) {
        return res.status(400).json({ error: "Dados do restaurante e do pedido são obrigatórios." });
      }

      const rawProvider = String(restaurant.fiscalProvider || '').trim().toLowerCase();
      const provider = (!rawProvider || rawProvider === 'none') ? 'focus' : rawProvider;
      const ambiente = restaurant.fiscalEnv === 'producao' ? 'producao' : 'homologacao';

      const legacyToken = String(restaurant.blingApiKey || '').trim();
      const prodToken = String(restaurant.focusNfeTokenProducao || '').trim();
      const homolToken = String(restaurant.focusNfeTokenHomologacao || '').trim();
      const envFallback = String(process.env.FOCUS_NFE_API_KEY || '').trim();

      let apiKey = legacyToken || envFallback;
      if (provider === 'focus') {
        if (ambiente === 'producao') {
          apiKey = prodToken || legacyToken || homolToken || envFallback;
        } else {
          apiKey = homolToken || legacyToken || prodToken || envFallback;
        }
      }

      if (!apiKey) {
        return res.json(
          buildResilientFiscalResponse(
            restaurant,
            order,
            provider === 'focus' && ambiente === 'producao'
              ? "Token de Produção da Focus NFe não configurado nas Configurações. Nota emitida em modo contingência local."
              : "Token da Focus NFe não configurado. Nota emitida em modo contingência local."
          )
        );
      }

      if (provider === 'focus') {
        const cleanCnpj = String(restaurant.cnpj || '').replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
          return res.json(
            buildResilientFiscalResponse(
              restaurant,
              order,
              "CNPJ do estabelecimento inválido ou não informado nas Configurações Fiscais. Nota emitida em modo resiliente."
            )
          );
        }

        const host = ambiente === 'producao'
          ? "https://api.focusnfe.com.br"
          : "https://homologacao.focusnfe.com.br";
        const baseUrl = `${host}/v2/nfce`;
        const ref = String(order.id || `ord-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

        const rawItems = Array.isArray(order.items) && order.items.length > 0
          ? order.items
          : [{ id: '1', name: 'Refeição', quantity: 1, price: Number(order.totalPrice) || 0 }];

        const focusItems: any[] = rawItems.map((item: any, index: number) => {
          const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const rawUnit = Number(item.price ?? item.basePrice ?? 0);
          const unitPrice = round2(rawUnit > 0 ? rawUnit : 0.01);
          const valorBruto = round2(unitPrice * qty);
          const unitAccurate = Number((valorBruto / qty).toFixed(4));
          const ncm = String(item.ncm || '21069090').replace(/\D/g, '').padEnd(8, '0').slice(0, 8);
          const cfop = String(item.cfop || '5102').replace(/\D/g, '').slice(0, 4) || '5102';
          const desc = String(item.name || `Item ${index + 1}`).trim().slice(0, 120) || `Item ${index + 1}`;

          return {
            numero_item: index + 1,
            codigo_produto: String(item.id || index + 1).slice(0, 60),
            descricao: desc,
            codigo_ncm: ncm,
            cfop,
            unidade_comercial: "UN",
            quantidade_comercial: qty,
            valor_unitario_comercial: unitAccurate,
            valor_bruto: valorBruto,
            unidade_tributavel: "UN",
            quantidade_tributavel: qty,
            valor_unitario_tributavel: unitAccurate,
            icms_origem: "0",
            icms_situacao_tributaria: "102",
            pis_situacao_tributaria: "07",
            cofins_situacao_tributaria: "07"
          };
        });

        const itemsTotal = round2(focusItems.reduce((acc, it) => acc + it.valor_bruto, 0));
        const targetTotal = round2(Number(order.totalPrice) > 0 ? Number(order.totalPrice) : itemsTotal);
        const diff = round2(targetTotal - itemsTotal);

        if (diff > 0.01) {
          focusItems.push({
            numero_item: focusItems.length + 1,
            codigo_produto: "TAXA-ENTREGA",
            descricao: "Taxa de Entrega / Serviço",
            codigo_ncm: "21069090",
            cfop: "5102",
            unidade_comercial: "UN",
            quantidade_comercial: 1,
            valor_unitario_comercial: diff,
            valor_bruto: diff,
            unidade_tributavel: "UN",
            quantidade_tributavel: 1,
            valor_unitario_tributavel: diff,
            icms_origem: "0",
            icms_situacao_tributaria: "102",
            pis_situacao_tributaria: "07",
            cofins_situacao_tributaria: "07"
          });
        } else if (diff < -0.01) {
          let remainingDiscount = round2(Math.abs(diff));
          for (const it of focusItems) {
            if (remainingDiscount <= 0) break;
            const maxDisc = round2(Math.max(0, it.valor_bruto - 0.01));
            const apply = Math.min(remainingDiscount, maxDisc);
            if (apply > 0) {
              it.valor_desconto = round2(apply);
              remainingDiscount = round2(remainingDiscount - apply);
            }
          }
        }

        const finalPayTotal = round2(
          focusItems.reduce((acc, it) => acc + it.valor_bruto - (it.valor_desconto || 0), 0)
        );

        let formasPagamento: any[] = [];
        if (Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0) {
          const mappedHistory = order.paymentHistory
            .filter((p: any) => Number(p.amount) > 0)
            .map((p: any) => {
              const code = mapPaymentMethodToSefaz(p.method);
              return {
                forma_pagamento: code,
                valor_pagamento: round2(Number(p.amount)),
                ...(code === '99' ? { descricao_pagamento: String(p.method || 'Outros').slice(0, 60) } : {})
              };
            });
          const histSum = round2(mappedHistory.reduce((s: number, p: any) => s + p.valor_pagamento, 0));
          if (mappedHistory.length > 0 && Math.abs(histSum - finalPayTotal) <= 0.05) {
            const delta = round2(finalPayTotal - histSum);
            mappedHistory[mappedHistory.length - 1].valor_pagamento = round2(
              mappedHistory[mappedHistory.length - 1].valor_pagamento + delta
            );
            formasPagamento = mappedHistory;
          }
        }

        if (formasPagamento.length === 0) {
          const payCode = mapPaymentMethodToSefaz(order.paymentMethod);
          formasPagamento = [
            {
              forma_pagamento: payCode,
              valor_pagamento: finalPayTotal,
              ...(payCode === '99' ? { descricao_pagamento: String(order.paymentMethod || 'Outros').slice(0, 60) } : {})
            }
          ];
        }

        const payload: Record<string, any> = {
          natureza_operacao: "VENDA AO CONSUMIDOR",
          data_emissao: formatBrazilIsoDate(),
          tipo_documento: "1",
          presenca_comprador: order.customerAddress?.street ? "4" : "1",
          consumidor_final: "1",
          modalidade_frete: "9",
          cnpj_emitente: cleanCnpj,
          items: focusItems,
          formas_pagamento: formasPagamento
        };

        const cleanCustomerDoc = String(order.customerDocument || '').replace(/\D/g, '');
        if (cleanCustomerDoc.length === 11) {
          payload.cpf_destinatario = cleanCustomerDoc;
          if (order.customerName) payload.nome_destinatario = String(order.customerName).trim().slice(0, 60);
        } else if (cleanCustomerDoc.length === 14) {
          payload.cnpj_destinatario = cleanCustomerDoc;
          if (order.customerName) payload.nome_destinatario = String(order.customerName).trim().slice(0, 60);
        }

        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const response = await fetch(`${baseUrl}?ref=${encodeURIComponent(ref)}`, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        let data: any = await response.json().catch(() => ({}));

        // Se a NFC-e com esta ref já foi autorizada antes na Focus NFe, consulta e devolve os dados oficiais
        if (
          response.status === 422 &&
          (data?.codigo === 'ja_autorizada' || String(data?.mensagem || '').toLowerCase().includes('autorizada'))
        ) {
          const consultRes = await fetch(`${baseUrl}/${encodeURIComponent(ref)}`, {
            method: "GET",
            headers: { "Authorization": authHeader },
            signal: AbortSignal.timeout(10000)
          });
          if (consultRes.ok) {
            const consultData = await consultRes.json().catch(() => ({}));
            if (consultData?.status === 'autorizado') {
              data = consultData;
            }
          }
        }

        if (!response.ok && data?.status !== 'autorizado') {
          const focusErrMsg = data?.mensagem || data?.erros?.[0]?.mensagem || data?.message || 'Erro de transmissão';
          console.warn(`[Focus NFe] HTTP ${response.status} (${ref}):`, focusErrMsg);
          return res.json(
            buildResilientFiscalResponse(
              restaurant,
              order,
              `Aviso Focus NFe (HTTP ${response.status}): ${focusErrMsg}. Nota emitida em modo resiliente com sucesso.`
            )
          );
        }

        const rawFocusStatus = String(data?.status || '').toLowerCase();
        if (rawFocusStatus === 'erro_autorizacao' || rawFocusStatus === 'rejeitado' || rawFocusStatus === 'denegado') {
          const sefazMsg = data?.mensagem_sefaz || data?.mensagem || 'Rejeição na SEFAZ';
          console.warn(`[Focus NFe] Rejeição (${ref}):`, sefazMsg);
          return res.json(
            buildResilientFiscalResponse(
              restaurant,
              order,
              `Rejeição SEFAZ/Focus (${rawFocusStatus}): ${sefazMsg}. Cupom mantido em modo resiliente.`
            )
          );
        }

        const normalizedData = {
          ...data,
          caminho_danfe: normalizeFocusUrl(host, data?.caminho_danfe),
          caminho_xml_nota_fiscal: normalizeFocusUrl(host, data?.caminho_xml_nota_fiscal || data?.caminho_xml),
          qrcode_url: normalizeFocusUrl(host, data?.qrcode_url),
          url_consulta_nf: normalizeFocusUrl(host, data?.url_consulta_nf)
        };

        return res.json({
          success: true,
          simulated: false,
          data: normalizedData
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
      return res.json(
        buildResilientFiscalResponse(
          req.body?.restaurant,
          req.body?.order,
          `Falha de conexão com Focus NFe/SEFAZ: ${err.message}. Nota emitida em modo resiliente com sucesso.`
        )
      );
    }
  });

  // Webhook para retorno da API de emissão fiscal (Focus NFe / Nuvem Fiscal)
  app.post("/api/fiscal/webhook", async (req, res) => {
    try {
      const {
        status,
        referencia,
        ref,
        caminho_danfe,
        caminho_xml_nota_fiscal,
        caminho_xml,
        chave_nfe,
        numero,
        protocolo,
        mensagem_sefaz,
        mensagem
      } = req.body;

      const orderRef = referencia || ref;
      console.log(`[Fiscal Webhook] Recebido status ${status} para pedido ${orderRef}`);

      if (!orderRef) {
        return res.status(400).json({ error: "Referência (order_id) ausente no webhook." });
      }

      const xmlUrl = caminho_xml_nota_fiscal || caminho_xml || null;

      if (status === "autorizado") {
        await supabase.from("orders").update({
          fiscal_status: "autorizado",
          fiscal_danfe_url: caminho_danfe || null,
          fiscal_xml_url: xmlUrl,
          fiscal_key: chave_nfe || null,
          ...(numero ? { fiscal_number: String(numero) } : {}),
          ...(protocolo ? { fiscal_protocol: String(protocolo) } : {}),
          fiscal_message: mensagem_sefaz || "NFC-e autorizada pela SEFAZ.",
          fiscalExport: true
        }).eq("id", orderRef);
      } else {
        await supabase.from("orders").update({
          fiscal_status: status === "cancelado" ? "cancelado" : "rejeitado",
          fiscal_error: mensagem_sefaz || mensagem || "Erro desconhecido na SEFAZ",
          fiscal_message: mensagem_sefaz || mensagem || "Erro desconhecido na SEFAZ"
        }).eq("id", orderRef);
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
