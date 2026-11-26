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

  // Helpers fiscais para Focus NFe (NFC-e v2)
  const round2 = (val: number) => Math.round((Number(val) || 0) * 100) / 100;

  const formatBrazilIsoDate = () => {
    try {
      const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(new Date());
      const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
      return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-03:00`;
    } catch {
      const brDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
      return `${brDate.toISOString().slice(0, 19)}-03:00`;
    }
  };

  const isValidCpfDigits = (digits: string): boolean => {
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;
    if (rev !== parseInt(digits[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;
    return rev === parseInt(digits[10], 10);
  };

  const isValidCnpjDigits = (digits: string): boolean => {
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
    const calc = (len: number) => {
      let sum = 0;
      let pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += parseInt(digits[len - i], 10) * pos--;
        if (pos < 2) pos = 9;
      }
      const res = sum % 11;
      return res < 2 ? 0 : 11 - res;
    };
    return calc(12) === parseInt(digits[12], 10) && calc(13) === parseInt(digits[13], 10);
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

  const extractFocusErrorMessage = (data: any, fallback: string): string => {
    const parts: string[] = [];
    if (data?.mensagem_sefaz) parts.push(String(data.mensagem_sefaz));
    if (data?.status_sefaz) parts.push(`SEFAZ ${data.status_sefaz}`);
    if (data?.mensagem && data.mensagem !== data?.mensagem_sefaz) parts.push(String(data.mensagem));
    if (Array.isArray(data?.erros) && data.erros.length > 0) {
      const errMsgs = data.erros
        .map((e: any) => (e?.campo ? `${e.campo}: ${e.mensagem || ''}` : e?.mensagem || ''))
        .filter(Boolean)
        .join(' | ');
      if (errMsgs) parts.push(errMsgs);
    }
    if (data?.message && parts.length === 0) parts.push(String(data.message));
    return parts.join(' — ') || fallback;
  };

  const resolveFocusRestaurantCredentials = async (rawRestaurant: any, explicitRestaurantId?: number) => {
    const restId = Number(explicitRestaurantId || rawRestaurant?.id || 0);
    let dbRest: any = null;
    if (restId > 0) {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, cnpj, ie, im, address, phone, enable_fiscal, fiscal_env, fiscal_csc, fiscal_csc_id, focus_nfe_token_producao, focus_nfe_token_homologacao, bling_api_key')
        .eq('id', restId)
        .maybeSingle();
      dbRest = data || null;
    }

    const ambiente: 'producao' | 'homologacao' =
      (dbRest?.fiscal_env || rawRestaurant?.fiscalEnv) === 'producao' ? 'producao' : 'homologacao';

    const prodToken = String(
      dbRest?.focus_nfe_token_producao || rawRestaurant?.focusNfeTokenProducao || ''
    ).trim();
    const homolToken = String(
      dbRest?.focus_nfe_token_homologacao ||
      rawRestaurant?.focusNfeTokenHomologacao ||
      dbRest?.bling_api_key ||
      ''
    ).trim();
    const envFallback = String(process.env.FOCUS_NFE_API_KEY || '').trim();

    const apiKey = ambiente === 'producao'
      ? (prodToken || envFallback)
      : (homolToken || envFallback);

    const cnpj = String(dbRest?.cnpj || rawRestaurant?.cnpj || '').replace(/\D/g, '');
    const ie = String(dbRest?.ie || rawRestaurant?.ie || '').trim();
    const host = ambiente === 'producao'
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

    return {
      restaurantId: restId,
      ambiente,
      host,
      apiKey,
      cnpj,
      ie,
      name: String(dbRest?.name || rawRestaurant?.name || ''),
    };
  };

  const syncOrderFiscalToSupabase = async (
    orderId: string,
    host: string,
    focusData: any,
    fallbackMessage?: string
  ) => {
    if (!orderId) return;
    const rawStatus = String(focusData?.status || '').toLowerCase();
    let mappedStatus: 'autorizado' | 'processando' | 'erro_autorizacao' | 'rejeitado' | 'cancelado' = 'processando';
    if (rawStatus === 'autorizado') mappedStatus = 'autorizado';
    else if (rawStatus === 'cancelado') mappedStatus = 'cancelado';
    else if (rawStatus === 'erro_autorizacao' || rawStatus === 'rejeitado' || rawStatus === 'denegado') {
      mappedStatus = rawStatus === 'rejeitado' ? 'rejeitado' : 'erro_autorizacao';
    } else if (rawStatus === 'processando_autorizacao' || rawStatus === 'processando') {
      mappedStatus = 'processando';
    }

    const danfeUrl = normalizeFocusUrl(host, focusData?.caminho_danfe) || null;
    const xmlUrl = normalizeFocusUrl(host, focusData?.caminho_xml_nota_fiscal || focusData?.caminho_xml) || null;
    const qrCodeUrl = normalizeFocusUrl(host, focusData?.qrcode_url) || null;
    const consultUrl = normalizeFocusUrl(host, focusData?.url_consulta_nf) || null;
    const message =
      focusData?.mensagem_sefaz ||
      focusData?.mensagem ||
      fallbackMessage ||
      (mappedStatus === 'autorizado' ? 'NFC-e autorizada pela SEFAZ via Focus NFe.' : 'Processando retorno SEFAZ.');

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('payment_details')
      .eq('id', orderId)
      .maybeSingle();

    const prevDetails =
      existingOrder?.payment_details && typeof existingOrder.payment_details === 'object'
        ? existingOrder.payment_details
        : {};

    const mergedDetails = {
      ...prevDetails,
      fiscal: {
        ...(prevDetails.fiscal || {}),
        status: mappedStatus,
        chave: focusData?.chave_nfe || prevDetails.fiscal?.chave || null,
        numero: focusData?.numero ? String(focusData.numero) : prevDetails.fiscal?.numero || null,
        serie: focusData?.serie ? String(focusData.serie) : prevDetails.fiscal?.serie || null,
        protocolo: focusData?.protocolo ? String(focusData.protocolo) : prevDetails.fiscal?.protocolo || null,
        danfe_url: danfeUrl || prevDetails.fiscal?.danfe_url || null,
        xml_url: xmlUrl || prevDetails.fiscal?.xml_url || null,
        qrcode_url: qrCodeUrl || prevDetails.fiscal?.qrcode_url || null,
        url_consulta_nf: consultUrl || prevDetails.fiscal?.url_consulta_nf || null,
        mensagem: message,
        simulated: false,
        updated_at: new Date().toISOString(),
      },
    };

    const updatePayload: Record<string, any> = {
      payment_details: mergedDetails,
      fiscal_status: mappedStatus,
      fiscal_message: message,
    };
    if (focusData?.chave_nfe) updatePayload.fiscal_key = focusData.chave_nfe;
    if (focusData?.numero) updatePayload.fiscal_number = String(focusData.numero);
    if (focusData?.protocolo) updatePayload.fiscal_protocol = String(focusData.protocolo);
    if (danfeUrl) updatePayload.fiscal_danfe_url = danfeUrl;
    if (xmlUrl) updatePayload.fiscal_xml_url = xmlUrl;
    if (mappedStatus === 'autorizado' || mappedStatus === 'processando') {
      updatePayload.fiscalExport = true;
    } else if (mappedStatus === 'erro_autorizacao' || mappedStatus === 'rejeitado') {
      updatePayload.fiscal_error = message;
    }

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (error) {
      await supabase.from('orders').update({ payment_details: mergedDetails }).eq('id', orderId);
    }
  };

  // API endpoint para testar token da Focus NFe (Produção ou Homologação) antes de salvar
  app.post("/api/fiscal/test-focus-token", async (req, res) => {
    try {
      const { apiKey, ambiente, cnpj } = req.body || {};
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

      // 404 nao_encontrado = autenticação aceita na Focus NFe (a nota teste apenas não existe)
      if (checkRes.status === 404 || checkRes.ok) {
        const cleanCnpj = String(cnpj || '').replace(/\D/g, '');
        let companyInfo: string | null = null;
        if (cleanCnpj.length === 14) {
          try {
            const empRes = await fetch(`${host}/v2/empresas/${cleanCnpj}`, {
              method: "GET",
              headers: { "Authorization": authHeader },
              signal: AbortSignal.timeout(8000)
            });
            if (empRes.ok) {
              const empData = await empRes.json().catch(() => null);
              if (empData) {
                const habilitaNfce = empData.habilita_nfce ? 'NFC-e habilitada' : 'NFC-e NÃO habilitada no painel Focus';
                const hasCert = empData.certificado_valido_ate ? `Certificado A1 válido até ${empData.certificado_valido_ate}` : 'Verifique Certificado A1 no painel Focus';
                companyInfo = `Empresa encontrada (${empData.nome || cleanCnpj}): ${habilitaNfce} • ${hasCert}.`;
              }
            }
          } catch {
            // Token de empresa específica pode não ter permissão em /v2/empresas; autenticação /v2/nfce já foi validada.
          }
        }

        return res.json({
          success: true,
          ambiente: envMode,
          message: `Token da Focus NFe válido e autenticado em ${envMode === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}!${companyInfo ? ` ${companyInfo}` : ''}`
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

  // API endpoint para transmissão real de NFC-e via Focus NFe (Emissor Único)
  app.post("/api/fiscal/emit-nfe", async (req, res) => {
    try {
      const { restaurant, order } = req.body;
      if (!restaurant || !order) {
        return res.status(400).json({ success: false, error: "Dados do restaurante e do pedido são obrigatórios." });
      }

      const creds = await resolveFocusRestaurantCredentials(restaurant, restaurant.id);
      const { ambiente, host, apiKey, cnpj: cleanCnpj } = creds;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: ambiente === 'producao'
            ? "Token de Produção da Focus NFe não configurado na Administração GuaraFood (Configuração Fiscal)."
            : "Token de Homologação da Focus NFe não configurado na Administração GuaraFood (Configuração Fiscal)."
        });
      }

      if (cleanCnpj.length !== 14 || !isValidCnpjDigits(cleanCnpj)) {
        return res.status(400).json({
          success: false,
          error: "CNPJ do estabelecimento inválido ou não informado na Configuração Fiscal do GuaraFood."
        });
      }

      const cleanCustomerDoc = String(order.customerDocument || '').replace(/\D/g, '');
      if (cleanCustomerDoc.length > 0) {
        if (cleanCustomerDoc.length === 11 && !isValidCpfDigits(cleanCustomerDoc)) {
          return res.status(400).json({
            success: false,
            error: "CPF do consumidor inválido. Corrija os dígitos ou envie sem CPF."
          });
        }
        if (cleanCustomerDoc.length === 14 && !isValidCnpjDigits(cleanCustomerDoc)) {
          return res.status(400).json({
            success: false,
            error: "CNPJ do consumidor inválido. Corrija os dígitos ou envie sem documento."
          });
        }
        if (cleanCustomerDoc.length !== 11 && cleanCustomerDoc.length !== 14) {
          return res.status(400).json({
            success: false,
            error: "Documento do consumidor deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)."
          });
        }
      }

      const baseUrl = `${host}/v2/nfce`;
      const ref = String(order.id || `ord-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

      const rawItems = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : [{ id: '1', name: 'Refeição', quantity: 1, price: Number(order.totalPrice) || 0.01 }];

      const focusItems: any[] = rawItems.map((item: any, index: number) => {
        const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const rawUnit = Number(item.price ?? item.basePrice ?? 0);
        const unitPrice = round2(rawUnit > 0 ? rawUnit : 0.01);
        const valorBruto = round2(unitPrice * qty);
        const unitAccurate = Number((valorBruto / qty).toFixed(6));
        const rawNcm = String(item.ncm || '21069090').replace(/\D/g, '');
        const ncm = rawNcm.length === 8 ? rawNcm : '21069090';
        const rawCfop = String(item.cfop || '5102').replace(/\D/g, '');
        const cfop = rawCfop.length === 4 ? rawCfop : '5102';
        const desc = String(item.name || `Item ${index + 1}`).trim().slice(0, 120) || `Item ${index + 1}`;
        const unitCode = item.isKiloItem && item.weight ? 'KG' : 'UN';

        return {
          numero_item: index + 1,
          codigo_produto: String(item.id || index + 1).slice(0, 60),
          descricao: desc,
          codigo_ncm: ncm,
          cfop,
          unidade_comercial: unitCode,
          quantidade_comercial: qty,
          valor_unitario_comercial: unitAccurate,
          valor_bruto: valorBruto,
          unidade_tributavel: unitCode,
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

      const buildPaymentEntry = (code: string, amount: number, rawLabel?: string) => {
        const entry: Record<string, any> = {
          forma_pagamento: code,
          valor_pagamento: round2(amount),
        };
        if (['03', '04', '10', '11', '17', '20'].includes(code)) {
          entry.tipo_integracao = "2";
        }
        if (code === '99') {
          entry.descricao_pagamento = String(rawLabel || 'Outros').slice(0, 60);
        }
        return entry;
      };

      let formasPagamento: any[] = [];
      if (Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0) {
        const mappedHistory = order.paymentHistory
          .filter((p: any) => Number(p.amount) > 0)
          .map((p: any) => buildPaymentEntry(mapPaymentMethodToSefaz(p.method), Number(p.amount), p.method));
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
        formasPagamento = [buildPaymentEntry(payCode, finalPayTotal, order.paymentMethod)];
      }

      const payload: Record<string, any> = {
        natureza_operacao: "VENDA AO CONSUMIDOR",
        data_emissao: formatBrazilIsoDate(),
        tipo_documento: "1",
        finalidade_emissao: "1",
        local_destino: "1",
        presenca_comprador: order.customerAddress?.street ? "4" : "1",
        consumidor_final: "1",
        modalidade_frete: "9",
        cnpj_emitente: cleanCnpj,
        items: focusItems,
        formas_pagamento: formasPagamento
      };

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
        signal: AbortSignal.timeout(20000)
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { mensagem: rawText };
      }

      // Se a NFC-e com esta ref já foi autorizada ou está em processamento na Focus NFe, consulta
      if (
        response.status === 422 &&
        (
          data?.codigo === 'ja_autorizada' ||
          data?.codigo === 'em_processamento' ||
          String(data?.mensagem || '').toLowerCase().includes('autorizada') ||
          String(data?.mensagem || '').toLowerCase().includes('processamento')
        )
      ) {
        const consultRes = await fetch(`${baseUrl}/${encodeURIComponent(ref)}`, {
          method: "GET",
          headers: { "Authorization": authHeader },
          signal: AbortSignal.timeout(10000)
        });
        if (consultRes.ok) {
          const consultData = await consultRes.json().catch(() => null);
          if (consultData) data = consultData;
        }
      }

      // Se Focus ainda estiver processando na SEFAZ, aguarda brevemente e consulta novamente (NFC-e costuma autorizar em 1-3s)
      let pollAttempt = 0;
      while (String(data?.status || '').toLowerCase() === 'processando_autorizacao' && pollAttempt < 3) {
        pollAttempt++;
        await new Promise(resolve => setTimeout(resolve, 1500));
        const pollRes = await fetch(`${baseUrl}/${encodeURIComponent(ref)}`, {
          method: "GET",
          headers: { "Authorization": authHeader },
          signal: AbortSignal.timeout(10000)
        });
        if (pollRes.ok) {
          const pollData = await pollRes.json().catch(() => null);
          if (pollData) data = pollData;
        } else {
          break;
        }
      }

      const rawFocusStatus = String(data?.status || '').toLowerCase();

      if (!response.ok && rawFocusStatus !== 'autorizado' && rawFocusStatus !== 'processando_autorizacao') {
        const focusErrMsg = extractFocusErrorMessage(data, `Erro HTTP ${response.status} na Focus NFe`);
        console.warn(`[Focus NFe] HTTP ${response.status} (${ref}):`, focusErrMsg);
        if (order.id) {
          await syncOrderFiscalToSupabase(order.id, host, { ...data, status: 'erro_autorizacao' }, focusErrMsg);
        }
        return res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
          success: false,
          error: focusErrMsg,
          data
        });
      }

      if (rawFocusStatus === 'erro_autorizacao' || rawFocusStatus === 'rejeitado' || rawFocusStatus === 'denegado') {
        const sefazMsg = extractFocusErrorMessage(data, 'Rejeição na SEFAZ');
        console.warn(`[Focus NFe] Rejeição (${ref}):`, sefazMsg);
        if (order.id) {
          await syncOrderFiscalToSupabase(order.id, host, data, sefazMsg);
        }
        return res.status(422).json({
          success: false,
          error: sefazMsg,
          data
        });
      }

      const normalizedData = {
        ...data,
        caminho_danfe: normalizeFocusUrl(host, data?.caminho_danfe),
        caminho_xml_nota_fiscal: normalizeFocusUrl(host, data?.caminho_xml_nota_fiscal || data?.caminho_xml),
        qrcode_url: normalizeFocusUrl(host, data?.qrcode_url),
        url_consulta_nf: normalizeFocusUrl(host, data?.url_consulta_nf)
      };

      if (order.id) {
        await syncOrderFiscalToSupabase(order.id, host, normalizedData);
      }

      return res.json({
        success: true,
        simulated: false,
        data: normalizedData
      });
    } catch (err: any) {
      console.error("Error in /api/fiscal/emit-nfe:", err);
      return res.status(500).json({
        success: false,
        error: `Falha de comunicação com Focus NFe/SEFAZ: ${err.message || 'Erro desconhecido'}`
      });
    }
  });

  // API endpoint para consultar status real de uma NFC-e na Focus NFe e sincronizar com o banco
  app.post("/api/fiscal/consult-nfe", async (req, res) => {
    try {
      const { orderId, restaurantId } = req.body || {};
      if (!orderId || !restaurantId) {
        return res.status(400).json({ success: false, error: "orderId e restaurantId são obrigatórios." });
      }

      const creds = await resolveFocusRestaurantCredentials({ id: restaurantId }, Number(restaurantId));
      if (!creds.apiKey) {
        return res.status(400).json({ success: false, error: "Token da Focus NFe não configurado para este restaurante." });
      }

      const ref = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const authHeader = `Basic ${Buffer.from(`${creds.apiKey}:`).toString('base64')}`;
      const consultRes = await fetch(`${creds.host}/v2/nfce/${encodeURIComponent(ref)}`, {
        method: "GET",
        headers: { "Authorization": authHeader },
        signal: AbortSignal.timeout(10000)
      });

      const rawText = await consultRes.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { mensagem: rawText };
      }

      if (!consultRes.ok) {
        return res.status(consultRes.status).json({
          success: false,
          error: extractFocusErrorMessage(data, `NFC-e não encontrada na Focus NFe (${consultRes.status}).`),
          data
        });
      }

      const normalizedData = {
        ...data,
        caminho_danfe: normalizeFocusUrl(creds.host, data?.caminho_danfe),
        caminho_xml_nota_fiscal: normalizeFocusUrl(creds.host, data?.caminho_xml_nota_fiscal || data?.caminho_xml),
        qrcode_url: normalizeFocusUrl(creds.host, data?.qrcode_url),
        url_consulta_nf: normalizeFocusUrl(creds.host, data?.url_consulta_nf)
      };

      await syncOrderFiscalToSupabase(String(orderId), creds.host, normalizedData);

      return res.json({
        success: true,
        data: normalizedData
      });
    } catch (err: any) {
      console.error("Error in /api/fiscal/consult-nfe:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro ao consultar NFC-e na Focus NFe." });
    }
  });

  // API endpoint para cancelar uma NFC-e autorizada na Focus NFe
  app.post("/api/fiscal/cancel-nfe", async (req, res) => {
    try {
      const { orderId, restaurantId, justificativa } = req.body || {};
      const cleanReason = String(justificativa || '').trim();
      if (!orderId || !restaurantId) {
        return res.status(400).json({ success: false, error: "orderId e restaurantId são obrigatórios." });
      }
      if (cleanReason.length < 15) {
        return res.status(400).json({ success: false, error: "A justificativa de cancelamento na SEFAZ deve ter no mínimo 15 caracteres." });
      }

      const creds = await resolveFocusRestaurantCredentials({ id: restaurantId }, Number(restaurantId));
      if (!creds.apiKey) {
        return res.status(400).json({ success: false, error: "Token da Focus NFe não configurado para este restaurante." });
      }

      const ref = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const authHeader = `Basic ${Buffer.from(`${creds.apiKey}:`).toString('base64')}`;
      const cancelRes = await fetch(`${creds.host}/v2/nfce/${encodeURIComponent(ref)}`, {
        method: "DELETE",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ justificativa: cleanReason }),
        signal: AbortSignal.timeout(15000)
      });

      const rawText = await cancelRes.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { mensagem: rawText };
      }

      if (!cancelRes.ok) {
        return res.status(cancelRes.status).json({
          success: false,
          error: extractFocusErrorMessage(data, `Falha ao cancelar NFC-e na Focus NFe (${cancelRes.status}).`),
          data
        });
      }

      await syncOrderFiscalToSupabase(String(orderId), creds.host, {
        ...data,
        status: data?.status || 'cancelado',
        mensagem_sefaz: data?.mensagem_sefaz || 'NFC-e cancelada na SEFAZ.'
      });

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Error in /api/fiscal/cancel-nfe:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro ao cancelar NFC-e na Focus NFe." });
    }
  });

  // Download seguro do XML oficial armazenado pela Focus NFe
  app.get("/api/fiscal/download-xml", async (req, res) => {
    try {
      const orderId = String(req.query.orderId || '').trim();
      if (!orderId) {
        return res.status(400).json({ error: "orderId é obrigatório." });
      }

      const { data: orderRow, error } = await supabase
        .from('orders')
        .select('id, fiscal_xml_url, fiscal_key, payment_details')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !orderRow) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      const xmlUrl = String(orderRow.fiscal_xml_url || orderRow.payment_details?.fiscal?.xml_url || '').trim();
      if (!xmlUrl) {
        return res.status(404).json({ error: "URL do XML oficial da Focus NFe ainda não disponível para este pedido." });
      }

      let parsed: URL;
      try {
        parsed = new URL(xmlUrl);
      } catch {
        return res.status(400).json({ error: "URL de XML inválida." });
      }

      const isAllowedHost =
        parsed.protocol === 'https:' &&
        (
          parsed.hostname.endsWith('.focusnfe.com.br') ||
          parsed.hostname === 'focusnfe.com.br' ||
          parsed.hostname.endsWith('.amazonaws.com')
        );

      if (!isAllowedHost) {
        return res.status(403).json({ error: "Domínio de XML não autorizado." });
      }

      const xmlResp = await fetch(parsed.toString(), { signal: AbortSignal.timeout(10000) });
      if (!xmlResp.ok) {
        return res.status(502).json({ error: `Erro ao baixar XML da Focus NFe (HTTP ${xmlResp.status}).` });
      }

      const xmlBody = await xmlResp.text();
      const fileName = `NFe${orderRow.fiscal_key || orderId}.xml`;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(xmlBody);
    } catch (err: any) {
      console.error("Error in /api/fiscal/download-xml:", err);
      return res.status(500).json({ error: "Erro ao obter XML oficial da Focus NFe." });
    }
  });

  // Webhook para retorno assíncrono da Focus NFe
  app.post("/api/fiscal/webhook", async (req, res) => {
    try {
      const configuredSecret = process.env.FISCAL_WEBHOOK_SECRET;
      if (configuredSecret) {
        const provided = req.query.token || req.headers['x-webhook-token'];
        if (provided !== configuredSecret) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      const {
        status,
        referencia,
        ref,
      } = req.body || {};

      const orderRef = String(referencia || ref || '').trim();
      console.log(`[Focus NFe Webhook] Recebido status ${status} para pedido ${orderRef}`);

      if (!orderRef) {
        return res.status(400).json({ error: "Referência (order_id) ausente no webhook." });
      }

      let webhookHost = "https://api.focusnfe.com.br";
      const { data: ordRow } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderRef)
        .maybeSingle();
      if (ordRow?.restaurant_id) {
        const { data: restRow } = await supabase
          .from('restaurants')
          .select('fiscal_env')
          .eq('id', ordRow.restaurant_id)
          .maybeSingle();
        if (restRow?.fiscal_env !== 'producao') {
          webhookHost = "https://homologacao.focusnfe.com.br";
        }
      }

      await syncOrderFiscalToSupabase(orderRef, webhookHost, req.body);
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
        .select('id, fiscal_xml_url, fiscal_danfe_url, order_number, fiscal_key')
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
