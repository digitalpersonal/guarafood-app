import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, WhatsAppConnection } from '../types';
import { 
    DEFAULT_GREETING_TEMPLATE, 
    getRestaurantMenuUrl, 
    formatGreetingMessage,
    saveWhatsAppGreetingConfig 
} from '../services/whatsappService';
import { getRestaurantOperatingStatus } from '../utils/restaurantTimeUtils';
import { useNotification } from '../hooks/useNotification';

interface WhatsAppGreetingSettingsProps {
    restaurant: Restaurant;
    connection: WhatsAppConnection | null;
    onUpdateConnection?: (updated: WhatsAppConnection) => void;
}

export const WhatsAppGreetingSettings: React.FC<WhatsAppGreetingSettingsProps> = ({
    restaurant,
    connection,
    onUpdateConnection,
}) => {
    const { addToast } = useNotification();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Estado da ativação da saudação automática
    const [isEnabled, setIsEnabled] = useState<boolean>(() => {
        if (connection?.greetingMessageEnabled !== undefined) {
            return connection.greetingMessageEnabled;
        }
        if (restaurant?.whatsappGreetingEnabled !== undefined) {
            return restaurant.whatsappGreetingEnabled;
        }
        return true;
    });

    // Se as respostas com link do menu só serão enviadas dentro do horário de funcionamento
    const [onlyDuringHours, setOnlyDuringHours] = useState<boolean>(() => {
        if (connection?.greetingOnlyDuringHours !== undefined) {
            return connection.greetingOnlyDuringHours;
        }
        if (restaurant?.whatsappGreetingOnlyDuringHours !== undefined) {
            return restaurant.whatsappGreetingOnlyDuringHours;
        }
        return true;
    });

    // Mensagem de saudação editável
    const [messageTemplate, setMessageTemplate] = useState<string>(() => {
        return connection?.greetingMessage || restaurant?.whatsappGreetingMessage || DEFAULT_GREETING_TEMPLATE;
    });

    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);
    const [isCopiedMessage, setIsCopiedMessage] = useState<boolean>(false);
    const [showWebhookGuide, setShowWebhookGuide] = useState<boolean>(false);

    // Nome fictício do cliente para testar a substituição de {nome_cliente} no preview
    const [sampleCustomerName, setSampleCustomerName] = useState<string>('João Silva');

    // Status de funcionamento em tempo real da loja
    const operatingStatus = useMemo(() => {
        return getRestaurantOperatingStatus(restaurant);
    }, [restaurant]);

    // Sincroniza com mudanças externas de props
    useEffect(() => {
        if (connection?.greetingMessageEnabled !== undefined) {
            setIsEnabled(connection.greetingMessageEnabled);
        }
        if (connection?.greetingOnlyDuringHours !== undefined) {
            setOnlyDuringHours(connection.greetingOnlyDuringHours);
        }
        if (connection?.greetingMessage) {
            setMessageTemplate(connection.greetingMessage);
        }
    }, [connection?.greetingMessageEnabled, connection?.greetingOnlyDuringHours, connection?.greetingMessage]);

    // URL direta do menu do restaurante (?r=ID)
    const menuUrl = useMemo(() => {
        return getRestaurantMenuUrl(restaurant.id);
    }, [restaurant.id]);

    // Mensagem final formatada em tempo real com os dados reais da loja e o nome do cliente de teste
    const formattedGreeting = useMemo(() => {
        return formatGreetingMessage(messageTemplate, restaurant, sampleCustomerName);
    }, [messageTemplate, restaurant, sampleCustomerName]);

    // Hora simulada para o balão do WhatsApp
    const currentTimeString = useMemo(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }, []);

    // Inserção rápida de tags dinâmicas no textarea
    const insertVariable = (tag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setMessageTemplate(prev => `${prev} ${tag}`);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const previousText = messageTemplate;
        const newText = previousText.substring(0, start) + tag + previousText.substring(end);
        
        setMessageTemplate(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + tag.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 10);
    };

    // Restaurar mensagem padrão
    const handleRestoreDefault = () => {
        setMessageTemplate(DEFAULT_GREETING_TEMPLATE);
        addToast({ message: 'Mensagem de saudação redefinida para o padrão!', type: 'info' });
    };

    // Copiar link do cardápio
    const handleCopyMenuLink = async () => {
        try {
            await navigator.clipboard.writeText(menuUrl);
            setIsCopiedLink(true);
            addToast({ message: 'Link do cardápio copiado para a área de transferência!', type: 'success' });
            setTimeout(() => setIsCopiedLink(false), 2500);
        } catch {
            addToast({ message: 'Não foi possível copiar o link automaticamente.', type: 'warning' });
        }
    };

    // Copiar texto da mensagem
    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(formattedGreeting);
            setIsCopiedMessage(true);
            addToast({ message: 'Texto da mensagem copiado!', type: 'success' });
            setTimeout(() => setIsCopiedMessage(false), 2500);
        } catch {
            addToast({ message: 'Falha ao copiar texto.', type: 'warning' });
        }
    };

    // Salvar configurações
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await saveWhatsAppGreetingConfig(
                restaurant.id,
                isEnabled,
                messageTemplate,
                onlyDuringHours
            );

            if (result.success) {
                addToast({ message: 'Configurações de saudação salvas com sucesso!', type: 'success' });
                
                if (onUpdateConnection && connection) {
                    onUpdateConnection({
                        ...connection,
                        greetingMessageEnabled: isEnabled,
                        greetingMessage: messageTemplate,
                        greetingOnlyDuringHours: onlyDuringHours,
                    });
                }
            } else {
                addToast({ message: result.error || 'Erro ao salvar saudação.', type: 'error' });
            }
        } catch (err: any) {
            console.error('[WhatsAppGreetingSettings] Erro ao salvar:', err);
            addToast({ message: 'Erro ao persistir alterações.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Testar envio no WhatsApp Web
    const handleTestInWhatsApp = () => {
        const textEncoded = encodeURIComponent(formattedGreeting);
        const url = `https://wa.me/?text=${textEncoded}`;
        window.open(url, '_blank');
    };

    const hasMenuLink = messageTemplate.includes('{link_cardapio}') || messageTemplate.includes('{link_menu}') || messageTemplate.includes('http');

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
            {/* CABEÇALHO DO MÓDULO */}
            <div className="p-6 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 text-2xl flex-shrink-0">
                        💬
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-black text-gray-900">
                                Mensagem Automática de Saudação
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                Resposta Automática
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
                            Responda automaticamente os clientes com uma mensagem amigável e o link direto para o cardápio do seu restaurante assim que eles mandarem um "Olá" no seu WhatsApp.
                        </p>
                    </div>
                </div>

                {/* INTERRUPTOR PRINCIPAL (TOGGLE) */}
                <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-2xl border border-gray-200 shadow-sm self-start sm:self-center">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                        {isEnabled ? 'Ativado' : 'Desativado'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                    </label>
                </div>
            </div>

            {/* BARRA DE REGRA DE HORÁRIO DE FUNCIONAMENTO */}
            <div className="mx-6 sm:mx-7 mt-6 p-4 rounded-2xl border transition-all duration-200 bg-gray-50/80 border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                            operatingStatus.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {operatingStatus.isOpen ? '🕒' : '🌙'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                                    Restringir respostas ao Horário de Funcionamento
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    operatingStatus.isOpen 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    {operatingStatus.isOpen ? '● Loja Aberta Agora' : '○ Loja Fechada Agora'} ({operatingStatus.currentTimeStr})
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                As respostas automáticas com o link do menu só serão enviadas aos clientes se o restaurante estiver aberto.
                                Horário hoje ({operatingStatus.dayName}): <strong className="text-gray-700">{operatingStatus.todayScheduleLabel}</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center bg-white p-2 px-3 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] font-bold text-gray-700">
                            {onlyDuringHours ? 'Apenas no Horário' : 'Qualquer Horário'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={onlyDuringHours}
                                onChange={(e) => setOnlyDuringHours(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                        </label>
                    </div>
                </div>

                {/* ALERTA VISUAL DO IMPACTO DO FILTRO DE HORÁRIO */}
                {onlyDuringHours && !operatingStatus.isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center gap-2 text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-xl">
                        <span className="text-sm">⏸️</span>
                        <span>
                            <strong>Pausa Ativa:</strong> Como o restaurante está fechado neste momento ({operatingStatus.currentTimeStr}), se um cliente mandar mensagem agora, o link do menu <strong>não será enviado</strong> até a reabertura da loja.
                        </span>
                    </div>
                )}
                {onlyDuringHours && operatingStatus.isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl">
                        <span className="text-sm">▶️</span>
                        <span>
                            <strong>Disparos Permitidos:</strong> O restaurante está dentro do horário de funcionamento ({operatingStatus.todayScheduleLabel}). Clientes que enviarem mensagens receberão a saudação com o link do cardápio imediatamente.
                        </span>
                    </div>
                )}
            </div>

            {/* AVISO SE O LINK DO CARDÁPIO FOI REMOVIDO */}
            {!hasMenuLink && (
                <div className="mx-6 sm:mx-7 mt-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                        <p className="font-bold">Atenção: A variável do cardápio não foi encontrada no texto!</p>
                        <p className="mt-0.5 leading-relaxed">
                            Recomendamos manter a tag <code>{'{link_menu}'}</code> para que seus clientes consigam abrir e pedir pelo cardápio online com um único clique.
                        </p>
                        <button
                            type="button"
                            onClick={() => insertVariable('{link_menu}')}
                            className="mt-2 text-xs font-black text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                            + Inserir {'{link_menu}'} Agora
                        </button>
                    </div>
                </div>
            )}

            {/* CORPO: EDITOR + PREVIEW */}
            <div className="p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUNA ESQUERDA: EDITOR DE TEXTO E VARIÁVEIS (7 COLUNAS) */}
                <div className="lg:col-span-7 space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                <span>Texto da Mensagem Personalizada</span>
                                <span className="text-gray-400 font-normal">({messageTemplate.length} caracteres)</span>
                            </label>

                            <button
                                type="button"
                                onClick={handleRestoreDefault}
                                className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
                            >
                                Restaurar Padrão
                            </button>
                        </div>

                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={messageTemplate}
                                onChange={(e) => setMessageTemplate(e.target.value)}
                                rows={8}
                                placeholder="Digite a mensagem de saudação do seu restaurante..."
                                className="w-full p-4 border-2 border-gray-200 rounded-2xl text-gray-900 focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none text-sm leading-relaxed transition-all font-sans"
                            />
                        </div>
                    </div>

                    {/* BOTÕES DE INSERÇÃO DE VARIÁVEIS DINÂMICAS */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 block">
                                Placeholders Suportados (Clique para inserir no texto):
                            </span>
                            <span className="text-[10px] text-gray-400">
                                Substituídos dinamicamente
                            </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {/* PLACEHOLDERS EXIGIDOS: {nome_cliente} e {link_menu} */}
                            <button
                                type="button"
                                onClick={() => insertVariable('{nome_cliente}')}
                                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                                title="Insere o nome do cliente que enviou a mensagem (ex: João)"
                            >
                                <span>👤</span>
                                <span>{'{nome_cliente}'}</span>
                                <span className="text-[9px] bg-blue-200 text-blue-900 px-1 rounded font-bold uppercase">Cliente</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => insertVariable('{link_menu}')}
                                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                                title="Insere o link público do menu deste restaurante"
                            >
                                <span>👉</span>
                                <span>{'{link_menu}'}</span>
                                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 rounded font-bold uppercase">Cardápio</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => insertVariable('{nome_restaurante}')}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Insere o nome do restaurante"
                            >
                                <span>🏪</span>
                                <span>{'{nome_restaurante}'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => insertVariable('{horario_funcionamento}')}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Insere o horário de funcionamento"
                            >
                                <span>🕒</span>
                                <span>{'{horario_funcionamento}'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => insertVariable('{telefone}')}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Insere o telefone do restaurante"
                            >
                                <span>📞</span>
                                <span>{'{telefone}'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => insertVariable('{endereco}')}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Insere o endereço do restaurante"
                            >
                                <span>📍</span>
                                <span>{'{endereco}'}</span>
                            </button>
                        </div>
                    </div>

                    {/* DICAS DE FORMATAÇÃO WHATSAPP */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-gray-700">Formatação do WhatsApp:</span>
                        <div className="flex items-center gap-3">
                            <span><code>*negrito*</code></span>
                            <span><code>_itálico_</code></span>
                            <span><code>~tachado~</code></span>
                            <span>Emojis permitidos 🎉</span>
                        </div>
                    </div>

                    {/* LINK DIRETO DO CARDÁPIO COM BOTÃO COPIAR */}
                    <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                                Link Oficial do Cardápio Online:
                            </span>
                            <p className="text-xs font-mono text-emerald-950 truncate font-semibold">
                                {menuUrl}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyMenuLink}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer flex items-center gap-1"
                        >
                            <span>{isCopiedLink ? '✓ Copiado!' : 'Copiar Link'}</span>
                        </button>
                    </div>

                    {/* BOTÕES DE AÇÃO: SALVAR E TESTAR */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Salvando Configurações...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                                    </svg>
                                    <span>Salvar Configurações de Saudação</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleTestInWhatsApp}
                            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Abre o WhatsApp para você testar como a mensagem chega"
                        >
                            <span>📱</span>
                            <span>Testar no WhatsApp</span>
                        </button>
                    </div>
                </div>

                {/* COLUNA DIREITA: SIMULADOR VISUAL DO WHATSAPP (5 COLUNAS) */}
                <div className="lg:col-span-5 flex flex-col items-center">

                    {/* CAMPO DE TESTE DO PLACEHOLDER {nome_cliente} */}
                    <div className="w-full max-w-sm mb-3 bg-white border border-gray-200 rounded-2xl p-2.5 px-3.5 flex items-center gap-2.5 shadow-sm">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            👤
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-600 block">
                                    Simular Nome ({'{nome_cliente}'}):
                                </label>
                                <span className="text-[9px] text-blue-600 font-bold">Prévia ao vivo</span>
                            </div>
                            <input
                                type="text"
                                value={sampleCustomerName}
                                onChange={(e) => setSampleCustomerName(e.target.value)}
                                placeholder="Ex: Mariana Silva"
                                className="w-full mt-0.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-800 font-bold focus:bg-white focus:outline-none focus:border-[#25D366] transition-all"
                            />
                        </div>
                    </div>

                    <div className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-gray-800 shadow-xl bg-[#E5DDD5]">
                        
                        {/* TOPO DO SMARTPHONE / HEADER WHATSAPP */}
                        <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center border border-white/30 text-base">
                                    {restaurant.imageUrl ? (
                                        <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                                    ) : (
                                        '🍽️'
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold truncate max-w-[170px] leading-tight">
                                        {restaurant.name}
                                    </h4>
                                    <span className="text-[10px] text-emerald-200 block font-normal leading-tight">
                                        online agora
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-white/80 text-sm">
                                <span>📞</span>
                                <span>⋮</span>
                            </div>
                        </div>

                        {/* ÁREA DO CHAT COM FUNDO CLÁSSICO DO WHATSAPP */}
                        <div className="p-4 space-y-3 min-h-[360px] max-h-[460px] overflow-y-auto text-xs">
                            
                            {/* DATA CENTRALIZADA */}
                            <div className="text-center">
                                <span className="bg-white/70 text-gray-600 text-[10px] px-2.5 py-1 rounded-full shadow-sm font-medium">
                                    HOJE
                                </span>
                            </div>

                            {/* MENSAGEM DO CLIENTE (CINZA/BRANCO À ESQUERDA) */}
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[85%] text-gray-800 text-[11px] space-y-1">
                                    <p>Olá! Sou {sampleCustomerName || 'Cliente'}, gostaria de ver o cardápio e saber se vocês estão abertos hoje! 👋</p>
                                    <div className="text-right">
                                        <span className="text-[9px] text-gray-400">{currentTimeString}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ALERTA SE A RESPOSTA ESTIVER PAUSADA POR HORÁRIO */}
                            {onlyDuringHours && !operatingStatus.isOpen ? (
                                <div className="my-2 p-3 bg-amber-100/90 border border-amber-300 rounded-2xl text-[11px] text-amber-950 text-center shadow-xs">
                                    <span className="font-bold block text-amber-900">⏸️ Fora do Horário de Funcionamento</span>
                                    <span className="text-[10px] text-amber-800 mt-0.5 block leading-tight">
                                        Como a loja está fechada ({operatingStatus.currentTimeStr}), o link do menu não é disparado automaticamente.
                                    </span>
                                </div>
                            ) : (
                                /* RESPOSTA AUTOMÁTICA DO RESTAURANTE (VERDE WHATSAPP À DIREITA) */
                                <div className="flex justify-end">
                                    <div className="bg-[#D9FDD3] rounded-2xl rounded-tr-none p-3 shadow-sm max-w-[90%] text-gray-900 text-[11px] space-y-2 border border-emerald-200/50">
                                        
                                        {/* TEXTO FORMATADO COM QUEBRAS DE LINHA */}
                                        <div className="whitespace-pre-wrap leading-relaxed">
                                            {formattedGreeting}
                                        </div>

                                        {/* CARD PREVIEW DO LINK DO CARDÁPIO (SIMULAÇÃO DO PREVIEW DA META) */}
                                        <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-200/60 shadow-xs flex items-center gap-2 mt-1">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0">
                                                📋
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-[11px] text-gray-900 truncate">
                                                    Cardápio - {restaurant.name}
                                                </p>
                                                <p className="text-[10px] text-emerald-800 truncate underline">
                                                    {menuUrl}
                                                </p>
                                            </div>
                                        </div>

                                        {/* HORA E TIQUE DUPLO AZUL */}
                                        <div className="flex items-center justify-end gap-1 text-[9px] text-gray-500 pt-0.5">
                                            <span>{currentTimeString}</span>
                                            <span className="text-[#34B7F1] font-black">✓✓</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ DO PREVIEW */}
                        <div className="bg-white p-2.5 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                            <span className="truncate">Visualização em tempo real</span>
                            <button
                                type="button"
                                onClick={handleCopyMessage}
                                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
                            >
                                <span>{isCopiedMessage ? '✓ Copiado' : 'Copiar Texto'}</span>
                            </button>
                        </div>
                    </div>

                    <span className="text-[10px] text-gray-400 mt-2 text-center block">
                        Os clientes receberão esta resposta formatada no celular deles dentro do expediente.
                    </span>
                </div>
            </div>

            {/* SEÇÃO INFORMATIVA: COMO FUNCIONA O WEBHOOK AUTOMÁTICO */}
            <div className="p-6 sm:p-7 border-t border-gray-100 bg-gray-50/70">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">⚙️</span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                            Integração de Webhook da Meta Cloud API
                        </h4>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowWebhookGuide(prev => !prev)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                        {showWebhookGuide ? 'Ocultar Detalhes' : 'Ver Dados do Webhook'}
                    </button>
                </div>

                {showWebhookGuide && (
                    <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-3 animate-in fade-in duration-200">
                        <p className="leading-relaxed">
                            Para que a resposta de saudação seja disparada automaticamente no exato milissegundo em que o cliente enviar uma mensagem, configure o webhook no painel de desenvolvedores da Meta:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-[10px] uppercase font-black text-gray-500 block mb-1">URL de Retorno de Chamada (Callback URL)</span>
                                <code className="text-emerald-800 font-mono text-[11px] break-all select-all block">
                                    https://xfousvlrhinlvrpryscy.supabase.co/functions/v1/whatsapp-webhook
                                </code>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-[10px] uppercase font-black text-gray-500 block mb-1">Token de Verificação (Verify Token)</span>
                                <code className="text-emerald-800 font-mono text-[11px] font-bold select-all block">
                                    guarafood_whatsapp_webhook_token_2026
                                </code>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-500 leading-relaxed pt-1">
                            Campo do Webhook a assinar: <strong>messages</strong> (notifica quando clientes enviam mensagens para o número). O sistema valida se o restaurante está dentro do horário de funcionamento antes de disparar o link do cardápio.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppGreetingSettings;
