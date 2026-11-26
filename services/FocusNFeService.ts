/**
 * Serviço para integração exclusiva com a API v2 da Focus NFe (NFC-e Modelo 65).
 * Suporta múltiplos emitentes (Multi-empresa) através do token de autenticação específico por CNPJ.
 */

export interface FocusConfig {
  token: string;
  ambiente: 'producao' | 'homologacao';
}

const getBaseUrl = (ambiente: 'producao' | 'homologacao') =>
  ambiente === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';

const encodeBasicToken = (token: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(`${token}:`).toString('base64');
  }
  return btoa(`${token}:`);
};

const getHeaders = (token: string) => ({
  Authorization: `Basic ${encodeBasicToken(token)}`,
  'Content-Type': 'application/json',
});

const formatBrazilIsoDate = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
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
};

const mapPaymentMethod = (method?: string): string => {
  const m = String(method || '').toLowerCase();
  if (m.includes('pix')) return '17';
  if (m.includes('débito') || m.includes('debito')) return '04';
  if (m.includes('crédito') || m.includes('credito') || m.includes('cart')) return '03';
  if (m.includes('vale') || m.includes('alelo') || m.includes('ticket') || m.includes('sodexo') || m.includes('vr')) return '10';
  if (m.includes('dinheiro') || m.includes('espécie')) return '01';
  return '99';
};

/**
 * Emite uma NFC-e (Nota Fiscal de Consumidor Eletrônica) via Focus NFe /v2/nfce
 */
export const emitNFe = async (config: FocusConfig, order: any, restaurant: any) => {
  const ref = encodeURIComponent(String(order.id || `ord-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_'));
  const url = `${getBaseUrl(config.ambiente)}/nfce?ref=${ref}`;
  const cleanDoc = String(order.customerDocument || '').replace(/\D/g, '');
  const payCode = mapPaymentMethod(order.paymentMethod);
  const paymentEntry: Record<string, any> = {
    forma_pagamento: payCode,
    valor_pagamento: Math.round((Number(order.totalPrice) || 0) * 100) / 100,
  };
  if (['03', '04', '10', '11', '17', '20'].includes(payCode)) {
    paymentEntry.tipo_integracao = '2';
  }
  if (payCode === '99') {
    paymentEntry.descricao_pagamento = String(order.paymentMethod || 'Outros').slice(0, 60);
  }

  const payload: Record<string, any> = {
    natureza_operacao: 'VENDA AO CONSUMIDOR',
    data_emissao: formatBrazilIsoDate(),
    tipo_documento: '1',
    finalidade_emissao: '1',
    local_destino: '1',
    presenca_comprador: order.customerAddress?.street ? '4' : '1',
    consumidor_final: '1',
    modalidade_frete: '9',
    cnpj_emitente: String(restaurant?.cnpj || '').replace(/\D/g, ''),
    items: (order.items || []).map((item: any, index: number) => {
      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const unit = Math.round((Number(item.price ?? item.basePrice ?? 0) || 0.01) * 100) / 100;
      const bruto = Math.round(unit * qty * 100) / 100;
      const unitAccurate = Number((bruto / qty).toFixed(6));
      const unitCode = item.isKiloItem && item.weight ? 'KG' : 'UN';
      return {
        numero_item: index + 1,
        codigo_produto: String(item.id || `PROD-${index + 1}`).slice(0, 60),
        descricao: String(item.name || `Item ${index + 1}`).trim().slice(0, 120),
        codigo_ncm: String(item.ncm || '21069090').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
        cfop: String(item.cfop || '5102').replace(/\D/g, '').slice(0, 4) || '5102',
        unidade_comercial: unitCode,
        quantidade_comercial: qty,
        valor_unitario_comercial: unitAccurate,
        valor_bruto: bruto,
        unidade_tributavel: unitCode,
        quantidade_tributavel: qty,
        valor_unitario_tributavel: unitAccurate,
        icms_origem: '0',
        icms_situacao_tributaria: '102',
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
      };
    }),
    formas_pagamento: [paymentEntry],
  };

  if (cleanDoc.length === 11) {
    payload.cpf_destinatario = cleanDoc;
    if (order.customerName) payload.nome_destinatario = String(order.customerName).trim().slice(0, 60);
  } else if (cleanDoc.length === 14) {
    payload.cnpj_destinatario = cleanDoc;
    if (order.customerName) payload.nome_destinatario = String(order.customerName).trim().slice(0, 60);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(config.token),
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

/**
 * Consulta o status de uma NFC-e na Focus NFe
 */
export const consultNFe = async (config: FocusConfig, ref: string) => {
  const url = `${getBaseUrl(config.ambiente)}/nfce/${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.token),
  });

  return handleResponse(response);
};

/**
 * Cancela uma NFC-e na Focus NFe
 */
export const cancelNFe = async (config: FocusConfig, ref: string, reason: string) => {
  const url = `${getBaseUrl(config.ambiente)}/nfce/${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.token),
    body: JSON.stringify({ justificativa: reason }),
  });

  return handleResponse(response);
};

const handleResponse = async (response: Response) => {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { mensagem: raw };
  }
  if (!response.ok) {
    throw new Error(data.mensagem_sefaz || data.mensagem || data.erros?.[0]?.mensagem || 'Erro na API da Focus NFe');
  }
  return data;
};
