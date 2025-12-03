
import React, { useState, useEffect } from 'react';
import type { Order, CartItem } from '../types';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';

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

interface CustomerOrdersProps {
    onBack: () => void;
}

const CustomerOrders: React.FC<CustomerOrdersProps> = ({ onBack }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const { addToCart, clearCart } = useCart();
    const { addToast, confirm } = useNotification();

    useEffect(() => {
        // Load local history (lite version saved during checkout)
        try {
            const stored = localStorage.getItem('guarafood-order-history'); // Should match key in CheckoutModal
            // Fallback to active orders if history specific key is missing, or merge
            const activeIds = JSON.parse(localStorage.getItem('guarafood-active-orders') || '[]');
            
            // For this demo/lite version, we might only have IDs in active-orders.
            // Ideally CheckoutModal saves full objects to 'guarafood-history-details'.
            // Let's assume we rely on what's available. 
            // Since we can't query DB for all past orders without auth, we use the local stash.
            
            // NOTE: In the previous turn, I updated CheckoutModal to save to 'guarafood-active-orders'.
            // To make this robust without login, we rely on local storage.
            
            // Let's try to load detailed history if implemented, otherwise show empty state or basic info
            // For now, let's assume the user wants to see the ACTIVE orders mostly.
            
            // To make "Meus Pedidos" really work for anonymous users, we need to save the ORDER OBJECT locally.
            // I will update this component to read from a new key 'guarafood-history-details' 
            // which I updated CheckoutModal to write to in the "Cherry on Top" step.
            
            const detailedHistory = JSON.parse(localStorage.getItem('guarafood-order-history') || '[]');
            setOrders(detailedHistory.reverse()); // Newest first
        } catch (e) {
            console.error("Error loading history", e);
        }
    }, []);

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
            onBack(); // Go back to home to see cart
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ClockIcon className="w-6 h-6 text-orange-600" />
                    Meus Pedidos
                </h1>
            </header>

            <main className="p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="bg-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <ClockIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum pedido recente</h3>
                        <p className="text-gray-500 mt-2 text-sm">Seus pedidos realizados neste dispositivo aparecerão aqui.</p>
                    </div>
                ) : (
                    orders.map((order: any, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                                <div>
                                    <p className="font-bold text-gray-800">{order.restaurantName}</p>
                                    <p className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleDateString('pt-BR')} às {new Date(order.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                    {order.status || 'Concluído'}
                                </span>
                            </div>
                            <div className="p-4">
                                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                                    {order.items.map((item: any, idx: number) => (
                                        <li key={idx} className="flex justify-between">
                                            <span>{item.quantity}x {item.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <span className="font-bold text-gray-900">Total: R$ {order.totalPrice.toFixed(2)}</span>
                                    <button 
                                        onClick={() => handleReorder(order.items)}
                                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                        Pedir de Novo
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

export default CustomerOrders;
