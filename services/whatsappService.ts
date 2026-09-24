/**
 * Serviço de Integração do WhatsApp (Evolution API v2)
 * Suporta proxy seguro (/api/whatsapp) com fallback direto para Evolution API
 */

export interface WhatsAppProfile {
  profileName?: string;
  profilePicUrl?: string;
  ownerJid?: string;
}

export interface WhatsAppStatusResponse {
  connected: boolean;
  state: 'open' | 'close' | 'connecting' | 'disconnected';
  instanceName: string;
  profile?: WhatsAppProfile | null;
  qrcode?: string | null;
  pairingCode?: string | null;
  error?: string;
}

const DIRECT_API_URL = "https://app.api.guarafood.com.br";
const DIRECT_API_KEY = "token_secreto_guara_2026";

/**
 * Normaliza o ID da instância do WhatsApp
 */
export const getInstanceName = (restaurantId: number | string): string => {
  return `restaurante_${restaurantId}`;
};

/**
 * Consulta o status da conexão WhatsApp para o restaurante
 */
export const fetchWhatsAppStatus = async (restaurantId: number | string): Promise<WhatsAppStatusResponse> => {
  if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
    return { connected: false, state: 'disconnected', instanceName: '' };
  }

  // 1. Tenta chamar o proxy do backend
  try {
    const res = await fetch(`/api/whatsapp/status/${restaurantId}`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (backendErr) {
    console.warn('[WhatsAppService] Backend proxy status falhou, tentando Evolution API direta:', backendErr);
  }

  // 2. Fallback direto para Evolution API (com CORS habilitado)
  try {
    const instanceName = getInstanceName(restaurantId);
    const connRes = await fetch(`${DIRECT_API_URL}/instance/connectionState/${instanceName}`, {
      headers: { apikey: DIRECT_API_KEY },
      signal: AbortSignal.timeout(6000)
    });

    if (!connRes.ok) {
      return { connected: false, state: 'disconnected', instanceName };
    }

    const connData = await connRes.json();
    const state = connData?.instance?.state || 'disconnected';
    const isConnected = state === 'open';

    let profile: WhatsAppProfile | null = null;
    if (isConnected) {
      try {
        const instRes = await fetch(`${DIRECT_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
          headers: { apikey: DIRECT_API_KEY },
          signal: AbortSignal.timeout(6000)
        });
        if (instRes.ok) {
          const instList = await instRes.json();
          const found = Array.isArray(instList) ? instList.find((i: any) => i.name === instanceName) : null;
          if (found) {
            profile = {
              profileName: found.profileName || '',
              profilePicUrl: found.profilePicUrl || '',
              ownerJid: found.ownerJid || ''
            };
          }
        }
      } catch (_) {}
    }

    return {
      connected: isConnected,
      state: state as any,
      instanceName,
      profile
    };
  } catch (err: any) {
    console.error('[WhatsAppService] Erro ao buscar status na Evolution API:', err);
    return { connected: false, state: 'disconnected', instanceName: getInstanceName(restaurantId), error: err.message };
  }
};

/**
 * Solicita conexão e geração de QR Code
 */
export const connectWhatsAppInstance = async (restaurantId: number | string): Promise<WhatsAppStatusResponse> => {
  if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
    throw new Error('ID do restaurante não identificado. Recarregue a página.');
  }

  // 1. Tenta via proxy backend
  try {
    const res = await fetch(`/api/whatsapp/connect/${restaurantId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    // Se o backend retornou erro de negócio com mensagem clara
    const errData = await res.json().catch(() => ({}));
    if (errData.error && res.status < 500) {
      throw new Error(errData.error);
    }
  } catch (backendErr: any) {
    // Se o backend recusou ou não existe rota (ex: Vercel estático sem node server), faz o fallback direto
    console.warn('[WhatsAppService] Falha no proxy do backend, conectando diretamente com Evolution API:', backendErr.message);
  }

  // 2. Fallback direto para Evolution API
  const instanceName = getInstanceName(restaurantId);
  try {
    // A. Verifica se a instância já existe
    const fetchRes = await fetch(`${DIRECT_API_URL}/instance/fetchInstances`, {
      headers: { apikey: DIRECT_API_KEY },
      signal: AbortSignal.timeout(8000)
    });
    const instances = fetchRes.ok ? await fetchRes.json() : [];
    const existing = Array.isArray(instances) ? instances.find((i: any) => i.name === instanceName) : null;

    let qrCodeBase64: string | null = null;
    let pairingCode: string | null = null;
    let state = 'connecting';

    if (!existing) {
      // Cria nova instância
      const createRes = await fetch(`${DIRECT_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: DIRECT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson?.response?.message || errJson?.error || 'Falha ao criar instância no WhatsApp');
      }

      const createData = await createRes.json();
      qrCodeBase64 = createData?.qrcode?.base64 || createData?.base64 || null;
      pairingCode = createData?.qrcode?.pairingCode || createData?.pairingCode || null;
    } else {
      // Se já existe e está conectada
      if (existing.connectionStatus === 'open') {
        return {
          connected: true,
          state: 'open',
          instanceName,
          profile: {
            profileName: existing.profileName,
            profilePicUrl: existing.profilePicUrl,
            ownerJid: existing.ownerJid
          }
        };
      }

      // Conecta para gerar novo QR Code
      const connectRes = await fetch(`${DIRECT_API_URL}/instance/connect/${instanceName}`, {
        headers: { apikey: DIRECT_API_KEY },
        signal: AbortSignal.timeout(10000)
      });

      if (connectRes.ok) {
        const connData = await connectRes.json();
        qrCodeBase64 = connData?.base64 || connData?.qrcode?.base64 || null;
        pairingCode = connData?.pairingCode || connData?.qrcode?.pairingCode || null;
        state = connData?.instance?.state || 'connecting';
      }

      // Se não veio QR Code na reconexão simples, dispara restart para forçar novo QR Code
      if (!qrCodeBase64 && state !== 'open') {
        const restartRes = await fetch(`${DIRECT_API_URL}/instance/restart/${instanceName}`, {
          method: 'POST',
          headers: { apikey: DIRECT_API_KEY },
          signal: AbortSignal.timeout(10000)
        });
        if (restartRes.ok) {
          const restData = await restartRes.json();
          qrCodeBase64 = restData?.base64 || restData?.qrcode?.base64 || null;
          pairingCode = restData?.pairingCode || restData?.qrcode?.pairingCode || null;
        }
      }
    }

    return {
      connected: false,
      state: state as any,
      instanceName,
      qrcode: qrCodeBase64,
      pairingCode
    };
  } catch (directErr: any) {
    console.error('[WhatsAppService] Erro definitivo na conexão com Evolution API:', directErr);
    throw new Error(directErr.message || 'Falha ao conectar com o servidor WhatsApp.');
  }
};

/**
 * Desconecta e faz logout da sessão
 */
export const disconnectWhatsAppInstance = async (restaurantId: number | string): Promise<void> => {
  if (!restaurantId) return;

  try {
    await fetch(`/api/whatsapp/disconnect/${restaurantId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000)
    });
    return;
  } catch (_) {}

  // Fallback direto
  try {
    const instanceName = getInstanceName(restaurantId);
    await fetch(`${DIRECT_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: DIRECT_API_KEY },
      signal: AbortSignal.timeout(8000)
    });
  } catch (err: any) {
    console.error('[WhatsAppService] Erro ao desconectar:', err);
    throw new Error('Falha ao desconectar o WhatsApp.');
  }
};

/**
 * Reinicia e limpa a instância para forçar um QR Code fresco
 */
export const restartWhatsAppInstance = async (restaurantId: number | string): Promise<WhatsAppStatusResponse> => {
  const instanceName = getInstanceName(restaurantId);

  try {
    const res = await fetch(`/api/whatsapp/restart/${restaurantId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}

  // Fallback direto
  try {
    const restartRes = await fetch(`${DIRECT_API_URL}/instance/restart/${instanceName}`, {
      method: 'POST',
      headers: { apikey: DIRECT_API_KEY },
      signal: AbortSignal.timeout(10000)
    });
    if (restartRes.ok) {
      const restData = await restartRes.json();
      return {
        connected: false,
        state: 'connecting',
        instanceName,
        qrcode: restData?.base64 || restData?.qrcode?.base64 || null,
        pairingCode: restData?.pairingCode || restData?.qrcode?.pairingCode || null
      };
    }
  } catch (_) {}

  // Se não reiniciou, chama connect normal
  return connectWhatsAppInstance(restaurantId);
};
