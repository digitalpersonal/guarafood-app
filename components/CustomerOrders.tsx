
import React, { useState, useEffect, useMemo } from 'react';
import type { Order, CartItem } from '../types';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import OptimizedImage from './OptimizedImage';
import { supabase } from '../services/api';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

interface CustomerOrdersProps {
    onBack: () => void;
}

const CustomerOrders: React.FC<CustomerOrdersProps> = ({ onBack }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
    const { addToCart, clearCart } = useCart();
    const { addToast, confirm } = useNotification();

    useEffect(() => {
        // 1. Carregar histórico inicial do LocalStorage
        const loadInitialHistory = () => {
            try {
                const storedHistory = JSON.parse(localStorage.getItem('guarafood-order-history') || '[]');
                const sorted = storedHistory.sort((a: Order, b: Order) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setOrders(sorted);
                return sorted;
            } catch (e) {
                console.error("Error loading history", e);
                return [];
            }
        };

        const initialOrders = loadInitialHistory();

        // 2. Configurar Realtime para atualizar os status
        const channel = supabase.channel('customer-orders-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    const updatedOrder = payload.new as Order;
                    
                    setOrders(prevOrders => {
                        const orderExists = prevOrders.some(o => o.id === updatedOrder.id);
                        
                        if (orderExists) {
                            const newOrders = prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
                            localStorage.setItem('guarafood-order-history', JSON.stringify(newOrders));
                            return newOrders;
                        }
                        return prevOrders;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const isOngoing = ['Novo Pedido', 'Preparando', 'A Caminho', 'Aguardando Pagamento'].includes(order.status);
            return activeTab === 'ongoing' ? isOngoing : !isOngoing;
        });
    }, [orders, activeTab]);

    const handleReorder = async (orderItems: CartItem[]) => {
        const confirmed = await confirm({
            title: 'Repetir Pedido',
            message: 'Isso irá substituir os itens atuais do seu carrinho. Deseja continuar?',
            confirmText: 'Sim, substituir',
            cancelText: 'Cancelar'
        });

        if (confirmed) {
            clearCart();
            orderItems.forEach(item => addToCart(item));
            addToast({ message: 'Itens adicionados ao carrinho!', type: 'success' });
            onBack(); 
        }
    };

    const handleClearHistory = async () => {
        const confirmed = await confirm({
            title: 'Limpar Histórico',
            message: 'Isso apagará a lista de pedidos do seu dispositivo. O histórico no restaurante não será afetado.',
            confirmText: 'Limpar',
            cancelText: 'Cancelar',
            isDestructive: true
        });

        if (confirmed) {
            localStorage.removeItem('guarafood-order-history');
            localStorage.removeItem('guarafood-active-orders');
            setOrders([]);
            addToast({ message: 'Histórico limpo com sucesso!', type: 'success' });
        }
    };

    const handleHelp = (order: Order) => {
        const phone = order.restaurantPhone?.replace(/\D/g, '');
        if (!phone) return;
        const message = `Olá, gostaria de falar sobre o pedido #${order.id.substring(0, 6)} feito pelo app.`;
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Novo Pedido': return 'bg-blue-100 text-blue-800';
            case 'Preparando': return 'bg-yellow-100 text-yellow-800';
            case 'A Caminho': return 'bg-orange-100 text-orange-800';
            case 'Entregue': return 'bg-green-100 text-green-800';
            case 'Cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Meus Pedidos
                        </h1>
                    </div>
                    {orders.length > 0 && (
                        <button 
                            onClick={handleClearHistory}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Limpar Histórico"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('ongoing')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                            activeTab === 'ongoing' 
                                ? 'bg-white text-orange-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Em Andamento
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                            activeTab === 'history' 
                                ? 'bg-white text-orange-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Histórico
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center">
                        <div className="bg-gray-200 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                            <ClockIcon className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">Nada por aqui</h3>
                        <p className="text-gray-500 mt-2 text-sm max-w-xs">
                            {activeTab === 'ongoing' 
                                ? "Você não tem pedidos em andamento no momento." 
                                : "Seus pedidos anteriores aparecerão aqui."}
                        </p>
                        {activeTab === 'ongoing' && (
                            <button 
                                onClick={onBack}
                                className="mt-6 bg-orange-600 text-white font-bold py-2 px-6 rounded-full hover:bg-orange-700 transition-colors"
                            >
                                Fazer um Pedido
                            </button>
                        )}
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const safeRestaurantName = order.restaurantName || 'Restaurante';
                        // PROTEÇÃO CONTRA VALOR NULO (toFixed error fix)
                        const safePrice = Number(order.totalPrice || 0).toFixed(2);
                        
                        return (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg flex-shrink-0">
                                            {safeRestaurantName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 leading-tight">{safeRestaurantName}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                #{order.id.substring(0, 6)} • {new Date(order.timestamp).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="p-4">
                                    <ul className="text-sm text-gray-600 space-y-1 mb-3">
                                        {(order.items || []).slice(0, 3).map((item, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <span className="font-bold text-gray-400 w-4">{item.quantity}x</span>
                                                <span className="truncate">{item.name}</span>
                                            </li>
                                        ))}
                                        {order.items && order.items.length > 3 && (
                                            <li className="text-xs text-gray-400 pl-6">+ mais {order.items.length - 3} itens</li>
                                        )}
                                    </ul>
                                    
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Total</span>
                                        <span className="font-bold text-gray-900 text-lg">R$ {safePrice}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
                                    <button 
                                        onClick={() => handleHelp(order)}
                                        className="py-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                        Ajuda
                                    </button>
                                    <button 
                                        onClick={() => handleReorder(order.items || [])}
                                        className="py-3 flex items-center justify-center gap-2 text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                        Repetir
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
};

export default CustomerOrders;
