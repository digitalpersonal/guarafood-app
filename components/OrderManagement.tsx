
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders } from '../services/orderService';
import { useAuth } from '../services/authService'; 
import type { Order } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';
import PrintableOrder from './PrintableOrder';
import DebtManager from './DebtManager';
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
    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings' | 'financial' | 'customers' | 'debt'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
    const { playNotification, initAudioContext } = useSound();
    
    const previousOrdersStatusRef = useRef<Map<string, string>>(new Map());
    const isFirstLoadRef = useRef(true);
    const printedOrderIdsRef = useRef<Set<string>>(new Set());

    const [printerWidth, setPrinterWidth] = useState<number>(80);

    useEffect(() => {
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try { wakeLock = await (navigator as any).wakeLock.request('screen'); } 
                catch (err: any) { console.error(`${err.name}, ${err.message}`); }
            }
        };
        requestWakeLock();
        return () => { if (wakeLock !== null) wakeLock.release(); };
    }, []);

    useEffect(() => {
        const savedWidth = localStorage.getItem('guarafood-printer-width');
        if (savedWidth) setPrinterWidth(parseInt(savedWidth, 10));
    }, []);

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

        const unsubscribe = subscribeToOrders((allOrders) => {
            const areNotificationsEnabled = localStorage.getItem('guarafood-notifications-enabled') === 'true';
            
            // 1. Mapa de status de TODOS os pedidos (incluindo os ocultos por Pix)
            const currentStatusMap = new Map<string, string>();
            allOrders.forEach(o => currentStatusMap.set(o.id, o.status));

            // 2. FILTRO DE SEGURANÇA MÁXIMA: Pedidos em "Aguardando Pagamento" são invisíveis para o Merchant.
            // Eles só "nascem" para o lojista quando o status vira "Novo Pedido" (pago).
            const visibleOrders = allOrders.filter(o => o.status !== 'Aguardando Pagamento');

            if (!isFirstLoadRef.current) {
                // SÓ ALERTA E IMPRIME SE:
                // O pedido era desconhecido ou estava oculto (Aguardando Pgto) E agora é um "Novo Pedido"
                const ordersToAlert = visibleOrders.filter(order => {
                    const prevStatus = previousOrdersStatusRef.current.get(order.id);
                    // Importante: se prevStatus for 'Aguardando Pagamento', ele não estava em visibleOrders antes
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
                    }
                    playNotification();
                    setOrderToPrint(newestOrder);
                }
            }

            previousOrdersStatusRef.current = currentStatusMap;
            setOrders(visibleOrders);
            isFirstLoadRef.current = false;

        }, currentUser.restaurantId, (status) => {
            if (status === 'SUBSCRIBED') setConnectionStatus('CONNECTED');
            else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionStatus('DISCONNECTED');
        }, 200); 
        
        return () => unsubscribe();
    }, [currentUser, playNotification]);

    
    const renderContent = () => {
        switch (activeTab) {
            case 'orders':
                return <OrdersView orders={orders} printerWidth={printerWidth} onPrint={handleManualPrint} />;
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
                className={`text-white text-center text-[10px] uppercase tracking-widest font-black p-1.5 cursor-pointer flex items-center justify-center gap-2 transition-colors duration-500 ${connectionStatus === 'CONNECTED' ? 'bg-green-600' : 'bg-red-600'}`} 
                onClick={enableAudio}
            >
                <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-white animate-pulse' : 'bg-white'}`}></div>
                {connectionStatus === 'CONNECTED' ? <span>Painel Online - Monitorando Vendas</span> : <span>Sem Conexão - Tentando Reconectar...</span>}
            </div>

            <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b flex justify-between items-center gap-4">
                <div className="flex items-center space-x-4 flex-grow min-w-0">
                    <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                    </button>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-800 truncate">
                        {currentUser?.name || 'Painel Lojista'}
                    </h1>
                </div>
                <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-500 hover:text-red-600 rounded-lg transition-colors font-bold flex-shrink-0">
                    <LogoutIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Sair</span>
                </button>
            </header>

             <nav className="p-4 border-b sticky top-[95px] bg-gray-50 z-10 overflow-x-auto no-scrollbar">
                <div className="flex space-x-2 rounded-xl bg-gray-200 p-1 min-w-max">
                    {(['orders', 'menu', 'debt', 'financial', 'customers', 'settings'] as const).map((tab) => {
                        const labels: Record<string, string> = { 
                            orders: 'Pedidos', menu: 'Cardápio', debt: 'Fiados', 
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
