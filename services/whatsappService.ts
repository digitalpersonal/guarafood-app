import { supabase } from './api';
import type { WhatsAppConnection, WhatsAppConversation, WhatsAppMessage } from '../types';

export const META_WHATSAPP_CONFIG_ID = '1500115125487483';

/**
 * Mensagem de saudação padrão do WhatsApp do GuaráFood.
 * Contém o link direto para o cardápio e tags dinâmicas como {nome_cliente} e {link_menu}.
 */
export const DEFAULT_GREETING_TEMPLATE = `Olá, {nome_cliente}! Seja muito bem-vindo(a) ao *{nome_restaurante}*! 👋🍽️

Confira nosso cardápio completo e faça seu pedido online com rapidez pelo link abaixo:
👉 {link_menu}

🕒 Horário de funcionamento: {horario_funcionamento}
📞 Telefone/WhatsApp: {telefone}

Estamos à disposição se precisar de alguma ajuda! Bom apetite! 😊`;

/**
 * Retorna a URL pública direta para o cardápio do restaurante no GuaráFood.
 */
export const getRestaurantMenuUrl = (restaurantId: number): string => {
    if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        return `${origin}${pathname}?r=${restaurantId}`;
    }
    return `https://guarafood.com.br/?r=${restaurantId}`;
};

/**
 * Formata o modelo de saudação substituindo as variáveis dinâmicas pelas informações reais do restaurante e do cliente.
 */
export const formatGreetingMessage = (
    template: string,
    restaurant: {
        id: number;
        name: string;
        phone?: string;
        openingHours?: string;
        address?: string;
        city?: string;
    },
    customerName: string = 'Cliente'
): string => {
    const rawTemplate = template?.trim() || DEFAULT_GREETING_TEMPLATE;
    const menuUrl = getRestaurantMenuUrl(restaurant.id);
    const openingHours = restaurant.openingHours || 'Consulte nosso horário no cardápio online';
    const phone = restaurant.phone || '';
    const address = restaurant.address || '';
    const city = restaurant.city || 'Guaranésia';
    const clientName = customerName?.trim() || 'Cliente';

    return rawTemplate
        .replace(/\{nome_cliente\}|\{cliente\}|\{nome_do_cliente\}/gi, clientName)
        .replace(/\{link_menu\}|\{link_cardapio\}|\{link\}/gi, menuUrl)
        .replace(/\{nome_restaurante\}|\{restaurante\}|\{nome\}/gi, restaurant.name)
        .replace(/\{horario_funcionamento\}|\{horario\}|\{funcionamento\}/gi, openingHours)
        .replace(/\{telefone\}|\{contato\}/gi, phone)
        .replace(/\{endereco\}/gi, address)
        .replace(/\{cidade\}/gi, city);
};

const STORAGE_KEY_PREFIX = 'guarafood-whatsapp-conn-';

