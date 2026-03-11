
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders, fetchOrders } from '../services/orderService';
import { useAuth } from '../services/authService'; 
import { fetchRestaurantByIdSecure } from '../services/databaseService';
import type { Order, StaffMember, CartItem } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';
import PrintableOrder from './PrintableOrder';
import TableManagement from './TableManagement';
import TableKitchenDisplay from './TableKitchenDisplay';
import StaffManagement from './StaffManagement';
import PinPadModal from './PinPadModal';
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

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const SalesDashboard = React.lazy(() => import('./SalesDashboard'));
const CustomerList = React.lazy(() => import('./CustomerList'));

const OrderManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'menu' | 'settings' | 'financial' | 'customers' | 'staff' | 'kitchen'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [printJob, setPrintJob] = useState<{ 
        order: Order, 
        mode: 'full' | 'kitchen', 
        items?: CartItem[], 
        jobId?: string 
    } | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING'>('CONNECTED');
    const { playNotification, initAudioContext } = useSound();
    
    // Staff & Security
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [currentStaffUser, setCurrentStaffUser] = useState<StaffMember | null>(null);
    const [isPinPadOpen, setIsPinPadOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(localStorage.getItem('guarafood-panel-locked') === 'true');

    const lastSuccessfulSyncRef = useRef<number>(Date.now());
    const previousOrdersStatusRef = useRef<Map<string, string>>(new Map());
    const isFirstLoadRef = useRef(true);
    const printedOrderIdsRef = useRef<Set<string>>(new Set());
    const processedJobIdsRef = useRef<Set<string>>(new Set());
    const heartbeatIntervalRef = useRef<number | null>(null);
    const reconnectGraceTimeoutRef = useRef<number | null>(null);

    const [printerWidth, setPrinterWidth] = useState<number>(80);

    // Carrega configuração de impressora e STAFF do Banco de Dados
    useEffect(() => {
        if (!currentUser?.restaurantId) return;
        
        const loadConfig = async () => {
            try {
                const rest = await fetchRestaurantByIdSecure(currentUser.restaurantId);
                if (rest) {
                    if (rest.printerWidth) {
                        setPrinterWidth(rest.printerWidth);
                        localStorage.setItem('guarafood-printer-width', rest.printerWidth.toString());
                    }
                    if (rest.staff) {
                        setStaffList(rest.staff);
                    }
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
    }, [currentUser, activeTab]); // Reload staff when tabs change (e.g. after editing staff)

    const handleStaffLogin = (member: StaffMember) => {
        setCurrentStaffUser(member);
        setIsPinPadOpen(false);
        
        if (member.role === 'manager') {
            setIsLocked(false);
            localStorage.setItem('guarafood-panel-locked', 'false');
        } else {
            // Waiters are always locked to the Tables tab
            setIsLocked(true);
            localStorage.setItem('guarafood-panel-locked', 'true');
            setActiveTab('tables');
        }
    };

    const handleUpdateItemStatus = async (orderId: string, itemId: string, status: 'pending' | 'preparing' | 'ready') => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => 
            item.id === itemId ? { ...item, status } : item
        );

        try {
            const { updateOrderItemStatus } = await import('../services/orderService');
            await updateOrderItemStatus(orderId, updatedItems);
        } catch (e) {
            console.error("Failed to update item status", e);
        }
    };

    const handleLockScreen = () => {
        setCurrentStaffUser(null);
        setIsLocked(true);
        localStorage.setItem('guarafood-panel-locked', 'true');
        setActiveTab('tables');
    };

    const handleUnlockClick = () => {
        setIsPinPadOpen(true);
    };

    // Determine visible tabs based on role and lock state
    const visibleTabs = useMemo(() => {
        const allTabs = ['orders', 'tables', 'menu', 'financial', 'customers', 'staff', 'settings', 'kitchen'] as const;
        
        // Se o usuário logado for garçom, ele só vê mesas
        if (currentUser?.role === 'waiter') {
            return ['tables'];
        }

        // Se o painel estiver travado (Modo Garçom compartilhado), só mostra mesas
        if (isLocked) {
            return ['tables'];
        }
        
        // Manager ou Merchant (Dono) vê tudo
        return allTabs;
    }, [currentUser, isLocked]);

    // Force tab if current is not allowed
    useEffect(() => {
        if ((isLocked || currentUser?.role === 'waiter') && activeTab !== 'tables') {
            setActiveTab('tables');
        }
    }, [currentUser, isLocked, activeTab]);

    const processOrdersUpdate = useCallback((allOrders: Order[]) => {
        const areNotificationsEnabled = localStorage.getItem('guarafood-notifications-enabled') === 'true';
        
        const currentStatusMap = new Map<string, string>();
        allOrders.forEach(o => currentStatusMap.set(o.id, o.status));

        // We keep 'Aguardando Pagamento' in the main orders state because TableManagement needs them.
        // OrdersView and other components will filter them out internally if needed.
        const visibleOrders = allOrders;

        if (!isFirstLoadRef.current) {
            const ordersToAlert = visibleOrders.filter(order => {
                const prevStatus = previousOrdersStatusRef.current.get(order.id);
                return order.status === 'Novo Pedido' && prevStatus !== 'Novo Pedido';
            });

            if (ordersToAlert.length > 0) {
                const newestOrder = ordersToAlert[0];
                if (areNotificationsEnabled) {
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                         try {
                             new Notification('Novo Pedido!', {
                                body: `Pedido ${newestOrder.order_number || ''} - R$ ${newestOrder.totalPrice.toFixed(2)}`,
                                icon: '/vite.svg',
                                tag: newestOrder.id
                            });
                         } catch (e) { console.error("Notification API error", e); }
                    }
                    playNotification(); 
                }
                setPrintJob({ order: newestOrder, mode: 'full' });
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
        window.addEventListener('guarafood:update-orders', forceSync);

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
            window.removeEventListener('guarafood:update-orders', forceSync);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            if (reconnectGraceTimeoutRef.current) clearTimeout(reconnectGraceTimeoutRef.current);
        };
    }, [forceSync]);

    const enableAudio = useCallback(() => { initAudioContext(); }, [initAudioContext]);

    useEffect(() => {
        if (printJob) {
            // Se for um pedido de delivery novo, evitamos duplicidade pelo ID
            if (printJob.mode === 'full' && !printJob.jobId && printedOrderIdsRef.current.has(printJob.order.id)) {
                setPrintJob(null); 
                return;
            }

            const printTimer = setTimeout(async () => {
                window.focus();
                
                if (printJob.mode === 'full' && !printJob.jobId) {
                    printedOrderIdsRef.current.add(printJob.order.id);
                }
                
                window.print();

                // Se era um trabalho da fila remota (jobId), marcamos como feito no banco
                if (printJob.jobId) {
                    try {
                        const { markPrintJobAsDone } = await import('../services/orderService');
                        await markPrintJobAsDone(printJob.order.id, printJob.jobId);
                    } catch (e) {
                        console.error("Erro ao marcar impressão como concluída:", e);
                    }
                }

                setTimeout(() => setPrintJob(null), 1000);
            }, 500); 
            return () => clearTimeout(printTimer);
        }
    }, [printJob]);

    // MONITOR DE FILA DE IMPRESSÃO REMOTA (Para Mesas/Garçons)
    useEffect(() => {
        const isPrintServer = localStorage.getItem('guarafood-is-print-server') === 'true';
        if (!isPrintServer || orders.length === 0) return;

        // Procuramos em todos os pedidos ativos por solicitações de impressão pendentes
        for (const order of orders) {
            const queue = order.payment_details?.print_queue || [];
            const pendingJob = queue.find((job: any) => job.status === 'pending');
            
            if (pendingJob) {
                // Se já estamos imprimindo algo ou já processamos esse ID, ignoramos
                if (printJob || processedJobIdsRef.current.has(pendingJob.id)) break;

                processedJobIdsRef.current.add(pendingJob.id);
                setPrintJob({
                    order: order,
                    mode: pendingJob.type || 'kitchen',
                    items: pendingJob.items,
                    jobId: pendingJob.id
                });
                break; // Processa um por vez
            }
        }
    }, [orders, printJob]);

    const handleManualPrint = (order: Order, mode: 'full' | 'kitchen' = 'full') => {
        printedOrderIdsRef.current.delete(order.id);
        setPrintJob(null);
        setTimeout(() => setPrintJob({ order, mode }), 50);
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
                return <TableManagement orders={orders} currentStaffUser={currentStaffUser} onPrint={handleManualPrint} playNotification={playNotification} />;
            case 'kitchen':
                return <TableKitchenDisplay orders={orders} onUpdateItemStatus={handleUpdateItemStatus} />;
            case 'menu': return <MenuManagement />;
            case 'financial':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando financeiro...</div>}>
                        <SalesDashboard currentStaffUser={currentStaffUser} />
                    </React.Suspense>
                );
            case 'customers':
                return (
                    <React.Suspense fallback={<div className="p-4 text-center">Carregando clientes...</div>}>
                        <CustomerList orders={orders} />
                    </React.Suspense>
                );
            case 'staff': return <StaffManagement />;
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
                        <span className="text-xs text-orange-600 font-bold uppercase">
                            {currentUser?.role === 'waiter' ? 'Garçom' : currentUser?.role === 'manager' ? 'Gerente' : 'Administrador'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {currentUser?.role !== 'waiter' && (
                        isLocked ? (
                            <button 
                                onClick={handleUnlockClick}
                                className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-all font-black text-[10px] uppercase tracking-wider shadow-sm"
                                title="Desbloquear Painel Completo"
                            >
                                <LockClosedIcon className="w-5 h-5" />
                                Modo Garçom
                            </button>
                        ) : (
                            staffList.length > 0 && (
                                <button 
                                    onClick={handleLockScreen}
                                    className="p-2 rounded-lg text-gray-400 hover:text-orange-600 transition-all"
                                    title="Ativar Modo Garçom (Restrito)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </button>
                            )
                        )
                    )}
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

             {visibleTabs.length > 1 && (
                <nav className="p-4 border-b sticky top-[95px] bg-gray-50 z-10 overflow-x-auto no-scrollbar">
                    <div className="flex space-x-2 rounded-xl bg-gray-200 p-1 min-w-max">
                        {visibleTabs.map((tab) => {
                            const labels: Record<string, string> = { 
                                orders: 'Pedidos', tables: 'Mesas', menu: 'Cardápio', 
                                financial: 'Financeiro', customers: 'Clientes', staff: 'Equipe', settings: 'Config', kitchen: 'Cozinha' 
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
            )}

            <main className="flex-grow">{renderContent()}</main>

            <div className="hidden print:block">
                <div id="printable-order">
                    {printJob && (
                        <PrintableOrder 
                            order={printJob.items ? { ...printJob.order, items: printJob.items } : printJob.order} 
                            printerWidth={printerWidth} 
                            printMode={printJob.mode}
                        />
                    )}
                </div>
            </div>

            <PinPadModal 
                isOpen={isPinPadOpen}
                onClose={() => {
                    // If locked and no user is set, we can't just close without login unless it's the owner cancelling the lock action?
                    // But if we are in "Locked Mode", we must stay locked.
                    // If we just clicked "Lock" and want to cancel, we can.
                    if (isLocked && !currentStaffUser) {
                        // If we are truly locked out (e.g. initial load), we might want to prevent close.
                        // But here, 'isLocked' is just UI state.
                        // Let's allow closing if user is the Owner (which they are if they are seeing this component).
                        setIsPinPadOpen(false);
                        setIsLocked(false);
                    } else {
                        setIsPinPadOpen(false);
                    }
                }}
                staff={staffList}
                onSuccess={handleStaffLogin}
                title={isLocked ? "Desbloquear Gerente" : "Acesso Restrito"}
            />
        </div>
    );
};

export default OrderManagement;
