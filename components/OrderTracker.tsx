
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/api';
import { useSound } from '../hooks/useSound';

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
);
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
);
const MotorcycleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.42 24.42 0 010 3.46" />
    </svg>
);
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const statusSteps: Record<string, number> = {
    'Aguardando Pagamento': 0,
    'Novo Pedido': 1,
    'Preparando': 2,
    'A Caminho': 3,
    'Entregue': 4,
    'Cancelado': 0
};

const statusLabels: Record<string, string> = {
    'Aguardando Pagamento': 'Aguardando Pagamento',
    'Novo Pedido': 'Pedido Recebido',
    'Preparando': 'Sendo Preparado',
    'A Caminho': 'Saiu para Entrega',
    'Entregue': 'Pedido Entregue',
    'Cancelado': 'Cancelado'
};

const OrderTracker: React.FC = () => {
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const previousOrderCountRef = useRef(0);
    const pollingIntervalRef = useRef<number | null>(null);
    
    const { playNotification, initAudioContext } = useSound();

    const loadOrders = useCallback(async () => {
        try {
            const storedOrderIds = JSON.parse(localStorage.getItem('guarafood-active-orders') || '[]');
            if (storedOrderIds.length === 0) {
                setActiveOrders([]);
                previousOrderCountRef.current = 0;
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, status, restaurant_name, total_price, timestamp')
                .in('id', storedOrderIds)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            if (data) {
                const ongoing = data.filter(o => o.status !== 'Entregue' && o.status !== 'Cancelado');
                
                // Se houver novos pedidos ativos ou mudanças, tocamos a notificação
                if (ongoing.length > 0) {
                    const hasStatusChanged = ongoing.some(current => {
                        const prev = activeOrders.find(o => o.id === current.id);
                        return prev && prev.status !== current.status;
                    });

                    if (hasStatusChanged || (ongoing.length > previousOrderCountRef.current)) {
                        playNotification();
                    }
                }

                setActiveOrders(ongoing);
                previousOrderCountRef.current = ongoing.length;
            }
        } catch (err) {
            console.error("Tracker Load Error:", err);
        }
    }, [playNotification, activeOrders]);

    useEffect(() => {
        loadOrders();
        
        // Listener infalível para abertura via Handshake (Checkout -> Tracker)
        // Garantido em Android e iOS
        const handleHandshake = () => {
            loadOrders(); // Força recarga imediata via HTTP para evitar delay do WebSocket
            setIsExpanded(true); // Abre o tracker automaticamente
            setShowTooltip(true); // Mostra balão de ajuda visual
            setTimeout(() => setShowTooltip(false), 12000); 
        };

        window.addEventListener('guarafood:update-orders', loadOrders);
        window.addEventListener('guarafood:open-tracker', handleHandshake);
        
        // REDUNDÂNCIA MÁXIMA PARA MOBILE: Polling de segurança
        // Se o WebSocket do Supabase cair no 4G, o sistema busca o status via HTTP a cada 30s
        pollingIntervalRef.current = window.setInterval(loadOrders, 30000);

        // Realtime Subscription (WebSocket)
        const subscription = supabase
            .channel('public:orders:customer_tracker')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updatedOrder = payload.new;
                const storedOrderIds = JSON.parse(localStorage.getItem('guarafood-active-orders') || '[]');
                
                if (storedOrderIds.includes(updatedOrder.id)) {
                    loadOrders(); // Recarrega tudo para garantir consistência visual
                }
            })
            .subscribe();

        return () => {
            window.removeEventListener('guarafood:update-orders', loadOrders);
            window.removeEventListener('guarafood:open-tracker', handleHandshake);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            supabase.removeChannel(subscription);
        };
    }, [loadOrders]);

    if (activeOrders.length === 0) return null;

    const mainOrder = activeOrders[0];
    const currentStep = statusSteps[mainOrder.status] ?? 1;
    const progress = currentStep === 0 ? 5 : (currentStep / 4) * 100;
    const isPending = mainOrder.status === 'Aguardando Pagamento';

    const displayOrderNum = mainOrder.order_number 
        ? `#${String(mainOrder.order_number).padStart(3, '0')}`
        : `#${mainOrder.id.substring(mainOrder.id.length - 4).toUpperCase()}`;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pb-safe pointer-events-none">
            <div 
                className="relative max-w-md mx-auto pointer-events-auto"
                onClick={initAudioContext}
            >
                {/* Balão de Destaque Visual (Sinalizador Inteligente) */}
                {showTooltip && (
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black py-2.5 px-5 rounded-2xl shadow-2xl animate-bounce z-20 whitespace-nowrap border-2 border-white">
                        <span className="mr-1">📱</span> Rastreie o seu pedido por aqui!
                        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45 border-r-2 border-b-2 border-white"></div>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-[0_-10px_50px_-5px_rgba(0,0,0,0.4)] border border-orange-100 overflow-hidden transition-all duration-500 ease-in-out">
                    <div 
                        className={`p-4 flex items-center justify-between cursor-pointer ${isPending ? 'bg-yellow-50' : 'bg-orange-50'} hover:bg-white active:scale-[0.98] transition-all`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${isPending ? 'bg-yellow-200 text-yellow-700' : 'bg-orange-100 text-orange-600'} shadow-inner border border-white`}>
                                {isPending ? <ClockIcon className="w-6 h-6" /> : <MotorcycleIcon className="w-6 h-6 animate-pulse" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Rastreamento Ativo</p>
                                <p className={`text-sm font-black uppercase tracking-tight ${isPending ? 'text-yellow-700' : 'text-orange-600'}`}>
                                    {statusLabels[mainOrder.status] || mainOrder.status}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {!isExpanded && (
                                <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                                    Ver Detalhes
                                </span>
                             )}
                             <button className="text-gray-400 p-1 bg-gray-50 rounded-full border">
                                {isExpanded ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronUpIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>

                    {/* Barra de Progresso Blindada */}
                    <div className="h-2 w-full bg-gray-200 relative">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(234,88,12,0.4)] ${isPending ? 'bg-yellow-500' : 'bg-orange-600'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    {isExpanded && (
                        <div className="p-6 bg-white space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center text-sm text-gray-600 border-b pb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Restaurante</span>
                                    <span className="font-black text-gray-900 uppercase tracking-tight truncate max-w-[220px]">{mainOrder.restaurant_name}</span>
                                </div>
                                <span className="font-mono bg-gray-900 text-white font-black px-3 py-1.5 rounded-xl shadow-lg text-xs">{displayOrderNum}</span>
                            </div>
                            
                            <div className="px-1">
                                <div className="flex justify-between items-center relative">
                                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2"></div>
                                    {[1, 2, 3, 4].map((step) => {
                                        const isCompleted = step <= currentStep && !isPending;
                                        const isCurrent = step === currentStep && !isPending;
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-1 bg-white px-2 relative">
                                                <div className={`w-5 h-5 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${isCompleted ? 'bg-orange-600 border-orange-600 scale-110 shadow-md' : 'bg-white border-gray-200'} ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}>
                                                    {isCompleted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[9px] text-gray-400 font-black mt-4 uppercase tracking-widest">
                                    <span className={currentStep >= 1 ? 'text-orange-600' : ''}>Recebido</span>
                                    <span className={currentStep >= 2 ? 'text-orange-600' : ''}>Preparo</span>
                                    <span className={currentStep >= 3 ? 'text-orange-600' : ''}>Entrega</span>
                                    <span className={currentStep >= 4 ? 'text-orange-600' : ''}>Fim</span>
                                </div>
                            </div>
                            
                            {isPending ? (
                                <div className="text-center text-[10px] text-yellow-800 bg-yellow-100/50 p-4 rounded-2xl border border-yellow-200 font-bold animate-pulse">
                                    ⏳ Aguardando confirmação do pagamento pelo banco...
                                </div>
                            ) : (
                                <div className="text-center text-[9px] text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                    Conexão Segura Ativa: Acompanhando em Tempo Real
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center text-xs pt-4 border-t border-gray-50 text-gray-500 font-bold">
                                <span>Total do Pedido</span>
                                <span className="font-black text-gray-900 text-lg">R$ {Number(mainOrder.total_price).toFixed(2)}</span>
                            </div>
                            
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="w-full py-3 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-gray-500 transition-colors bg-gray-50 rounded-xl"
                            >
                                Minimizar Painel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTracker;