const getLocalStorageConnection = (restaurantId: number): WhatsAppConnection | null => {
    try {
        const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
};

const saveLocalStorageConnection = (connection: WhatsAppConnection) => {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${connection.restaurantId}`, JSON.stringify(connection));
    } catch (e) {
        console.warn('Erro ao salvar conexão WhatsApp em cache local:', e);
    }
};

const removeLocalStorageConnection = (restaurantId: number) => {
    try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
    } catch (e) {
        console.warn('Erro ao remover conexão WhatsApp de cache local:', e);
    }
};

/**
 * Busca a conexão do WhatsApp para o restaurante atual no Supabase,
 * com fallback inteligente e timeout de segurança para nunca travar a interface.
 */
export const fetchWhatsAppConnection = async (restaurantId: number): Promise<WhatsAppConnection | null> => {
    if (!restaurantId) return null;

    try {
        const fetchPromise = (async (): Promise<WhatsAppConnection | null> => {
            // 1. Tenta buscar na tabela dedicada restaurant_whatsapp_connections
            try {
                const { data, error } = await supabase
                    .from('restaurant_whatsapp_connections')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .maybeSingle();

                if (!error && data) {
                    const connection: WhatsAppConnection = {
                        id: data.id,
                        restaurantId: Number(data.restaurant_id),
                        status: (data.status as 'connected' | 'disconnected' | 'pending') || 'disconnected',
                        phoneNumber: data.phone_number || undefined,
                        displayPhoneNumber: data.display_phone_number || undefined,
                        businessName: data.business_name || undefined,
                        wabaId: data.waba_id || undefined,
                        phoneNumberId: data.phone_number_id || undefined,
                        configId: data.config_id || META_WHATSAPP_CONFIG_ID,
                        greetingMessageEnabled: data.greeting_message_enabled !== undefined ? Boolean(data.greeting_message_enabled) : true,
                        greetingMessage: data.greeting_message || undefined,
                        greetingOnlyDuringHours: data.greeting_only_during_hours !== undefined ? Boolean(data.greeting_only_during_hours) : true,
                        connectedAt: data.connected_at || undefined,
                        updatedAt: data.updated_at || undefined,
                    };
                    saveLocalStorageConnection(connection);
                    return connection;
                }
            } catch (err) {
                console.warn('[WhatsAppService] Tabela restaurant_whatsapp_connections inacessível:', err);
            }

            // 2. Se a tabela não existir ou não houver dados, tenta buscar na coluna whatsapp_connection
            try {
                const { data: resData } = await supabase
                    .from('restaurants')
                    .select('whatsapp_connection, whatsapp_greeting_enabled, whatsapp_greeting_message, whatsapp_greeting_only_during_hours')
                    .eq('id', restaurantId)
                    .maybeSingle();

                if (resData?.whatsapp_connection) {
                    const parsed = typeof resData.whatsapp_connection === 'string' 
                        ? JSON.parse(resData.whatsapp_connection) 
                        : resData.whatsapp_connection;
                    if (parsed) {
                        if (resData.whatsapp_greeting_enabled !== undefined) {
                            parsed.greetingMessageEnabled = Boolean(resData.whatsapp_greeting_enabled);
                        }
                        if (resData.whatsapp_greeting_message) {
                            parsed.greetingMessage = resData.whatsapp_greeting_message;
                        }
                        if (resData.whatsapp_greeting_only_during_hours !== undefined) {
                            parsed.greetingOnlyDuringHours = Boolean(resData.whatsapp_greeting_only_during_hours);
                        } else if (parsed.greetingOnlyDuringHours === undefined) {
                            parsed.greetingOnlyDuringHours = true;
                        }
                        saveLocalStorageConnection(parsed);
                        return parsed;
                    }
                } else if (resData?.whatsapp_greeting_message || resData?.whatsapp_greeting_enabled !== undefined) {
                    const partialConn: WhatsAppConnection = {
                        restaurantId,
                        status: 'disconnected',
                        configId: META_WHATSAPP_CONFIG_ID,
                        greetingMessageEnabled: resData.whatsapp_greeting_enabled !== undefined ? Boolean(resData.whatsapp_greeting_enabled) : true,
                        greetingMessage: resData.whatsapp_greeting_message || DEFAULT_GREETING_TEMPLATE,
                        greetingOnlyDuringHours: resData.whatsapp_greeting_only_during_hours !== undefined ? Boolean(resData.whatsapp_greeting_only_during_hours) : true,
                    };
                    saveLocalStorageConnection(partialConn);
                    return partialConn;
                }
            } catch {
                // Ignore fallback error
            }

            return null;
        })();

        // Timeout de segurança de 3 segundos para garantir que o spinner nunca fique preso
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        if (result) return result;
    } catch (err) {
        console.warn('[WhatsAppService] Exceção ao buscar conexão do WhatsApp:', err);
    }

    // Fallback para cache local persistente
    return getLocalStorageConnection(restaurantId);
};

/**
 * Salva ou atualiza a conexão do WhatsApp no Supabase vinculada ao restaurante logado.
 */
export const saveWhatsAppConnection = async (connection: WhatsAppConnection): Promise<WhatsAppConnection> => {
    const payload = {
        restaurant_id: connection.restaurantId,
        phone_number: connection.phoneNumber || null,
        display_phone_number: connection.displayPhoneNumber || null,
        business_name: connection.businessName || null,
        waba_id: connection.wabaId || null,
        phone_number_id: connection.phoneNumberId || null,
        status: connection.status,
        config_id: connection.configId || META_WHATSAPP_CONFIG_ID,
        greeting_message_enabled: connection.greetingMessageEnabled !== undefined ? connection.greetingMessageEnabled : true,
        greeting_message: connection.greetingMessage || null,
        greeting_only_during_hours: connection.greetingOnlyDuringHours !== undefined ? connection.greetingOnlyDuringHours : true,
        connected_at: connection.connectedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    saveLocalStorageConnection(connection);

    try {
        // Tenta upsert na tabela dedicada
        const { data, error } = await supabase
            .from('restaurant_whatsapp_connections')
            .upsert(payload, { onConflict: 'restaurant_id' })
            .select()
            .single();

        if (!error && data) {
            const saved: WhatsAppConnection = {
                id: data.id,
                restaurantId: Number(data.restaurant_id),
                status: data.status,
                phoneNumber: data.phone_number,
                displayPhoneNumber: data.display_phone_number,
                businessName: data.business_name,
                wabaId: data.waba_id,
                phoneNumberId: data.phone_number_id,
                configId: data.config_id || META_WHATSAPP_CONFIG_ID,
                greetingMessageEnabled: data.greeting_message_enabled !== undefined ? Boolean(data.greeting_message_enabled) : true,
                greetingMessage: data.greeting_message || undefined,
                greetingOnlyDuringHours: data.greeting_only_during_hours !== undefined ? Boolean(data.greeting_only_during_hours) : true,
                connectedAt: data.connected_at,
                updatedAt: data.updated_at,
            };
            saveLocalStorageConnection(saved);

            // Atualiza também na tabela restaurants em background para redundância
            await supabase
                .from('restaurants')
                .update({
                    whatsapp_greeting_enabled: saved.greetingMessageEnabled,
                    whatsapp_greeting_message: saved.greetingMessage,
                    whatsapp_greeting_only_during_hours: saved.greetingOnlyDuringHours,
                })
                .eq('id', connection.restaurantId);

            return saved;
        }

        // Se a tabela dedicada ainda não existir ou falhar por falta de coluna, salva no campo da tabela restaurants
        if (error) {
            console.warn('[WhatsAppService] Falha ao gravar em restaurant_whatsapp_connections. Gravando em fallback na tabela restaurants...', error.message);
            await supabase
                .from('restaurants')
                .update({ 
                    whatsapp_connection: payload,
                    whatsapp_greeting_enabled: connection.greetingMessageEnabled !== undefined ? connection.greetingMessageEnabled : true,
                    whatsapp_greeting_message: connection.greetingMessage || null,
                    whatsapp_greeting_only_during_hours: connection.greetingOnlyDuringHours !== undefined ? connection.greetingOnlyDuringHours : true,
                })
                .eq('id', connection.restaurantId);
        }
    } catch (err) {
        console.warn('[WhatsAppService] Exceção ao gravar no banco:', err);
    }

    return connection;
};

/**
 * Salva especificamente a mensagem de saudação automática e o estado de ativação
 */
export const saveWhatsAppGreetingConfig = async (
    restaurantId: number,
    enabled: boolean,
    greetingMessage: string,
    onlyDuringHours: boolean = true
): Promise<{ success: boolean; error?: string }> => {
    if (!restaurantId) {
        return { success: false, error: 'ID do restaurante não fornecido.' };
    }

    const now = new Date().toISOString();

    // 1. Atualiza cache local imediatamente
    const currentCached = getLocalStorageConnection(restaurantId);
    if (currentCached) {
        currentCached.greetingMessageEnabled = enabled;
        currentCached.greetingMessage = greetingMessage;
        currentCached.greetingOnlyDuringHours = onlyDuringHours;
        currentCached.updatedAt = now;
        saveLocalStorageConnection(currentCached);
    }

    try {
        // 2. Tenta atualizar na tabela dedicada restaurant_whatsapp_connections
        const { error: dbError } = await supabase
            .from('restaurant_whatsapp_connections')
            .upsert({
                restaurant_id: restaurantId,
                greeting_message_enabled: enabled,
                greeting_message: greetingMessage,
                greeting_only_during_hours: onlyDuringHours,
                updated_at: now,
            }, { onConflict: 'restaurant_id' });

        if (dbError) {
            console.warn('[WhatsAppService] Aviso ao salvar saudação na tabela dedicada:', dbError.message);
        }

        // 3. Salva também como fallback seguro na tabela restaurants
        const { error: restError } = await supabase
            .from('restaurants')
            .update({
                whatsapp_greeting_enabled: enabled,
                whatsapp_greeting_message: greetingMessage,
                whatsapp_greeting_only_during_hours: onlyDuringHours,
            })
            .eq('id', restaurantId);

        if (restError) {
            console.warn('[WhatsAppService] Aviso ao salvar saudação na tabela restaurants:', restError.message);
        }

        return { success: true };
    } catch (err: any) {
        console.error('[WhatsAppService] Erro ao salvar configurações de saudação do WhatsApp:', err);
        return { success: false, error: err.message || 'Erro ao persistir configurações.' };
    }
};

/**
 * Desconecta o WhatsApp do restaurante logado.
 */
export const disconnectWhatsApp = async (restaurantId: number): Promise<void> => {
    removeLocalStorageConnection(restaurantId);

    const disconnectedState: WhatsAppConnection = {
        restaurantId,
        status: 'disconnected',
        configId: META_WHATSAPP_CONFIG_ID,
        updatedAt: new Date().toISOString(),
    };

    try {
        // Tenta atualizar o status na tabela dedicada
        const { error } = await supabase
            .from('restaurant_whatsapp_connections')
            .update({
                status: 'disconnected',
                phone_number: null,
                display_phone_number: null,
                business_name: null,
                waba_id: null,
                phone_number_id: null,
                meta_code: null,
                updated_at: new Date().toISOString(),
            })
            .eq('restaurant_id', restaurantId);

        if (error) {
            await supabase
                .from('restaurants')
                .update({ whatsapp_connection: null })
                .eq('id', restaurantId);
        }
    } catch (err) {
        console.warn('[WhatsAppService] Exceção ao desconectar WhatsApp no Supabase:', err);
    }

    saveLocalStorageConnection(disconnectedState);
};

/**
 * Valida se um valor de App ID da Meta é plausível e não foi confundido com o Config ID
 */
export const validateMetaAppId = (appId: string): { valid: boolean; error?: string } => {
    const clean = (appId || '').trim();
    if (!clean) {
        return { valid: false, error: 'O Meta App ID não pode estar vazio.' };
    }
    if (clean === META_WHATSAPP_CONFIG_ID || clean === '1500115125487483') {
        return {
            valid: false,
            error: '1500115125487483 é o Config ID (ID de Configuração), não o App ID! O App ID do seu aplicativo fica no topo do developers.facebook.com/apps.',
        };
    }
    if (!/^\d+$/.test(clean)) {
        return { valid: false, error: 'O App ID da Meta deve conter apenas números.' };
    }
    if (clean.length < 10 || clean.length > 20) {
        return { valid: false, error: 'O App ID da Meta geralmente possui entre 14 e 18 dígitos numéricos.' };
    }
    return { valid: true };
};

/**
 * Busca a configuração pública da Meta (como o App ID público para o SDK)
 * obtida diretamente da Edge Function sem expor nenhum segredo.
 */
export const fetchMetaPublicConfig = async (): Promise<{ appId: string; isConfigured: boolean }> => {
    try {
        const envAppId = (import.meta as any).env?.VITE_META_APP_ID;
        if (envAppId && validateMetaAppId(envAppId).valid) {
            return { appId: envAppId.trim(), isConfigured: true };
        }

        const { data, error } = await supabase.functions.invoke('whatsapp-exchange-token', {
            method: 'GET',
        });

        if (!error && data?.appId && validateMetaAppId(data.appId).valid) {
            return { appId: data.appId.trim(), isConfigured: true };
        }
    } catch (e) {
        console.warn('[WhatsAppService] Não foi possível consultar config pública da Meta na Edge function:', e);
    }

    const cachedAppId = (localStorage.getItem('guarafood-meta-app-id') || '').trim();
    
    // Se o valor em cache for igual ao Config ID ou inválido, limpa imediatamente
    if (cachedAppId) {
        if (!validateMetaAppId(cachedAppId).valid) {
            console.warn('[WhatsAppService] App ID em cache era inválido ou igual ao Config ID. Limpando cache...', cachedAppId);
            localStorage.removeItem('guarafood-meta-app-id');
            return { appId: '', isConfigured: false };
        }
        return { appId: cachedAppId, isConfigured: true };
    }

    return { appId: '', isConfigured: false };
};

/**
 * Salva o App ID público da Meta em cache caso o administrador forneça pela UI
 */
export const setCachedMetaAppId = (appId: string) => {
    const clean = (appId || '').trim();
    if (clean && validateMetaAppId(clean).valid) {
        localStorage.setItem('guarafood-meta-app-id', clean);
    } else {
        localStorage.removeItem('guarafood-meta-app-id');
    }
};

/**
 * Carrega e inicializa o Facebook JavaScript SDK da Meta no navegador
 */
export const loadFacebookSDK = (appId?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const targetAppId = (appId || (import.meta as any).env?.VITE_META_APP_ID || localStorage.getItem('guarafood-meta-app-id') || '').trim();

        if (!targetAppId || !validateMetaAppId(targetAppId).valid) {
            reject(new Error('META_APP_ID_MISSING'));
            return;
        }

        const setupFB = () => {
            try {
                if ((window as any).FB) {
                    (window as any).FB.init({
                        appId: targetAppId,
                        autoLogAppEvents: true,
                        xfbml: true,
                        cookie: true,
                        version: 'v21.0'
                    });
                    resolve((window as any).FB);
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.warn('[WhatsAppService] Aviso ao inicializar FB:', err);
                resolve((window as any).FB || null);
            }
        };

        if ((window as any).FB) {
            setupFB();
            return;
        }

        const existingScript = document.getElementById('facebook-jssdk');
        if (existingScript) {
            const checkInterval = setInterval(() => {
                if ((window as any).FB) {
                    clearInterval(checkInterval);
                    setupFB();
                }
            }, 100);
            return;
        }

        (window as any).fbAsyncInit = function () {
            setupFB();
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error('Falha ao carregar Facebook SDK'));
        document.body.appendChild(script);
    });
};

export type MetaSignupErrorType =
    | 'POPUP_CLOSED'
    | 'CANCELLED_BY_USER'
    | 'NOT_AUTHORIZED'
    | 'POPUP_BLOCKED'
    | 'META_API_ERROR'
    | 'BACKEND_EXCHANGE_ERROR'
    | 'UNKNOWN';

export interface MetaSignupResult {
    success: boolean;
    connection?: WhatsAppConnection;
    message?: string;
    errorType?: MetaSignupErrorType;
    errorDetails?: string;
    missingSecrets?: string[];
    wabaId?: string;
    phoneNumberId?: string;
    authCode?: string;
}

/**
 * Dispara o fluxo oficial de Cadastro Incorporado do WhatsApp da Meta (Embedded Signup)
 * utilizando o Config ID 1500115125487483.
 */
export const launchMetaEmbeddedSignup = async (
    restaurantId: number,
    customAppId?: string
): Promise<MetaSignupResult> => {
    if (!restaurantId) {
        throw new Error('ID do restaurante é obrigatório para conectar o WhatsApp.');
    }

    // 1. Obtém o App ID da Meta
    let appId = customAppId;
    if (!appId) {
        const config = await fetchMetaPublicConfig();
        appId = config.appId;
    }

    if (!appId) {
        throw new Error('META_APP_ID_MISSING');
    }

    const valResult = validateMetaAppId(appId);
    if (!valResult.valid) {
        throw new Error(valResult.error || 'META_APP_ID_MISSING');
    }

    // 2. Carrega o SDK oficial da Meta
    const FB = await loadFacebookSDK(appId);
    if (!FB) {
        throw new Error('Não foi possível inicializar o Facebook SDK. Verifique se seu navegador não está bloqueando scripts de terceiros.');
    }

    return new Promise((resolve, reject) => {
        let capturedWabaId: string | undefined = undefined;
        let capturedPhoneNumberId: string | undefined = undefined;
        let isCompleted = false;
        let userExplicitlyCancelled = false;
        let metaApiErrorDetails: string | undefined = undefined;
        const startTime = Date.now();

        // 3. Listener para o evento WA_EMBEDDED_SIGNUP enviado pela Meta via postMessage
        const messageHandler = (event: MessageEvent) => {
            // A Meta envia de facebook.com ou web.facebook.com
            if (
                event.origin !== 'https://www.facebook.com' &&
                event.origin !== 'https://web.facebook.com'
            ) {
                return;
            }

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
                    console.log('[WhatsAppService] Evento WA_EMBEDDED_SIGNUP recebido da Meta:', data);

                    if (data.event === 'FINISH' && data.data) {
                        capturedPhoneNumberId = data.data.phone_number_id || capturedPhoneNumberId;
                        capturedWabaId = data.data.waba_id || capturedWabaId;
                    } else if (data.event === 'CANCEL') {
                        userExplicitlyCancelled = true;
                        console.log('[WhatsAppService] Usuário cancelou o cadastro incorporado na janela da Meta.');
                    } else if (data.event === 'ERROR') {
                        console.warn('[WhatsAppService] Erro no fluxo do Embedded Signup recebido da Meta:', data.data);
                        metaApiErrorDetails = data.data?.error_message || data.data?.message || 'Erro durante a autorização na Meta.';
                    }
                }
            } catch {
                // Ignora mensagens que não sejam JSON
            }
        };

        window.addEventListener('message', messageHandler);

        // Limpeza do listener ao finalizar
        const cleanup = () => {
            window.removeEventListener('message', messageHandler);
        };

        // 4. Inicia o login com o Config ID oficial da Meta
        console.log(`[WhatsAppService] Abrindo FB.login com Config ID: ${META_WHATSAPP_CONFIG_ID}...`);
        
        try {
            // A Meta exige estritamente uma função síncrona como callback (lança erro se for async function)
            FB.login(
                function (response: any) {
                    if (isCompleted) return;
                    isCompleted = true;
                    cleanup();

                    const elapsedMs = Date.now() - startTime;
                    console.log('[WhatsAppService] Resposta do FB.login recebida após', elapsedMs, 'ms:', response);

                    const authCode = response?.authResponse?.code;

                    // TRATAMENTO ROBUSTO: O usuário fechou o pop-up ou não concluiu a autorização
                    if (!authCode && !capturedWabaId && !capturedPhoneNumberId) {
                        // Cenário A: A Meta reportou erro explícito via postMessage
                        if (metaApiErrorDetails) {
                            resolve({
                                success: false,
                                errorType: 'META_API_ERROR',
                                errorDetails: metaApiErrorDetails,
                                message: `A Meta retornou um aviso durante o processo: ${metaApiErrorDetails}`,
                            });
                            return;
                        }

                        // Cenário B: Usuário clicou explicitamente em cancelar na janela da Meta
                        if (userExplicitlyCancelled) {
                            resolve({
                                success: false,
                                errorType: 'CANCELLED_BY_USER',
                                message: 'Você cancelou o processo na janela da Meta. Nenhuma alteração foi feita no seu WhatsApp.',
                            });
                            return;
                        }

                        // Cenário C: Permissão negada / status not_authorized
                        if (response?.status === 'not_authorized') {
                            resolve({
                                success: false,
                                errorType: 'NOT_AUTHORIZED',
                                message: 'Acesso não autorizado na conta da Meta. Para conectar, é necessário aceitar as permissões solicitadas.',
                            });
                            return;
                        }

                        // Cenário D: Pop-up bloqueado pelo navegador (resposta instantânea < 350ms sem interação)
                        if (elapsedMs < 350 && response?.status === 'unknown') {
                            resolve({
                                success: false,
                                errorType: 'POPUP_BLOCKED',
                                message: 'O pop-up de conexão da Meta foi bloqueado pelo seu navegador. Por favor, habilite pop-ups para este site.',
                            });
                            return;
                        }

                        // Cenário E: Usuário fechou o pop-up da Meta antes de concluir (fechou no X ou aba)
                        resolve({
                            success: false,
                            errorType: 'POPUP_CLOSED',
                            message: 'A janela de conexão da Meta foi fechada antes de concluir o processo. Seus dados permanecem seguros e inalterados.',
                        });
                        return;
                    }

                    // 5. Envia com segurança para a Edge Function do Supabase trocar o código de forma assíncrona
                    (async () => {
                        try {
                            console.log('[WhatsAppService] Invocando Edge Function whatsapp-exchange-token no Supabase...');
                            const { data: exchangeResult, error: funcError } = await supabase.functions.invoke(
                                'whatsapp-exchange-token',
                                {
                                    body: {
                                        restaurantId,
                                        code: authCode,
                                        wabaId: capturedWabaId,
                                        phoneNumberId: capturedPhoneNumberId,
                                        configId: META_WHATSAPP_CONFIG_ID,
                                    },
                                }
                            );

                            if (funcError) {
                                console.error('[WhatsAppService] Erro ao invocar Edge Function:', funcError);
                                // Fallback: se a Edge Function ainda não foi deployada no Supabase,
                                // persistimos o status capturado com segurança
                                const fallbackConnection: WhatsAppConnection = {
                                    restaurantId,
                                    status: (capturedWabaId || capturedPhoneNumberId) ? 'connected' : 'pending',
                                    wabaId: capturedWabaId,
                                    phoneNumberId: capturedPhoneNumberId,
                                    configId: META_WHATSAPP_CONFIG_ID,
                                    connectedAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                };
                                await saveWhatsAppConnection(fallbackConnection);

                                resolve({
                                    success: true,
                                    connection: fallbackConnection,
                                    message: 'Autorização recebida da Meta com sucesso!',
                                    wabaId: capturedWabaId,
                                    phoneNumberId: capturedPhoneNumberId,
                                    authCode,
                                });
                                return;
                            }

                            if (exchangeResult?.connection) {
                                saveLocalStorageConnection(exchangeResult.connection);
                            }

                            resolve({
                                success: exchangeResult?.success ?? true,
                                connection: exchangeResult?.connection,
                                message: exchangeResult?.message,
                                missingSecrets: exchangeResult?.missingSecrets,
                                wabaId: capturedWabaId,
                                phoneNumberId: capturedPhoneNumberId,
                                authCode,
                            });
                        } catch (edgeErr: any) {
                            console.error('[WhatsAppService] Exceção ao processar troca no backend:', edgeErr);
                            resolve({
                                success: false,
                                errorType: 'BACKEND_EXCHANGE_ERROR',
                                message: edgeErr?.message || 'Falha ao processar autorização no servidor.',
                            });
                        }
                    })();
                },
                {
                    config_id: META_WHATSAPP_CONFIG_ID,
                    response_type: 'code',
                    override_default_response_type: true,
                    extras: {
                        feature: 'whatsapp_embedded_signup',
                        version: 'v21.0',
                        sessionInfoVersion: '2',
                    },
                }
            );
        } catch (fbLoginErr: any) {
            cleanup();
            console.error('[WhatsAppService] Erro ao disparar FB.login:', fbLoginErr);
            reject(new Error(fbLoginErr?.message || 'Não foi possível abrir o fluxo de login da Meta.'));
        }
    });
};

/**
 * Envia uma mensagem de WhatsApp para um cliente utilizando a Edge Function segura whatsapp-send.
 * O frontend NUNCA manipula ou expõe o token de acesso da Meta.
 */
export const sendWhatsAppMessage = async (
    restaurantId: number,
    to: string,
    message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
        if (!restaurantId || !to || !message) {
            return { success: false, error: 'Dados incompletos para envio.' };
        }

        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
            body: {
                restaurantId,
                to,
                message,
                previewUrl: true,
            },
        });

        if (error) {
            console.error('[WhatsAppService] Erro retornado pela Edge Function whatsapp-send:', error);
            return { success: false, error: error.message || 'Erro ao enviar mensagem pelo servidor.' };
        }

        if (data?.error) {
            return { success: false, error: data.error };
        }

        return {
            success: true,
            messageId: data?.messageId,
        };
    } catch (err: any) {
        console.error('[WhatsAppService] Exceção ao enviar mensagem:', err);
        return { success: false, error: err?.message || 'Falha de comunicação no envio de mensagem.' };
    }
};

/**
 * Busca a lista de conversas recentes do restaurante no Supabase.
 * Cada restaurante acessa estritamente suas próprias conversas.
 */
export const getRestaurantConversations = async (
    restaurantId: number
): Promise<WhatsAppConversation[]> => {
    if (!restaurantId) return [];

    try {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.warn('[WhatsAppService] Aviso ao buscar conversas:', error);
            return [];
        }

        return (data || []).map((c: any) => ({
            id: c.id,
            restaurantId: c.restaurant_id,
            restaurantPhone: c.restaurant_phone,
            customerPhone: c.customer_phone,
            customerName: c.customer_name,
            lastMessage: c.last_message,
            lastMessageAt: c.last_message_at,
            unreadCount: c.unread_count || 0,
            status: c.status || 'open',
            createdAt: c.created_at,
            updatedAt: c.updated_at,
        }));
    } catch (err) {
        console.warn('[WhatsAppService] Falha ao listar conversas:', err);
        return [];
    }
};

/**
 * Busca o histórico de mensagens de uma conversa específica.
 */
export const getConversationMessages = async (
    conversationId: string
): Promise<WhatsAppMessage[]> => {
    if (!conversationId) return [];

    try {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[WhatsAppService] Aviso ao buscar mensagens:', error);
            return [];
        }

        return (data || []).map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            restaurantId: m.restaurant_id,
            restaurantPhone: m.restaurant_phone,
            customerPhone: m.customer_phone,
            direction: m.direction,
            message: m.message,
            type: m.type || 'text',
            metaMessageId: m.meta_message_id,
            status: m.status,
            createdAt: m.created_at,
        }));
    } catch (err) {
        console.warn('[WhatsAppService] Falha ao carregar mensagens:', err);
        return [];
    }
};

/**
 * Ativa ou desativa a integração do WhatsApp para o restaurante.
 */
export const toggleWhatsAppActive = async (
    restaurantId: number,
    active: boolean
): Promise<{ success: boolean; error?: string }> => {
    if (!restaurantId) return { success: false, error: 'Restaurante inválido' };

    try {
        const { error } = await supabase
            .from('restaurant_whatsapp_connections')
            .update({
                active,
                updated_at: new Date().toISOString(),
            })
            .eq('restaurant_id', restaurantId);

        if (error) {
            console.error('[WhatsAppService] Erro ao alterar status ativo:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Falha ao atualizar status' };
    }
};

