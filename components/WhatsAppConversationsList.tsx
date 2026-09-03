import React, { useState, useEffect, useCallback } from 'react';
import type { WhatsAppConversation, WhatsAppMessage } from '../types';
import { 
    getRestaurantConversations, 
    getConversationMessages, 
    sendWhatsAppMessage 
} from '../services/whatsappService';
import { useNotification } from '../hooks/useNotification';

interface WhatsAppConversationsListProps {
    restaurantId: number;
    restaurantName: string;
    isConnected: boolean;
}

export const WhatsAppConversationsList: React.FC<WhatsAppConversationsListProps> = ({
    restaurantId,
    restaurantName,
    isConnected,
}) => {
    const { addToast } = useNotification();
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
    const [replyText, setReplyText] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);

    // Carrega a lista de conversas
    const loadConversations = useCallback(async (silent = false) => {
        if (!restaurantId) return;
        if (!silent) setIsLoading(true);
        try {
            const data = await getRestaurantConversations(restaurantId);
            setConversations(data);
            if (selectedConversation) {
                const updated = data.find(c => c.id === selectedConversation.id);
                if (updated) setSelectedConversation(updated);
            }
        } catch (err) {
            console.error('Erro ao listar conversas:', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [restaurantId, selectedConversation]);

    // Carrega mensagens da conversa selecionada
    const loadMessages = useCallback(async (convId: string, silent = false) => {
        if (!convId) return;
        if (!silent) setIsLoadingMessages(true);
        try {
            const data = await getConversationMessages(convId);
            setMessages(data);
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
        } finally {
            if (!silent) setIsLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [restaurantId]);

    useEffect(() => {
        if (selectedConversation?.id) {
            loadMessages(selectedConversation.id);
        } else {
            setMessages([]);
        }
    }, [selectedConversation?.id, loadMessages]);

    // Envio de resposta rápida pelo restaurante
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedConversation || isSending) return;

        setIsSending(true);
        try {
            const textToSend = replyText.trim();
            const res = await sendWhatsAppMessage(
                restaurantId,
                selectedConversation.customerPhone,
                textToSend
            );

            if (res.success) {
                setReplyText('');
                addToast({ message: 'Mensagem enviada com sucesso!', type: 'success' });
                // Atualiza mensagens e conversas
                await loadMessages(selectedConversation.id, true);
                await loadConversations(true);
            } else {
                addToast({ 
                    message: res.error || 'Não foi possível enviar a mensagem. Verifique a conexão da Meta.', 
                    type: 'error' 
                });
            }
        } catch (err: any) {
            addToast({ message: err?.message || 'Erro ao enviar mensagem', type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            {/* Cabeçalho da seção */}
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/70">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        💬
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-800 tracking-tight flex items-center gap-2">
                            <span>Histórico de Conversas do WhatsApp</span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {conversations.length} conversas
                            </span>
                        </h3>
                        <p className="text-xs text-gray-500">
                            Mensagens recebidas e enviadas associadas exclusivamente a {restaurantName}.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            loadConversations();
                            if (selectedConversation) loadMessages(selectedConversation.id);
                        }}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                        <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Layout dividido: Lista de conversas + Detalhes/Chat */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
                {/* Coluna Esquerda: Lista de Conversas */}
                <div className="md:col-span-5 border-r border-gray-100 divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                    {isLoading && conversations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <span>Carregando conversas...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <span className="text-3xl block">📭</span>
                            <p className="text-xs font-bold text-gray-700">Nenhuma conversa registrada ainda</p>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Quando os clientes enviarem mensagens para o número oficial do WhatsApp deste restaurante, elas aparecerão aqui automaticamente.
                            </p>
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const isSelected = selectedConversation?.id === conv.id;
                            const formattedDate = conv.lastMessageAt 
                                ? new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : '';

                            return (
                                <button
                                    key={conv.id}
                                    type="button"
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 cursor-pointer ${
                                        isSelected 
                                            ? 'bg-emerald-50/80 border-l-4 border-emerald-500' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center flex-shrink-0 text-sm">
                                        {(conv.customerName || conv.customerPhone).slice(0, 2).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <span className="text-xs font-black text-gray-900 truncate">
                                                {conv.customerName || conv.customerPhone}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                                                {formattedDate}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-gray-500 font-mono truncate">
                                            {conv.customerPhone}
                                        </p>

                                        <p className="text-xs text-gray-600 truncate mt-1">
                                            {conv.lastMessage || 'Nova mensagem'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Coluna Direita: Mensagens da Conversa Selecionada */}
                <div className="md:col-span-7 flex flex-col justify-between bg-slate-50/50">
                    {selectedConversation ? (
                        <>
                            {/* Topo do Chat */}
                            <div className="p-3.5 bg-white border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                        {(selectedConversation.customerName || selectedConversation.customerPhone).slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-gray-900 block">
                                            {selectedConversation.customerName || selectedConversation.customerPhone}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {selectedConversation.customerPhone}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Canal Ativo
                                </span>
                            </div>

                            {/* Área de mensagens */}
                            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[340px]">
                                {isLoadingMessages ? (
                                    <div className="py-8 text-center text-xs text-gray-400">
                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <span>Carregando histórico...</span>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-gray-400">
                                        Nenhuma mensagem encontrada nesta conversa.
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isOutbound = msg.direction === 'outbound';
                                        const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        });

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
                                                        isOutbound
                                                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                                                            : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                                    <div className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                                                        isOutbound ? 'text-emerald-200' : 'text-gray-400'
                                                    }`}>
                                                        <span>{time}</span>
                                                        {isOutbound && <span>✓✓</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Formulário de Envio */}
                            <form 
                                onSubmit={handleSendMessage} 
                                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={
                                        isConnected 
                                            ? `Responder para ${selectedConversation.customerName || selectedConversation.customerPhone}...`
                                            : 'Conecte o WhatsApp para responder...'
                                    }
                                    disabled={!isConnected || isSending}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                                />

                                <button
                                    type="submit"
                                    disabled={!isConnected || !replyText.trim() || isSending}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                    {isSending ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Enviar</span>
                                            <span>➤</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                            <span className="text-4xl block mb-2 opacity-50">💬</span>
                            <p className="text-xs font-bold text-gray-600">Selecione uma conversa</p>
                            <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                                Clique em uma conversa à esquerda para visualizar as mensagens trocadas e responder ao cliente.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConversationsList;
