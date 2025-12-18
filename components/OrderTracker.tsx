
import React, { useState, useEffect, useCallback } from 'react';
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
    'Novo Pedido': 'Recebido',
    'Preparando': 'Preparando',
    'A Caminho': 'Saiu para Entrega',
    'Entregue': 'Entregue',
    'Cancelado': 'Cancelado'
};

const OrderTracker: React.FC = () => {
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    
    const { playNotification, initAudioContext } = useSound();

    const loadOrders = useCallback(async () => {
        try {
            const storedOrderIds = JSON.parse(localStorage.getItem('guarafood-active-orders') || '[]');
            if (storedOrderIds.length === 0) {
                setActiveOrders([]);
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('id, status, restaurant_name, total_price, timestamp')
                .in('id', storedOrderIds)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            if (data) {
                const ongoing = data.filter(o => o.status !== 'Entregue' && o.status !== 'Cancelado');
                setActiveOrders(ongoing);
                
                if (ongoing.length > 0 && activeOrders.length === 0) {
                    setShowTooltip(true);
                    setTimeout(() => setShowTooltip(false), 8000); 
                }
            }
        } catch (err) {
            console.error("Failed to load active orders:", err);
        }
    }, [activeOrders.length]);

    useEffect(() => {
        loadOrders();

        // Escuta o evento global para atualizar na hora que o checkout fecha ou confirma
        window.addEventListener('guarafood:update-orders', loadOrders);
        
        // Inscrição em tempo real para mudanças de status
        const subscription = supabase
            .channel('public:orders:tracker')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updatedOrder = payload.new;
                const storedOrderIds = JSON.parse(localStorage.getItem('guarafood-active-orders') || '[]');
                
                if (storedOrderIds.includes(updatedOrder.id)) {
                    setActiveOrders(prev => {
                        const exists = prev.find(o => o.id === updatedOrder.id);
                        if (!exists) return prev;
                        
                        if (exists.status !== updatedOrder.status) {
                            playNotification();
                            if (updatedOrder.status === 'Entregue' || updatedOrder.status === 'Cancelado') {
                                 return prev.filter(o => o.id !== updatedOrder.id);
                            }
                        }
                        return prev.map(o => o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o);
                    });
                }
            })
            .subscribe();

        return () => {
            window.removeEventListener('guarafood:update-orders', loadOrders);
            supabase.removeChannel(subscription);
        };
    }, [loadOrders, playNotification]);

    if (activeOrders.length === 0) return null;

    const mainOrder = activeOrders[0];
    const currentStep = statusSteps[mainOrder.status] ?? 1;
    const progress = currentStep === 0 ? 5 : (currentStep / 4) * 100;
    const isPending = mainOrder.status === 'Aguardando Pagamento';

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 pointer-events-none" 
            onClick={initAudioContext}
            onTouchStart={initAudioContext}
        >
            <div className="relative max-w-md mx-auto pointer-events-auto">
                {showTooltip && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full shadow-lg animate-bounce">
                        Acompanhe seu pedido aqui!
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-[0_-5px_30px_-5px_rgba(0,0,0,0.4)] border border-orange-100 overflow-hidden">
                    <div 
                        className={`p-3 flex items-center justify-between cursor-pointer ${isPending ? 'bg-yellow-50' : 'bg-orange-50'}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isPending ? 'bg-yellow-200 text-yellow-700' : 'bg-orange-100 text-orange-600'}`}>
                                {isPending ? <ClockIcon className="w-6 h-6" /> : <MotorcycleIcon className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 leading-tight">Pedido em andamento</p>
                                <p className={`text-xs font-semibold ${isPending ? 'text-yellow-700' : 'text-orange-600'}`}>
                                    {statusLabels[mainOrder.status] || mainOrder.status}
                                </p>
                            </div>
                        </div>
                        <button className="text-gray-400 p-1">
                            {isExpanded ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronUpIcon className="w-5 h-5"/>}
                        </button>
                    </div>

                    <div className="h-1.5 w-full bg-gray-200">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out ${isPending ? 'bg-yellow-500' : 'bg-orange-500'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    {isExpanded && (
                        <div className="p-4 bg-white space-y-4 animate-fadeIn">
                            <div className="flex justify-between items-center text-sm text-gray-600 border-b pb-2">
                                <span className="font-bold text-gray-800">{mainOrder.restaurant_name}</span>
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">#{mainOrder.id.substring(0, 6)}</span>
                            </div>
                            
                            <div className="px-2">
                                <div className="flex justify-between items-center relative">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>
                                    {[1, 2, 3, 4].map((step) => {
                                        const isCompleted = step <= currentStep && !isPending;
                                        const isCurrent = step === currentStep && !isPending;
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-1 bg-white px-1">
                                                <div className={`w-3 h-3 rounded-full border-2 ${isCompleted ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'} ${isCurrent ? 'ring-2 ring-orange-200' : ''}`}></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[9px] text-gray-500 font-bold mt-2 uppercase">
                                    <span>Recebido</span>
                                    <span>Preparo</span>
                                    <span>Entrega</span>
                                    <span>Fim</span>
                                </div>
                            </div>
                            
                            {isPending && (
                                <div className="text-center text-[10px] text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-100 font-bold">
                                    Aguardando confirmação do pagamento...
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center text-xs pt-2 border-t text-gray-500">
                                <span>Total</span>
                                <span className="font-bold text-gray-900">R$ {Number(mainOrder.total_price).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTracker;
