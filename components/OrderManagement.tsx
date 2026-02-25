
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders, fetchOrders } from '../services/orderService';
import { useAuth } from '../services/authService'; 
import { fetchRestaurantByIdSecure } from '../services/databaseService';
import type { Order } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';
import PrintableOrder from './PrintableOrder';
import DebtManager from './DebtManager';
import TableManagement from './TableManagement';
import { useSound } from '../hooks/useSound';

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

const SalesDashboard = React.lazy(() => import('./SalesDashboard'));
const CustomerList = React.lazy(() => import('./CustomerList'));

const OrderManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'menu' | 'settings' | 'financial' | 'customers' | 'debt'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING'>('CONNECTED');
    const { playNotification, initAudioContext } = useSound();
    
    const lastSuccessfulSyncRef = useRef<number>(Date.now());
    const previousOrdersStatusRef = useRef<Map<string, string>>(new Map());
    const isFirstLoadRef = useRef(true);
    const printedOrderIdsRef = useRef<Set<string>>(new Set());
    const heartbeatIntervalRef = useRef<number | null>(null);
    const reconnectGraceTimeoutRef = useRef<number | null>(null);

    const [printerWidth, setPrinterWidth] = useState<number>(80);

    // Carrega configuração de impressora do Banco de Dados para garantir consistência total (Jerê/Renovação)
    useEffect(() => {
        if (!currentUser?.restaurantId) return;
        
        const loadConfig = async () => {
            try {
                const rest = await fetchRestaurantByIdSecure(currentUser.restaurantId);
                if (rest && rest.printerWidth) {
                    setPrinterWidth(rest.printerWidth);
                    localStorage.setItem('guarafood-printer-width', rest.printerWidth.toString());
                } else {
                    const saved = localStorage.getItem('guarafood-printer-width');
                    if (saved) setPrinterWidth(parseInt(saved, 10));
                }
            } catch (e) {
                const saved = localStorage.getItem('guarafood-printer-width');
                if (saved) setPrinterWidth(parseInt(saved, 10));
            }
        };
        loadConfig();
    }, [currentUser, activeTab]);

    const processOrdersUpdate = useCallback((allOrders: Order[]) => {
        // Force notifications enabled by default
        const areNotificationsEnabled = true; // localStorage.getItem('guarafood-notifications-enabled') === 'true';
        
        const currentStatusMap = new Map<string, string>();
        allOrders.forEach(o => currentStatusMap.set(o.id, o.status));

        const visibleOrders = allOrders.filter(o => o.status !== 'Aguardando Pagamento');

        if (!isFirstLoadRef.current) {
            const ordersToAlert = visibleOrders.filter(order => {
                const prevStatus = previousOrdersStatusRef.current.get(order.id);
                return order.status === 'Novo Pedido' && prevStatus !== 'Novo Pedido';
            });

            if (ordersToAlert.length > 0) {
                const newestOrder = ordersToAlert[0];
                if (areNotificationsEnabled && Notification.permission === 'granted') {
                     try {
                         new Notification('Novo Pedido!', {
                            body: `Pedido ${newestOrder.order_number || ''} - R$ ${newestOrder.totalPrice.toFixed(2)}`,
                            icon: '/vite.svg',
                            tag: newestOrder.id
                        });
                     } catch (e) { console.error("Notification API error", e); }
                    playNotification(); 
                }
                setOrderToPrint(newestOrder);
            }
        }

        previousOrdersStatusRef.current = currentStatusMap;
        setOrders(visibleOrders);
        isFirstLoadRef.current = false;
        lastSuccessfulSyncRef.current = Date.now();
    }, [playNotification]);

    const forceSync = useCallback(async () => {
        if (!currentUser?.restaurantId) return;
        try {
            const allOrders = await fetchOrders(currentUser.restaurantId, { limit: 200 });
            processOrdersUpdate(allOrders);
            lastSuccessfulSyncRef.current = Date.now();
            setConnectionStatus('CONNECTED');
        } catch (e) {
            console.warn("Sync failed, retrying silently...");
        }
    }, [currentUser?.restaurantId, processOrdersUpdate]);

    useEffect(() => {
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try { 
                    wakeLock = await (navigator as any).wakeLock.request('screen'); 
                } catch (err: any) { 
                    // Silenciamos o erro de permissão (NotAllowedError) que ocorre em iframes restritos
                    if (err.name !== 'NotAllowedError') {
                        console.warn(`WakeLock request failed: ${err.name}, ${err.message}`); 
                    }
                }
            }
        };
        requestWakeLock();

        const handleOnline = () => forceSync();
        const handleFocus = () => forceSync();
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') forceSync(); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        heartbeatIntervalRef.current = window.setInterval(() => {
            const idleTime = Date.now() - lastSuccessfulSyncRef.current;
            if (idleTime > 10000) {
                forceSync();
            }
        }, 8000);

        return () => { 
            if (wakeLock !== null) wakeLock.release(); 
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            if (reconnectGraceTimeoutRef.current) clearTimeout(reconnectGraceTimeoutRef.current);
        };
    }, [forceSync]);

    const enableAudio = useCallback(() => { initAudioContext(); }, [initAudioContext]);

    useEffect(() => {
        if (orderToPrint) {
            if (printedOrderIdsRef.current.has(orderToPrint.id)) {
                setOrderToPrint(null); 
                return;
            }
            const printTimer = setTimeout(() => {
                window.focus();
                printedOrderIdsRef.current.add(orderToPrint.id);
                window.print();
                setTimeout(() => setOrderToPrint(null), 1000);
            }, 500); 
            return () => clearTimeout(printTimer);
        }
    }, [orderToPrint]);

    const handleManualPrint = (order: Order) => {
        printedOrderIdsRef.current.delete(order.id);
        setOrderToPrint(null);
        setTimeout(() => setOrderToPrint(order), 50);
    };

    useEffect(() => {
        if (!currentUser?.restaurantId) return;

        const handleRealtimeStatus = (status: string) => {
            if (status === 'SUBSCRIBED') {
                setConnectionStatus('CONNECTED');
                if (reconnectGraceTimeoutRef.current) {
                    clearTimeout(reconnectGraceTimeoutRef.current);
                    reconnectGraceTimeoutRef.current = null;
                }
            } else {
                if (!reconnectGraceTimeoutRef.current) {
                    reconnectGraceTimeoutRef.current = window.setTimeout(() => {
                        setConnectionStatus('RECONNECTING');
                    }, 10000);
                }
            }
        };

        const unsubscribe = subscribeToOrders((allOrders) => {
            processOrdersUpdate(allOrders);
        }, currentUser.restaurantId, handleRealtimeStatus); 

        return () => {
            unsubscribe();
        };
    }, [currentUser?.restaurantId, processOrdersUpdate]);

    const renderContent = () => {
        switch (activeTab) {
            case 'orders':
                return <OrdersView orders={orders} printerWidth={printerWidth} onPrint={handleManualPrint} />;
            case 'tables':
                return <TableManagement orders={orders} />;
            case 'menu': return <MenuManagement />;
            case 'financial':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando financeiro...</div>}>
                        <SalesDashboard />
                    </React.Suspense>
                );
            case 'customers':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando clientes...</div>}>
                        <CustomerList orders={orders} />
                    </React.Suspense>
                );
            case 'debt': return <DebtManager orders={orders} />;
            case 'settings': return <RestaurantSettings />;
            default: return null;
        }
    }
    
    return (
        <div className="w-full min-h-screen bg-gray-50" onClick={enableAudio} onTouchStart={enableAudio}>
            <div 
                className={`text-white text-center text-[10px] uppercase tracking-widest font-black p-1.5 cursor-pointer flex items-center justify-center gap-2 transition-all duration-500 ${connectionStatus === 'CONNECTED' ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`} 
                onClick={forceSync}
            >
                <div className={`w-2.5 h-2.5 rounded-full bg-white ${connectionStatus === 'CONNECTED' ? 'opacity-100' : 'animate-ping'}`}></div>
                {connectionStatus === 'CONNECTED' ? <span>Painel Conectado</span> : <span>Conectando...</span>}
            </div>

            <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b flex justify-between items-center gap-4">
                <div className="flex items-center space-x-4 flex-grow min-w-0">
                    <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-xl sm:text-2xl font-black text-gray-800 truncate">
                            {currentUser?.name || 'Painel Lojista'}
                        </h1>
                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">Padrão Jerê Ativo</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={forceSync}
                        className={`p-2 rounded-lg transition-all ${connectionStatus === 'CONNECTED' ? 'text-gray-400 hover:text-orange-600' : 'text-white bg-red-500'}`}
                        title="Sincronizar Manualmente"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 ${connectionStatus !== 'CONNECTED' ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                    <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-500 hover:text-red-600 rounded-lg transition-colors font-bold flex-shrink-0">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>

             <nav className="p-4 border-b sticky top-[95px] bg-gray-50 z-10 overflow-x-auto no-scrollbar">
                <div className="flex space-x-2 rounded-xl bg-gray-200 p-1 min-w-max">
                    {(['orders', 'tables', 'menu', 'debt', 'financial', 'customers', 'settings'] as const).map((tab) => {
                        const labels: Record<string, string> = { 
                            orders: 'Pedidos', tables: 'Mesas', menu: 'Cardápio', debt: 'Fiados', 
                            financial: 'Financeiro', customers: 'Clientes', settings: 'Config' 
                        };
                        return (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)} 
                                className={`px-4 py-2 text-center text-xs font-black uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-white shadow-md text-orange-600 scale-105' : 'text-gray-500'}`}
                            >
                                {labels[tab]}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <main className="flex-grow">{renderContent()}</main>

            <div className="hidden print:block">
                <div id="printable-order">
                    {orderToPrint && <PrintableOrder order={orderToPrint} printerWidth={printerWidth} />}
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;
