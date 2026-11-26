/**
 * Serviço para gerenciar integração com a API da Focus NFe.
 * Suporta múltiplos emitentes (Multi-empresa) através do token de autenticação específico por CNPJ.
 */

export interface FocusConfig {
  token: string;
  ambiente: 'producao' | 'homologacao';
}

const getBaseUrl = (ambiente: 'producao' | 'homologacao') =>
  ambiente === 'producao' 
    ? "https://api.focusnfe.com.br/v2" 
    : "https://homologacao.focusnfe.com.br/v2";

const getHeaders = (token: string) => ({
  "Authorization": `Basic ${Buffer.from(token + ":").toString('base64')}`,
  "Content-Type": "application/json"
});

/**
 * Emite uma NFC-e (Nota Fiscal de Consumidor Eletrônica)
 */
export const emitNFe = async (config: FocusConfig, order: any, restaurant: any) => {
  const ref = encodeURIComponent(String(order.id || `ord-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_'));
  const url = `${getBaseUrl(config.ambiente)}/nfce?ref=${ref}`;
  const brDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace('Z', '-03:00');
  const cleanDoc = String(order.customerDocument || '').replace(/\D/g, '');

  const payload: Record<string, any> = {
    natureza_operacao: "VENDA AO CONSUMIDOR",
    data_emissao: brDate,
    tipo_documento: "1",
    presenca_comprador: order.customerAddress?.street ? "4" : "1",
    consumidor_final: "1",
    modalidade_frete: "9",
    cnpj_emitente: restaurant.cnpj?.replace(/\D/g, ''),
    items: (order.items || []).map((item: any, index: number) => {
      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const unit = Math.round((Number(item.price ?? item.basePrice ?? 0) || 0.01) * 100) / 100;
      const bruto = Math.round(unit * qty * 100) / 100;
      return {
        numero_item: index + 1,
        codigo_produto: String(item.id || `PROD-${index + 1}`),
        descricao: String(item.name || `Item ${index + 1}`).slice(0, 120),
        codigo_ncm: String(item.ncm || "21069090").replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
        cfop: String(item.cfop || "5102").replace(/\D/g, '').slice(0, 4) || "5102",
        unidade_comercial: "UN",
        quantidade_comercial: qty,
        valor_unitario_comercial: Number((bruto / qty).toFixed(4)),
        valor_bruto: bruto,
        unidade_tributavel: "UN",
        quantidade_tributavel: qty,
        valor_unitario_tributavel: Number((bruto / qty).toFixed(4)),
        icms_origem: "0",
        icms_situacao_tributaria: "102",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07"
      };
    }),
    formas_pagamento: [
      {
        forma_pagamento: "01",
        valor_pagamento: Math.round((Number(order.totalPrice) || 0) * 100) / 100
      }
    ]
  };

  if (cleanDoc.length === 11) {
    payload.cpf_destinatario = cleanDoc;
    if (order.customerName) payload.nome_destinatario = String(order.customerName).slice(0, 60);
  } else if (cleanDoc.length === 14) {
    payload.cnpj_destinatario = cleanDoc;
    if (order.customerName) payload.nome_destinatario = String(order.customerName).slice(0, 60);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(config.token),
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
};

/**
 * Consulta o status de uma nota fiscal
 */
export const consultNFe = async (config: FocusConfig, ref: string) => {
  const url = `${getBaseUrl(config.ambiente)}/nfce/${ref}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(config.token)
  });

  return handleResponse(response);
};

/**
 * Cancela uma nota fiscal
 */
export const cancelNFe = async (config: FocusConfig, ref: string, reason: string) => {
  const url = `${getBaseUrl(config.ambiente)}/nfce/${ref}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(config.token),
    body: JSON.stringify({ justificativa: reason })
  });

  return handleResponse(response);
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensagem || data.erros?.[0]?.mensagem || "Erro na API da Focus NFe");
  }
  return data;
};
