import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders } from '../services/orderService';
import { useAuth } from '../services/authService'; 
import type { Order } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';
import PrintableOrder from './PrintableOrder';
import { useSound } from '../hooks/useSound'; // Import Hook

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

const SpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

const BanknotesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
);


// Lazy load SalesDashboard to avoid heavy initial bundle
const SalesDashboard = React.lazy(() => import('./SalesDashboard'));
const CustomerList = React.lazy(() => import('./CustomerList'));

const OrderManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings' | 'financial' | 'customers'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    
    // State for Automatic Printing
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    
    // Hook de som
    const { playNotification, initAudioContext } = useSound();
    
    // Ref to track STATUS of orders, not just IDs. Map<OrderId, Status>
    const previousOrdersStatusRef = useRef<Map<string, string>>(new Map());
    const isFirstLoadRef = useRef(true);
    const [printerWidth, setPrinterWidth] = useState<number>(80);

    // Load printer width preference
    useEffect(() => {
        const savedWidth = localStorage.getItem('guarafood-printer-width');
        if (savedWidth) {
            setPrinterWidth(parseInt(savedWidth, 10));
        }
    }, []);

    // Initialize Audio Context on first user interaction
    const enableAudio = useCallback(() => {
        initAudioContext();
    }, [initAudioContext]);

    // Effect to trigger print when orderToPrint changes
    useEffect(() => {
        if (orderToPrint) {
            // A small delay to ensure React has flushed the PrintableOrder component to the DOM
            const timer = setTimeout(() => {
                window.print();
                setOrderToPrint(null); // Reset the state after printing is triggered
            }, 0); 
            return () => clearTimeout(timer);
        }
    }, [orderToPrint]);

    useEffect(() => {
        if (!currentUser?.restaurantId) return;

        // Subscribe to orders and handle notifications
        const unsubscribe = subscribeToOrders((allOrders) => {
            const areNotificationsEnabled = localStorage.getItem('guarafood-notifications-enabled') === 'true';

            // Create a map of current order statuses
            const currentStatusMap = new Map<string, string>();
            allOrders.forEach(o => currentStatusMap.set(o.id, o.status));

            // Only trigger effects if it's NOT the first load
            if (!isFirstLoadRef.current) {
                // Find orders that need alerting
                const ordersToAlert = allOrders.filter(order => {
                    const prevStatus = previousOrdersStatusRef.current.get(order.id);
                    
                    // Trigger if current status is 'Novo Pedido' AND
                    // (It is a brand new order OR It existed but status changed to 'Novo Pedido')
                    return order.status === 'Novo Pedido' && prevStatus !== 'Novo Pedido';
                });

                if (ordersToAlert.length > 0) {
                    const newestOrder = ordersToAlert[0];
                    console.log("Novo pedido (ou confirmação de pagamento) detectado:", newestOrder.id);
                    
                    // 1. Notification API (Visual)
                    if (areNotificationsEnabled && Notification.permission === 'granted') {
                         try {
                             new Notification('Novo Pedido Confirmado!', {
                                body: `Pedido #${newestOrder.id.substring(0,6)} - R$ ${newestOrder.totalPrice.toFixed(2)}`,
                                icon: '/vite.svg',
                                tag: newestOrder.id
                            });
                         } catch (e) {
                             console.error("Notification API error", e);
                         }
                    }
                    
                    // 2. Sound (Via Hook)
                    playNotification();

                    // 3. Auto Print
                    setOrderToPrint(newestOrder);
                }
            }

            // Update the Ref for next comparison
            previousOrdersStatusRef.current = currentStatusMap;
            setOrders(allOrders);
            isFirstLoadRef.current = false;

        }, currentUser.restaurantId);
        
        return () => unsubscribe();
    }, [currentUser, playNotification]);

    
    const renderContent = () => {
        switch (activeTab) {
            case 'orders':
                return <OrdersView orders={orders} printerWidth={printerWidth} />;
            case 'menu':
                return <MenuManagement />;
            case 'financial':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando módulo financeiro...</div>}>
                        <SalesDashboard />
                    </React.Suspense>
                );
            case 'customers':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando lista de clientes...</div>}>
                        <CustomerList orders={orders} />
                    </React.Suspense>
                );
            case 'settings':
                return <RestaurantSettings />;
            default:
                return null;
        }
    }
    
    return (
        <div className="w-full min-h-screen bg-gray-50" onClick={enableAudio} onTouchStart={enableAudio}>
            <div className="bg-orange-600 text-white text-center text-xs font-bold p-1 cursor-pointer" onClick={enableAudio}>
                <div className="flex items-center justify-center gap-2">
                    <SpeakerIcon className="w-4 h-4" />
                    Toque em qualquer lugar para ativar o som
                </div>
            </div>
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
                    {/* Reinserted Logout Button */}
                    <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors font-semibold flex-shrink-0" title="Sair">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>
             <div className="p-4 border-b sticky top-[89px] bg-gray-50 z-10 overflow-x-auto">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1 min-w-max">
                    <button 
                        onClick={() => setActiveTab('orders')} 
                        className={`px-4 py-2 text-center font-semibold rounded-md transition-colors ${activeTab === 'orders' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Pedidos
                    </button>
                    <button 
                        onClick={() => setActiveTab('menu')}
                         className={`px-4 py-2 text-center font-semibold rounded-md transition-colors ${activeTab === 'menu' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Cardápio
                    </button>
                    <button 
                        onClick={() => setActiveTab('financial')}
                         className={`px-4 py-2 text-center font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === 'financial' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        <BanknotesIcon className="w-4 h-4" />
                        Financeiro
                    </button>
                    <button 
                        onClick={() => setActiveTab('customers')}
                         className={`px-4 py-2 text-center font-semibold rounded-md transition-colors ${activeTab === 'customers' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Clientes
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                         className={`px-4 py-2 text-center font-semibold rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Configurações
                    </button>
                </div>
            </div>

            {renderContent()}

            {/* Hidden Area for Automatic Printing */}
            <div className="hidden">
                <div id="printable-order">
                    {orderToPrint && <PrintableOrder order={orderToPrint} printerWidth={printerWidth} />}
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;