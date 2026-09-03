import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Restaurant, WhatsAppConnection } from '../types';
import { 
    fetchWhatsAppConnection, 
    disconnectWhatsApp, 
    saveWhatsAppConnection,
    toggleWhatsAppActive,
    META_WHATSAPP_CONFIG_ID,
    launchMetaEmbeddedSignup,
    fetchMetaPublicConfig,
    setCachedMetaAppId,
    validateMetaAppId
} from '../services/whatsappService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import WhatsAppGreetingSettings from './WhatsAppGreetingSettings';
import WhatsAppConversationsList from './WhatsAppConversationsList';

interface WhatsAppSettingsProps {
    restaurant: Restaurant;
    onUpdateConnection?: (connection: WhatsAppConnection | null) => void;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ 
    restaurant, 
    onUpdateConnection 
}) => {
    const { addToast } = useNotification();
    
    // Inicializa a conexão com cache local se disponível para exibição instantânea
    const [connection, setConnection] = useState<WhatsAppConnection | null>(() => {
        if (restaurant?.whatsappConnection) return restaurant.whatsappConnection;
        if (restaurant?.id) {
            try {
                const cached = localStorage.getItem(`guarafood-whatsapp-conn-${restaurant.id}`);
                if (cached) return JSON.parse(cached);
            } catch {
                // ignore
            }
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [connectingStep, setConnectingStep] = useState<string>('');
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState<boolean>(false);
    const [isAppIdModalOpen, setIsAppIdModalOpen] = useState<boolean>(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
    const [metaAppIdInput, setMetaAppIdInput] = useState<string>('');
    const [currentAppId, setCurrentAppId] = useState<string>('');
    const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

    // Feedback visual amigável e instrutivo caso o lojista feche o popup ou ocorra interrupção no Embedded Signup
    const [signupFeedback, setSignupFeedback] = useState<{
        type: 'closed' | 'cancelled' | 'blocked' | 'error';
        title: string;
        message: string;
        tips: string[];
    } | null>(null);

    // Campos do formulário manual
    const [manualPhone, setManualPhone] = useState<string>(restaurant.phone || '');
    const [manualBusinessName, setManualBusinessName] = useState<string>(restaurant.name || '');
    const [manualWabaId, setManualWabaId] = useState<string>('');
    const [manualPhoneNumberId, setManualPhoneNumberId] = useState<string>('');

    // Guarda referência estável para onUpdateConnection para evitar loops de render
    const onUpdateConnectionRef = useRef(onUpdateConnection);
    useEffect(() => {
        onUpdateConnectionRef.current = onUpdateConnection;
    }, [onUpdateConnection]);

    // Carrega o App ID público ou do cache
    const refreshAppId = useCallback(async () => {
        try {
            const cfg = await fetchMetaPublicConfig();
            setCurrentAppId(cfg.appId || '');
            if (cfg.appId) {
                setMetaAppIdInput(cfg.appId);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        refreshAppId();
    }, [refreshAppId]);

    // Carrega a conexão existente do Supabase vinculada a este restaurante
    const loadConnection = useCallback(async () => {
        if (!restaurant?.id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchWhatsAppConnection(restaurant.id);
            setConnection(data);
        } catch (err) {
            console.error('[WhatsAppSettings] Erro ao carregar conexão:', err);
        } finally {
            setIsLoading(false);
        }
    }, [restaurant?.id]);

    useEffect(() => {
        loadConnection();

        // Timer de proteção absoluta: após 2.5s libera a tela se houver lentidão na rede
        const safetyTimer = setTimeout(() => {
            setIsLoading(false);
        }, 2500);

        return () => clearTimeout(safetyTimer);
    }, [loadConnection]);

    // Dispara o fluxo oficial do Facebook Login for Business / WhatsApp Embedded Signup
    const handleConnectWhatsApp = async (overrideAppId?: string) => {
        if (!restaurant.id) {
            addToast({ message: 'Restaurante não identificado.', type: 'error' });
            return;
        }

        // 1. Verifica se temos o App ID público da Meta válido
        let appId = overrideAppId;
        if (!appId) {
            const config = await fetchMetaPublicConfig();
            appId = config.appId;
        }

        const validation = validateMetaAppId(appId || '');
        if (!appId || !validation.valid) {
            setMetaAppIdInput(appId && appId !== META_WHATSAPP_CONFIG_ID ? appId : '');
            setIsAppIdModalOpen(true);
            setIsConnecting(false);
            setConnectingStep('');
            return;
        }

        setIsConnecting(true);
        setConnectingStep('Iniciando SDK da Meta...');
        setConnectionMessage(null);
        setSignupFeedback(null);

        try {
            setConnectingStep('Abrindo Cadastro Incorporado da Meta (Embedded Signup)...');
            addToast({ 
                message: 'A janela oficial da Meta foi aberta. Siga as etapas na tela da Meta.', 
                type: 'info' 
            });

            const result = await launchMetaEmbeddedSignup(restaurant.id, appId);

            if (result.success && result.connection) {
                setSignupFeedback(null);
                setConnection(result.connection);
                if (onUpdateConnectionRef.current) {
                    onUpdateConnectionRef.current(result.connection);
                }

                if (result.missingSecrets && result.missingSecrets.length > 0) {
                    setConnectionMessage(
                        'Autorização recebida da Meta! Para que a Graph API finalize todas as consultas automaticamente em produção, configure os Secrets no Supabase: ' +
                        result.missingSecrets.join(', ')
                    );
                    addToast({ 
                        message: 'WhatsApp vinculado! Configure os Secrets do Supabase para ativar envio total.', 
                        type: 'warning' 
                    });
                } else {
                    addToast({ message: 'WhatsApp conectado com sucesso ao GuaraFood!', type: 'success' });
                }
            } else {
                // TRATAMENTO ROBUSTO E FEEDBACK AMIGÁVEL PARA CADA CASO DE NÃO CONCLUSÃO
                const errorType = result.errorType || 'UNKNOWN';

                if (errorType === 'POPUP_CLOSED') {
                    setSignupFeedback({
                        type: 'closed',
                        title: 'Janela da Meta Fechada sem Concluir',
                        message: 'A janela oficial da Meta foi fechada antes da confirmação final do cadastro. Fique tranquilo: nenhuma alteração foi realizada na sua conta e o seu restaurante continua seguro.',
                        tips: [
                            'Para concluir a integração, avance por todas as etapas na janela da Meta até ver a mensagem de sucesso.',
                            'Mantenha seu aparelho celular por perto para digitar o código de verificação via SMS ou chamada telefônica.',
                            'Se preferir conectar sem depender da janela da Meta, utilize o botão "Conexão Manual / Direta" abaixo.',
                        ],
                    });
                    addToast({ 
                        message: 'Janela da Meta fechada antes de concluir. Nenhuma alteração foi realizada.', 
                        type: 'info' 
                    });
                } else if (errorType === 'CANCELLED_BY_USER') {
                    setSignupFeedback({
                        type: 'cancelled',
                        title: 'Conexão Cancelada pelo Usuário',
                        message: 'O processo de autorização foi cancelado na janela da Meta. O seu WhatsApp permanece no estado anterior.',
                        tips: [
                            'Você pode tentar novamente a qualquer momento clicando no botão verde abaixo.',
                            'Verifique se você selecionou o Gerenciador de Negócios e a Conta Comercial corretos.',
                            'Se preferir, cadastre diretamente usando a "Conexão Manual / Direta".',
                        ],
                    });
                    addToast({ 
                        message: 'Conexão cancelada na janela da Meta.', 
                        type: 'info' 
                    });
                } else if (errorType === 'POPUP_BLOCKED') {
                    setSignupFeedback({
                        type: 'blocked',
                        title: 'Pop-up Bloqueado pelo Navegador',
                        message: 'O seu navegador bloqueou a abertura da janela oficial da Meta. Para utilizar o Cadastro Incorporado, é necessário autorizar janelas pop-up.',
                        tips: [
                            'Procure pelo ícone de pop-up bloqueado na barra de endereços (lado direito ou esquerdo do navegador).',
                            'Selecione a opção "Sempre permitir pop-ups e redirecionamentos deste site" e confirme.',
                            'Depois de autorizar, clique novamente em "Conectar meu WhatsApp".',
                            'Ou clique em "Conexão Manual / Direta" para conectar sem precisar de pop-ups.',
                        ],
                    });
                    addToast({ 
                        message: 'Abertura da janela bloqueada pelo navegador. Habilite pop-ups para continuar.', 
                        type: 'warning' 
                    });
                } else if (errorType === 'NOT_AUTHORIZED') {
                    setSignupFeedback({
                        type: 'error',
                        title: 'Permissões do WhatsApp Não Concedidas',
                        message: 'As permissões da Meta para envio e gerenciamento de mensagens do WhatsApp Business não foram autorizadas.',
                        tips: [
                            'Ao abrir a janela da Meta, confirme todas as permissões solicitadas para que o GuaráFood possa enviar as notificações de pedidos.',
                            'Certifique-se de que seu usuário no Facebook possui função de Administrador no Gerenciador de Negócios.',
                            'Você também pode vincular seus identificadores diretamente pela Conexão Manual.',
                        ],
                    });
                    addToast({ 
                        message: 'Permissões não autorizadas na Meta. Tente novamente ou use a conexão manual.', 
                        type: 'warning' 
                    });
                } else if (errorType === 'META_API_ERROR') {
                    setSignupFeedback({
                        type: 'error',
                        title: 'Aviso da Plataforma Meta',
                        message: result.errorDetails || result.message || 'A Meta informou uma restrição durante a configuração.',
                        tips: [
                            'Verifique se o número informado não está associado a uma conta pessoal do WhatsApp comum.',
                            'Se o número já estiver em outro aplicativo do WhatsApp Business, conclua a migração ou utilize outro número comercial.',
                            'Você também pode preencher os dados diretamente na Conexão Manual.',
                        ],
                    });
                    addToast({ 
                        message: result.message || 'Aviso recebido da Meta.', 
                        type: 'warning' 
                    });
                } else {
                    setSignupFeedback({
                        type: 'closed',
                        title: 'Conexão Não Concluída',
                        message: result.message || 'O processo do WhatsApp Embedded Signup foi interrompido.',
                        tips: [
                            'Clique em "Tentar Conectar Novamente" para reiniciar o fluxo.',
                            'Se a janela da Meta não abrir ou fechar inesperadamente, utilize a "Conexão Manual / Direta".',
                        ],
                    });
                    if (result.message) {
                        addToast({ message: result.message, type: 'warning' });
                    }
                }
            }
        } catch (err: any) {
            console.error('[WhatsAppSettings] Erro ao conectar via Meta Embedded Signup:', err);
            if (err.message === 'META_APP_ID_MISSING' || err.message?.includes('Config ID') || err.message?.includes('App ID')) {
                setIsAppIdModalOpen(true);
                if (err.message !== 'META_APP_ID_MISSING') {
                    addToast({ message: err.message, type: 'error' });
                }
            } else {
                setSignupFeedback({
                    type: 'error',
                    title: 'Dificuldade de Conexão com a Meta',
                    message: err.message || 'Não foi possível carregar a janela da Meta.',
                    tips: [
                        'Verifique se sua conexão com a internet está ativa e sem bloqueadores de script.',
                        'Se estiver usando extensões como AdBlock ou privacidade estrita, permita o domínio facebook.com.',
                        'Você pode utilizar a Conexão Manual a qualquer momento.',
                    ],
                });
                addToast({ 
                    message: err.message || 'Não foi possível completar o cadastro na Meta. Tente novamente.', 
                    type: 'error' 
                });
            }
        } finally {
            setIsConnecting(false);
            setConnectingStep('');
        }
    };

    // Salva o App ID fornecido e retoma o fluxo de conexão
    const handleSaveAppIdAndConnect = () => {
        const cleanId = metaAppIdInput.trim();
        const validation = validateMetaAppId(cleanId);
        if (!validation.valid) {
            addToast({ message: validation.error || 'Por favor, informe um App ID válido.', type: 'warning' });
            return;
        }
        setCachedMetaAppId(cleanId);
        setCurrentAppId(cleanId);
        setIsAppIdModalOpen(false);
        handleConnectWhatsApp(cleanId);
    };

    // Limpa o App ID salvo em cache
    const handleClearAppId = () => {
        setCachedMetaAppId('');
        setCurrentAppId('');
        setMetaAppIdInput('');
        addToast({ message: 'App ID da Meta redefinido.', type: 'info' });
    };

    // Conexão direta manual (alternativa sem popup da Meta)
    const handleSaveManualConnection = async () => {
        if (!manualPhone.trim()) {
            addToast({ message: 'Por favor, informe o número do WhatsApp.', type: 'warning' });
            return;
        }

        setIsConnecting(true);
        try {
            const manualConn: WhatsAppConnection = {
                restaurantId: restaurant.id,
                status: 'connected',
                phoneNumber: manualPhone.trim(),
                displayPhoneNumber: manualPhone.trim(),
                businessName: manualBusinessName.trim() || restaurant.name,
                wabaId: manualWabaId.trim() || undefined,
                phoneNumberId: manualPhoneNumberId.trim() || undefined,
                configId: META_WHATSAPP_CONFIG_ID,
                connectedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const saved = await saveWhatsAppConnection(manualConn);
            setConnection(saved);
            if (onUpdateConnectionRef.current) {
                onUpdateConnectionRef.current(saved);
            }
            setIsManualModalOpen(false);
            addToast({ message: 'WhatsApp do restaurante conectado com sucesso!', type: 'success' });
        } catch (err: any) {
            console.error('[WhatsAppSettings] Erro ao salvar conexão manual:', err);
            addToast({ message: 'Falha ao salvar conexão.', type: 'error' });
        } finally {
            setIsConnecting(false);
        }
    };

    // Desconectar o WhatsApp do restaurante logado
    const handleConfirmDisconnect = async () => {
        if (!restaurant.id) return;

        setIsConnecting(true);
        try {
            await disconnectWhatsApp(restaurant.id);
            setConnection(null);
            if (onUpdateConnectionRef.current) {
                onUpdateConnectionRef.current(null);
            }
            addToast({ message: 'WhatsApp desconectado com sucesso.', type: 'info' });
            setIsDisconnectModalOpen(false);
            setConnectionMessage(null);
        } catch (err) {
            console.error('[WhatsAppSettings] Erro ao desconectar:', err);
            addToast({ message: 'Erro ao desconectar WhatsApp.', type: 'error' });
        } finally {
            setIsConnecting(false);
        }
    };

    const isConnected = connection && connection.status === 'connected';
    const isConfigIdMistake = metaAppIdInput.trim() === META_WHATSAPP_CONFIG_ID || metaAppIdInput.trim() === '1500115125487483';
    const appIdValidation = validateMetaAppId(metaAppIdInput);

    const [isTogglingActive, setIsTogglingActive] = useState<boolean>(false);

    const handleToggleActive = async () => {
        if (!restaurant?.id || !connection || isTogglingActive) return;
        setIsTogglingActive(true);
        const newStatus = connection.active === false ? true : false;
        try {
            const res = await toggleWhatsAppActive(restaurant.id, newStatus);
            if (res.success) {
                const updated: WhatsAppConnection = { ...connection, active: newStatus };
                setConnection(updated);
                if (onUpdateConnectionRef.current) {
                    onUpdateConnectionRef.current(updated);
                }
                addToast({ 
                    message: newStatus ? 'Integração do WhatsApp ATIVADA com sucesso!' : 'Integração do WhatsApp PAUSADA temporariamente.', 
                    type: newStatus ? 'success' : 'info' 
                });
            } else {
                addToast({ message: res.error || 'Erro ao alterar status', type: 'error' });
            }
        } catch (err: any) {
            addToast({ message: err?.message || 'Erro ao alterar status', type: 'error' });
        } finally {
            setIsTogglingActive(false);
        }
    };

    if (isLoading && !connection) {
        return (
            <div className="p-12 flex flex-col justify-center items-center gap-3">
                <Spinner message="Carregando status do WhatsApp..." />
                <button 
                    type="button"
                    onClick={() => setIsLoading(false)}
                    className="text-xs text-gray-400 hover:text-gray-700 underline mt-2 cursor-pointer transition-colors"
                >
                    Continuar mesmo assim
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header da Seção */}
            <div className="border-b pb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 tracking-tight">WhatsApp</h2>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#25D366] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Meta WhatsApp Business Platform
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Conecte o WhatsApp do seu restaurante ao GuaraFood para enviar comprovantes, notificações de pedidos e gerenciar as mensagens dos seus clientes.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadConnection}
                    className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Atualizar status da conexão"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Atualizar</span>
                </button>
            </div>

            {/* AVISO DE CONFIGURAÇÃO PENDENTE (SE APLICÁVEL) */}
            {connectionMessage && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 animate-in fade-in duration-200">
                    <span className="text-base">ℹ️</span>
                    <div>
                        <p className="font-bold">Aviso de Configuração:</p>
                        <p className="mt-0.5 leading-relaxed">{connectionMessage}</p>
                    </div>
                </div>
            )}

            {/* CARD DE STATUS DA CONEXÃO */}
            <div className={`p-6 rounded-3xl border-2 transition-all shadow-sm ${
                isConnected 
                    ? 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200 shadow-emerald-100/50' 
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Status da Conexão
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                                isConnected 
                                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' 
                                    : 'bg-gray-400'
                            }`} />
                            <h3 className={`text-lg font-black ${isConnected ? 'text-emerald-900' : 'text-gray-800'}`}>
                                {isConnected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}
                            </h3>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isConnected && (
                            <button
                                type="button"
                                onClick={handleToggleActive}
                                disabled={isTogglingActive}
                                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                    connection?.active !== false
                                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                }`}
                                title={connection?.active !== false ? 'Pausar o envio de mensagens deste WhatsApp' : 'Ativar o envio de mensagens'}
                            >
                                {isTogglingActive ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>{connection?.active !== false ? '⏸️ Pausar Integração' : '▶️ Ativar Integração'}</span>
                                )}
                            </button>
                        )}

                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            isConnected 
                                ? connection?.active !== false
                                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-100/80 text-amber-800 border-amber-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                            {isConnected 
                                ? connection?.active !== false ? 'Ativo' : 'Pausado'
                                : 'Desconectado'}
                        </span>
                    </div>
                </div>

                {/* CONTEÚDO QUANDO CONECTADO */}
                {isConnected ? (
                    <div className="mt-6 space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Nome do WhatsApp */}
                            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                    Nome do WhatsApp
                                </span>
                                <p className="text-base font-black text-gray-900 flex items-center gap-2">
                                    <span>🏪</span>
                                    <span>{connection?.businessName || restaurant.name}</span>
                                </p>
                            </div>

                            {/* Número Conectado */}
                            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                    Número conectado
                                </span>
                                <p className="text-base font-black text-gray-900 font-mono flex items-center gap-2">
                                    <span>📱</span>
                                    <span>{connection?.displayPhoneNumber || connection?.phoneNumber || 'Número cadastrado na Meta'}</span>
                                </p>
                            </div>

                            {/* Detalhes Técnicos Oficiais da Meta */}
                            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm sm:col-span-2 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                    Identificadores da Conexão (Meta Cloud API)
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-[9px] text-gray-400 block uppercase font-bold">WABA ID</span>
                                        <span className="text-gray-800 font-semibold truncate block">
                                            {connection?.wabaId || 'Não informado'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Phone Number ID</span>
                                        <span className="text-gray-800 font-semibold truncate block">
                                            {connection?.phoneNumberId || 'Não informado'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Config ID</span>
                                        <span className="text-gray-800 font-semibold truncate block">
                                            {connection?.configId || META_WHATSAPP_CONFIG_ID}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status da Conexão */}
                            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm sm:col-span-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                    Status da Conexão
                                </span>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        <span>Conectado à API Oficial da Meta (Cloud API)</span>
                                    </p>
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        Vinculado exclusivamente a: <strong>{restaurant.name}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Botão Desconectar */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-xs text-gray-500">
                                Restaurante ID: <strong>{restaurant.id}</strong> • Conexão isolada por estabelecimento
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsDisconnectModalOpen(true)}
                                disabled={isConnecting}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-all font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Desconectar WhatsApp
                            </button>
                        </div>
                    </div>
                ) : (
                    /* CONTEÚDO QUANDO NÃO CONECTADO */
                    <div className="mt-6 space-y-6">
                        {/* FEEDBACK AMIGÁVEL E INSTRUTIVO (CASO O LOJISTA TENHA FECHADO A JANELA OU OCORRIDO INTERRUPÇÃO) */}
                        {signupFeedback && (
                            <div className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-300 shadow-sm ${
                                signupFeedback.type === 'blocked' 
                                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                    : signupFeedback.type === 'error'
                                    ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                                    : 'bg-blue-50/90 border-blue-200 text-blue-950'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                                            signupFeedback.type === 'blocked'
                                                ? 'bg-amber-100 text-amber-700'
                                                : signupFeedback.type === 'error'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {signupFeedback.type === 'blocked' ? '🚫' : signupFeedback.type === 'error' ? '⚠️' : 'ℹ️'}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black tracking-tight">
                                                {signupFeedback.title}
                                            </h4>
                                            <p className="text-xs mt-1 leading-relaxed opacity-90">
                                                {signupFeedback.message}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSignupFeedback(null)}
                                        className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                                        title="Dispensar aviso"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* DICAS AMIGÁVEIS E PRÁTICAS */}
                                {signupFeedback.tips && signupFeedback.tips.length > 0 && (
                                    <div className="mt-3.5 pt-3 border-t border-black/5 space-y-1.5 text-xs">
                                        <span className="font-bold text-[11px] uppercase tracking-wider block opacity-75">
                                            Dicas úteis:
                                        </span>
                                        <ul className="space-y-1 pl-1">
                                            {signupFeedback.tips.map((tip, idx) => (
                                                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                                    <span className="text-emerald-600 font-bold">•</span>
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AÇÕES RÁPIDAS */}
                                <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleConnectWhatsApp()}
                                        disabled={isConnecting}
                                        className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                        </svg>
                                        <span>Tentar Conectar Novamente</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsManualModalOpen(true)}
                                        className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>⌨️</span>
                                        <span>Usar Conexão Manual</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSignupFeedback(null)}
                                        className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                    >
                                        Dispensar aviso
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">✨</span>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                                        Cadastro Incorporado Oficial da Meta (WhatsApp Embedded Signup)
                                    </h4>
                                    <p className="text-xs text-emerald-900/90 leading-relaxed">
                                        Ao clicar abaixo, você será guiado pela janela oficial do Facebook/Meta para selecionar ou cadastrar o número de WhatsApp da sua empresa com o Config ID oficial <strong>{META_WHATSAPP_CONFIG_ID}</strong>. Nenhum token confidencial é exposto no seu navegador.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Botões de Conexão */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button
                                type="button"
                                onClick={() => handleConnectWhatsApp()}
                                disabled={isConnecting}
                                className="px-8 py-4 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isConnecting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{connectingStep || 'Conectando ao WhatsApp...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                        <span>Conectar meu WhatsApp</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsManualModalOpen(true)}
                                disabled={isConnecting}
                                className="px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                <span>⌨️</span>
                                <span>Conexão Manual / Direta</span>
                            </button>
                        </div>

                        {/* Detalhes técnicos e de configuração da Meta */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div>
                                    <span className="font-bold text-gray-700">App ID da Meta:</span>{' '}
                                    {currentAppId ? (
                                        <span className="font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                                            {currentAppId}
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            Pendente de configuração
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMetaAppIdInput(currentAppId);
                                            setIsAppIdModalOpen(true);
                                        }}
                                        className="px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[11px] uppercase transition-colors cursor-pointer"
                                    >
                                        {currentAppId ? 'Alterar App ID' : 'Configurar App ID'}
                                    </button>
                                    {currentAppId && (
                                        <button
                                            type="button"
                                            onClick={handleClearAppId}
                                            className="px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-[11px] uppercase transition-colors cursor-pointer"
                                            title="Remover App ID salvo"
                                        >
                                            Limpar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-200/60 gap-2">
                                <span>Facebook Login for Business • WhatsApp Embedded Signup</span>
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                                    Config ID Oficial: <strong>{META_WHATSAPP_CONFIG_ID}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SEÇÃO DE MENSAGEM AUTOMÁTICA DE SAUDAÇÃO COM O LINK DO CARDÁPIO */}
            <WhatsAppGreetingSettings
                restaurant={restaurant}
                connection={connection}
                onUpdateConnection={(updatedConn) => {
                    setConnection(updatedConn);
                    if (onUpdateConnectionRef.current) {
                        onUpdateConnectionRef.current(updatedConn);
                    }
                }}
            />

            {/* SEÇÃO DE HISTÓRICO DE CONVERSAS E CHAT (Apenas se o WhatsApp estiver conectado) */}
            {isConnected && (
                <WhatsAppConversationsList
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.name}
                    isConnected={isConnected}
                />
            )}

            {/* MODAL PARA CONFIGURAR META APP ID (COM VALIDAÇÃO REFORÇADA) */}
            {isAppIdModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">App ID do Facebook / Meta</h3>
                                    <p className="text-xs text-gray-500">Identificador do seu aplicativo para o SDK</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAppIdModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            {/* Alerta de confusão com o Config ID */}
                            {isConfigIdMistake && (
                                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs text-red-800 space-y-1.5 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 font-bold text-red-900">
                                        <span className="text-base">⚠️</span>
                                        <span>Atenção: 1500115125487483 é o Config ID, NÃO o App ID!</span>
                                    </div>
                                    <p className="leading-relaxed">
                                        O número <strong>1500115125487483</strong> é o ID da Configuração de Login que já está gravado no código.
                                        Se você usá-lo como App ID, a Meta retornará o erro <code>PLATFORM_INVALID_APP_ID</code>.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                                    Meta App ID (Identificador do Aplicativo)
                                </label>
                                <input
                                    type="text"
                                    value={metaAppIdInput}
                                    onChange={(e) => setMetaAppIdInput(e.target.value)}
                                    placeholder="Ex: 893456123098745 (15-17 dígitos)"
                                    className={`w-full p-3.5 border-2 rounded-xl font-mono text-gray-900 outline-none transition-all ${
                                        isConfigIdMistake 
                                            ? 'border-red-400 bg-red-50/50 focus:border-red-500' 
                                            : 'border-gray-200 focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]'
                                    }`}
                                />
                                {metaAppIdInput && !appIdValidation.valid && !isConfigIdMistake && (
                                    <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                                        {appIdValidation.error}
                                    </p>
                                )}
                            </div>

                            {/* Onde encontrar o App ID */}
                            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-2">
                                <p className="font-bold flex items-center gap-1.5 text-blue-900">
                                    <span>🔍</span>
                                    <span>Onde localizar o App ID correto na Meta:</span>
                                </p>
                                <ol className="list-decimal list-inside space-y-1 text-blue-900/90 text-[11px] leading-relaxed">
                                    <li>Acesse seu painel em <strong>developers.facebook.com/apps</strong></li>
                                    <li>Clique no aplicativo onde você configurou o WhatsApp.</li>
                                    <li>No topo esquerdo da página, ao lado do nome do app, copie o <strong>"ID do app"</strong>.</li>
                                    <li>Cole o número aqui (ele é diferente do Config ID <code>{META_WHATSAPP_CONFIG_ID}</code>).</li>
                                </ol>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsAppIdModalOpen(false)}
                                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAppIdAndConnect}
                                disabled={!metaAppIdInput.trim() || !appIdValidation.valid || isConfigIdMistake}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Salvar App ID e Conectar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONEXÃO DIRETA / MANUAL */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] text-xl">
                                    📱
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">Conexão Manual do WhatsApp</h3>
                                    <p className="text-xs text-gray-500">Conecte diretamente sem depender de popups</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsManualModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                                    Número do WhatsApp *
                                </label>
                                <input
                                    type="text"
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(e.target.value)}
                                    placeholder="Ex: +55 (11) 98765-4321"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#25D366] outline-none"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Número que receberá e enviará as mensagens dos clientes.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                                    Nome de Exibição da Empresa
                                </label>
                                <input
                                    type="text"
                                    value={manualBusinessName}
                                    onChange={(e) => setManualBusinessName(e.target.value)}
                                    placeholder="Ex: GuaráFood Delivery"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#25D366] outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                                        Phone Number ID (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={manualPhoneNumberId}
                                        onChange={(e) => setManualPhoneNumberId(e.target.value)}
                                        placeholder="Ex: 104592039485"
                                        className="w-full p-2.5 border-2 border-gray-200 rounded-xl font-mono text-xs text-gray-900 focus:border-[#25D366] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                                        WABA ID (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={manualWabaId}
                                        onChange={(e) => setManualWabaId(e.target.value)}
                                        placeholder="Ex: 994820194852"
                                        className="w-full p-2.5 border-2 border-gray-200 rounded-xl font-mono text-xs text-gray-900 focus:border-[#25D366] outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsManualModalOpen(false)}
                                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveManualConnection}
                                disabled={!manualPhone.trim() || isConnecting}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isConnecting ? 'Salvando...' : 'Conectar WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE DESCONEXÃO */}
            {isDisconnectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
                        <div className="text-center space-y-3">
                            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
                                ⚠️
                            </div>
                            <h3 className="text-lg font-black text-gray-900">Desconectar WhatsApp?</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Tem certeza de que deseja desconectar o WhatsApp de <strong>{restaurant.name}</strong>? Você poderá reconectar a qualquer momento usando a mesma configuração.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDisconnectModalOpen(false)}
                                className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Manter Conectado
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDisconnect}
                                disabled={isConnecting}
                                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                            >
                                {isConnecting ? 'Desconectando...' : 'Sim, Desconectar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppSettings;
