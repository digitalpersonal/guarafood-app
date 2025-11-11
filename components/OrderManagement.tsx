
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders } from '../services/orderService';
import { useAuth } from '../services/authService';
import type { Order } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';

// Reusable Icons
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);


const OrderManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const previousOrderIdsRef = useRef<Set<string>>(new Set());
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playNotificationSound = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    }, []);

    useEffect(() => {
        if (!currentUser?.restaurantId) return;

        // Subscribe to orders and handle notifications
        const unsubscribe = subscribeToOrders((allOrders) => {
            const areNotificationsEnabled = localStorage.getItem('guarafood-notifications-enabled') === 'true' && Notification.permission === 'granted';

            if (areNotificationsEnabled && document.hidden) { // Only notify if tab is not active
                const newOrders = allOrders.filter(order => 
                    order.status === 'Novo Pedido' && !previousOrderIdsRef.current.has(order.id)
                );

                if (newOrders.length > 0) {
                    const newestOrder = newOrders[0];
                    new Notification('Novo Pedido Recebido!', {
                        body: `Cliente: ${newestOrder.customerName} - Total: R$ ${newestOrder.totalPrice.toFixed(2)}`,
                        icon: '/vite.svg',
                        tag: newestOrder.id
                    });
                    playNotificationSound();
                }
            }

            previousOrderIdsRef.current = new Set(allOrders.map(o => o.id));
            setOrders(allOrders);
        }, currentUser.restaurantId);
        
        return () => unsubscribe();
    }, [currentUser, playNotificationSound]);

    
    const renderContent = () => {
        switch (activeTab) {
            case 'orders':
                return <OrdersView orders={orders} />;
            case 'menu':
                return <MenuManagement />;
            case 'settings':
                return <RestaurantSettings />;
            default:
                return null;
        }
    }
    
    return (
        <div className="w-full min-h-screen bg-gray-50">
            <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center space-x-4 flex-grow min-w-0">
                        <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                            <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                           Painel: {currentUser?.name || 'Restaurante'}
                        </h1>
                    </div>
                    <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors font-semibold flex-shrink-0" title="Sair">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>
             <div className="p-4 border-b sticky top-[89px] bg-gray-50 z-10">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1">
                    <button 
                        onClick={() => setActiveTab('orders')} 
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'orders' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Pedidos
                    </button>
                    <button 
                        onClick={() => setActiveTab('menu')}
                         className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'menu' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Cardápio
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                         className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Configurações
                    </button>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default OrderManagement;