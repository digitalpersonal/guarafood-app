import React, { useState, useEffect, useCallback, useRef } from 'react';

interface WhatsAppBotSettingsProps {
    restaurantId: number;
    restaurantName: string;
}

interface WhatsAppProfile {
    profileName?: string;
    profilePicUrl?: string;
    ownerJid?: string;
}

export const WhatsAppBotSettings: React.FC<WhatsAppBotSettingsProps> = ({ restaurantId, restaurantName }) => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const pollingIntervalRef = useRef<any>(null);

    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/whatsapp/status/${restaurantId}`);
            if (!res.ok) return;
            const data = await res.json();
            
            if (data.connected) {
                setIsConnected(true);
                setProfile(data.profile || null);
                setQrCodeBase64(null);
                setErrorMessage(null);
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            } else {
                setIsConnected(false);
                setProfile(null);
            }
        } catch (err) {
            console.error('Error checking WhatsApp status:', err);
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        checkStatus();
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [checkStatus]);

    const handleConnect = async () => {
        setIsGenerating(true);
        setErrorMessage(null);
        setQrCodeBase64(null);

        try {
            const res = await fetch(`/api/whatsapp/connect/${restaurantId}`, {
                method: 'POST'
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao conectar com o servidor WhatsApp.');
            }

            const data = await res.json();

            if (data.connected) {
                setIsConnected(true);
                setProfile(data.profile || null);
                setQrCodeBase64(null);
            } else if (data.qrcode) {
                setQrCodeBase64(data.qrcode);
                // Inicia polling a cada 3 segundos enquanto espera o escaneamento
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = setInterval(() => {
                    checkStatus();
                }, 3000);
            } else {
                setErrorMessage('Não foi possível obter o QR Code. Tente novamente.');
            }
        } catch (err: any) {
            console.error('Connect WhatsApp Error:', err);
            setErrorMessage(err.message || 'Erro ao gerar QR Code.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp deste restaurante? O robô deixará de responder automaticamente.')) {
            return;
        }

        setIsDisconnecting(true);
        try {
            await fetch(`/api/whatsapp/disconnect/${restaurantId}`, {
                method: 'POST'
            });
            setIsConnected(false);
            setProfile(null);
            setQrCodeBase64(null);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        } catch (err: any) {
            console.error('Disconnect error:', err);
            setErrorMessage('Erro ao desconectar WhatsApp.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    const formatPhone = (jid?: string) => {
        if (!jid) return '';
        const raw = jid.replace('@s.whatsapp.net', '');
        if (raw.length === 12 || raw.length === 13) {
            // Ex: 5535988785045 -> +55 (35) 98878-5045
            return `+${raw.slice(0, 2)} (${raw.slice(2, 4)}) ${raw.slice(4, -4)}-${raw.slice(-4)}`;
        }
        return raw;
    };

    return (
        <div className="mb-10 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            {/* Header da Seção */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl shadow-xs">
                        <svg className="w-6 h-6 text-emerald-600 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-md font-black text-gray-800 uppercase tracking-widest">
                            WhatsApp & Robô Automático
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            Atendimento inteligente Typebot conectado via Evolution API
                        </p>
                    </div>
                </div>

                {/* Badge de status */}
                <div>
                    {isLoading ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                            Verificando...
                        </span>
                    ) : isConnected ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1.5 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            🟢 Conectado
                        </span>
                    ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center gap-1.5 border border-gray-200">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Desconectado
                        </span>
                    )}
                </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {errorMessage}
                </div>
            )}

            {/* ESTADO 1: CONECTADO */}
            {isConnected ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {profile?.profilePicUrl ? (
                                <img 
                                    src={profile.profilePicUrl} 
                                    alt="Foto WhatsApp" 
                                    className="w-14 h-14 rounded-full border-2 border-emerald-500 object-cover shadow-xs" 
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-xs">
                                    {(profile?.profileName || restaurantName).charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h4 className="font-black text-gray-900 text-base">
                                    {profile?.profileName || restaurantName}
                                </h4>
                                <p className="text-xs text-emerald-800 font-bold">
                                    {formatPhone(profile?.ownerJid) || 'Número do WhatsApp conectado'}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[11px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                                        Instância: restaurante_{restaurantId}
                                    </span>
                                    <span className="text-[11px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                                        Robô: Typebot Ativo
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50"
                        >
                            {isDisconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900">
                        <span>✨ O robô responderá os clientes com cardápio e horário da loja automaticamente.</span>
                        <button
                            type="button"
                            onClick={checkStatus}
                            className="text-emerald-700 hover:underline font-bold text-[11px]"
                        >
                            Atualizar status
                        </button>
                    </div>
                </div>
            ) : qrCodeBase64 ? (
                /* ESTADO 2: AGUARDANDO LEITURA DO QR CODE */
                <div className="bg-gradient-to-b from-gray-50 to-white border-2 border-dashed border-emerald-400 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full mb-4">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        Aponte a câmera do WhatsApp para conectar
                    </div>

                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-200 inline-block">
                            <img 
                                src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                                alt="QR Code WhatsApp" 
                                className="w-64 h-64 mx-auto"
                            />
                        </div>
                    </div>

                    <div className="max-w-md mx-auto text-left bg-white p-4 rounded-xl border border-gray-200 mb-5 shadow-xs">
                        <h5 className="font-black text-xs text-gray-800 uppercase tracking-wider mb-2">
                            Passo a passo no seu celular:
                        </h5>
                        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside font-medium">
                            <li>Abra o <strong>WhatsApp</strong> no telefone do restaurante</li>
                            <li>Toque nos <strong>três pontinhos ⋮</strong> (ou <strong>Configurações</strong> no iPhone)</li>
                            <li>Toque em <strong>Aparelhos Conectados</strong></li>
                            <li>Toque em <strong>Conectar um aparelho</strong> e aponte para este QR Code</li>
                        </ol>
                    </div>

                    <div className="flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all"
                        >
                            {isGenerating ? 'Gerando...' : 'Gerar Novo QR Code'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setQrCodeBase64(null)}
                            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                /* ESTADO 3: DESCONECTADO */
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
                    <div className="max-w-md mx-auto mb-6">
                        <h4 className="font-black text-gray-800 text-base mb-1">
                            Conecte o WhatsApp do restaurante
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">
                            Ao conectar, o robô inteligente do GuaráFood responderá clientes no WhatsApp enviando o cardápio oficial, informando se a cozinha está aberta e tirando dúvidas 24h por dia.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-6 text-left">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                            <span className="text-emerald-500 font-black text-sm">⚡ 2 segundos</span>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Resposta instantânea sem deixar cliente no vácuo</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                            <span className="text-orange-500 font-black text-sm">🍔 Cardápio Direto</span>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Link exclusivo da loja para pedir na plataforma</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                            <span className="text-blue-500 font-black text-sm">⏰ Horário Real</span>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Avisa se está aberto ou fechado pelo seu painel</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleConnect}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Gerando QR Code no WhatsApp...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                                Conectar WhatsApp (Gerar QR Code)
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
