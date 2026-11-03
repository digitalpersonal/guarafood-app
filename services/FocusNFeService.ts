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
  const url = `${getBaseUrl(config.ambiente)}/nfce?ref=${order.id}`;
  
  const payload = {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: new Date().toISOString(),
    cnpj_emitente: restaurant.cnpj?.replace(/\D/g, ''),
    valor_total: order.totalPrice,
    items: order.items.map((item: any, index: number) => ({
      numero_item: index + 1,
      codigo_produto: item.id || `PROD-${index}`,
      descricao: item.name,
      quantidade_comercial: item.quantity,
      valor_unitario: item.price,
      valor_bruto: item.price * item.quantity,
      ncm: item.ncm || "21069090"
    })),
    // Pagamento
    pagamento: {
      forma_pagamento: "01", // 01 = Dinheiro, 03 = Cartão Crédito, 04 = Cartão Débito, 17 = Pix
      valor_pagamento: order.totalPrice
    }
  };

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
