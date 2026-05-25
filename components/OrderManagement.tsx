
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { subscribeToOrders, fetchOrders } from '../services/orderService';
import { useAuth } from '../services/authService'; 
import { APP_VERSION } from './VersionChecker';
import { fetchRestaurantByIdSecure } from '../services/databaseService';
import type { Order, StaffMember, CartItem, Restaurant } from '../types';
import OrdersView from './OrdersView';
import MenuManagement from './MenuManagement';
import RestaurantSettings from './RestaurantSettings';
import PrintableOrder from './PrintableOrder';
import TableManagement from './TableManagement';
import StaffManagement from './StaffManagement';
import MensalistasManager from './MensalistasManager';
import PinPadModal from './PinPadModal';
import HelpCenter from './HelpCenter';
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
    const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'menu' | 'settings' | 'financial' | 'customers' | 'staff' | 'help' | 'mensalistas'>('orders');
    const [orders, setOrders] = useState<Order[]>(() => {
        try {
            const cached = localStorage.getItem('guarafood-cached-orders');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [restaurant, setRestaurant] = useState<Restaurant | null>(() => {
        try {
            const cached = localStorage.getItem('guarafood-cached-restaurant');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [printJob, setPrintJob] = useState<{ 
        order: Order, 
        mode: 'full' | 'kitchen' | 'admin', 
        items?: CartItem[], 
        jobId?: string 
    } | null>(null);
    const [printQueue, setPrintQueue] = useState<Array<{ 
        order: Order, 
        mode: 'full' | 'kitchen' | 'admin', 
        items?: CartItem[], 
        jobId?: string 
    }>>([]);
    const [isPrintingCooldown, setIsPrintingCooldown] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING'>('CONNECTED');
    const [isManualSyncing, setIsManualSyncing] = useState(false);
    const { playNotification, initAudioContext } = useSound();
    
    // Staff & Security
    const [staffList, setStaffList] = useState<StaffMember[]>(() => {
        try {
            const cached = localStorage.getItem('guarafood-cached-staff');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [currentStaffUser, setCurrentStaffUser] = useState<StaffMember | null>(null);
    const [isPinPadOpen, setIsPinPadOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(localStorage.getItem('guarafood-panel-locked') === 'true');

    const lastSuccessfulSyncRef = useRef<number>(Date.now());
    const [lastSuccessfulSyncTime, setLastSuccessfulSyncTime] = useState<number>(Date.now());
    const isSyncingRef = useRef<boolean>(false);
    const previousOrdersStatusRef = useRef<Map<string, string>>(new Map());
    const isFirstLoadRef = useRef(true);
    const printedOrderIdsRef = useRef<Set<string>>(new Set());
    const processedJobIdsRef = useRef<Set<string>>(new Set());
    const alertedOrderIdsRef = useRef<Set<string>>(new Set());
    const heartbeatIntervalRef = useRef<number | null>(null);
    const reconnectGraceTimeoutRef = useRef<number | null>(null);
    const appStartTimeRef = useRef<number>(Date.now());
    const [isBrowserOffline, setIsBrowserOffline] = useState(!navigator.onLine);

    // Screen Wake Lock API
    const [isWakeLocked, setIsWakeLocked] = useState<boolean>(false);
    const wakeLockRef = useRef<any>(null);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                if (wakeLockRef.current) {
                    await wakeLockRef.current.release();
                }
                const lock = await (navigator as any).wakeLock.request('screen');
                wakeLockRef.current = lock;
                setIsWakeLocked(true);
                console.log('[GuaraFood] Screen Wake Lock ativo com sucesso!');
                
                lock.addEventListener('release', () => {
                    setIsWakeLocked(false);
                    console.log('[GuaraFood] Screen Wake Lock foi liberado.');
                });
            } catch (err: any) {
                console.warn('[GuaraFood] Falha ao solicitar Screen Wake Lock:', err.message || err);
                setIsWakeLocked(false);
            }
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.error('[GuaraFood] Erro ao liberar Screen Wake Lock:', err);
            }
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        requestWakeLock();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [requestWakeLock, releaseWakeLock]);

    const [printerWidth, setPrinterWidth] = useState<number>(80);

    // Carrega configuração de impressora e STAFF do Banco de Dados
    useEffect(() => {
        if (!currentUser?.restaurantId) return;
        
        const loadConfig = async () => {
            try {
                // Implement automatic 3.5s timeout race to prevent rendering thread from locking under poor network condition
                const rest = await Promise.race([
                    fetchRestaurantByIdSecure(currentUser.restaurantId),
                    new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 3500))
                ]).catch(err => {
                    console.warn("[GuaraFood Offline Mode] Restaurant details fetch timed out or failed. Utilizing cached state.", err);
                    return null;
                });

                if (rest) {
                    setRestaurant(rest);
                    localStorage.setItem('guarafood-cached-restaurant', JSON.stringify(rest));
                    if (rest.printerWidth) {
                        setPrinterWidth(rest.printerWidth);
                        localStorage.setItem('guarafood-printer-width', rest.printerWidth.toString());
                    }
                    if (rest.staff) {
                        setStaffList(rest.staff);
                        localStorage.setItem('guarafood-cached-staff', JSON.stringify(rest.staff));
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
        const allTabs = ['orders', 'tables', 'menu', 'financial', 'customers', 'staff', 'settings', 'help', 'mensalistas'] as const;
        
        // Se o usuário logado for garçom, ele só vê mesas
        if (currentUser?.role === 'waiter') {
            return ['tables', 'help'];
        }

        // Se o painel estiver travado (Modo Garçom compartilhado), só mostra mesas
        if (isLocked) {
            return ['tables', 'help'];
        }
        
        // Manager ou Merchant (Dono) vê tudo
        return restaurant?.hasMensalistas ? allTabs : allTabs.filter(t => t !== 'mensalistas');
    }, [currentUser, isLocked, restaurant]);

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
                const orderTime = order.timestamp ? new Date(order.timestamp).getTime() : Date.now();
                const isRecent = (Date.now() - orderTime) < 600000; // 10 minutos
                const isWithinStartupWindow = orderTime > appStartTimeRef.current - 120000; // 2 minutos antes do app abrir ou depois
                const hasJustChangedStatus = prevStatus !== undefined && prevStatus !== order.status;

                const isNewDelivery = order.status === 'Novo Pedido' && 
                                      isRecent && 
                                      !alertedOrderIdsRef.current.has(order.id) && 
                                      (isWithinStartupWindow || hasJustChangedStatus);

                const isNewTable = order.tableNumber && 
                                   !previousOrdersStatusRef.current.has(order.id) && 
                                   !alertedOrderIdsRef.current.has(order.id) && 
                                   isRecent && 
                                   (isWithinStartupWindow || prevStatus !== undefined);

                return isNewDelivery || isNewTable;
            });

            if (ordersToAlert.length > 0) { ordersToAlert.forEach(o => alertedOrderIdsRef.current.add(o.id));
                const newestOrder = ordersToAlert[0];
                if (areNotificationsEnabled) {
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                         try {
                             new Notification(newestOrder.tableNumber ? 'Nova Mesa Aberta!' : 'Novo Pedido!', {
                                body: newestOrder.tableNumber 
                                    ? `Mesa ${newestOrder.tableNumber} foi aberta.`
                                    : `Pedido ${newestOrder.order_number || ''} - R$ ${newestOrder.totalPrice.toFixed(2)}`,
                                icon: '/vite.svg',
                                tag: newestOrder.id
                            });
                         } catch (e) { console.error("Notification API error", e); }
                    }
                    playNotification(); 
                }
                // Only auto-print delivery orders, not empty table openings
                if (!newestOrder.tableNumber) {
                    setPrintQueue(prev => [...prev, { order: newestOrder, mode: 'full' }]);
                }
            }
        }

        previousOrdersStatusRef.current = currentStatusMap;
        setOrders(visibleOrders);
        try {
            localStorage.setItem('guarafood-cached-orders', JSON.stringify(visibleOrders));
        } catch (err) {
            console.error("Erro ao persistir cache local de pedidos:", err);
        }
        if (isFirstLoadRef.current) { visibleOrders.forEach(o => alertedOrderIdsRef.current.add(o.id)); }; isFirstLoadRef.current = false;
        lastSuccessfulSyncRef.current = Date.now();
        setLastSuccessfulSyncTime(Date.now());
        setConnectionStatus('CONNECTED');
    }, [playNotification]);

    const forceSync = useCallback(async () => {
        if (!currentUser?.restaurantId || isSyncingRef.current) return;
        isSyncingRef.current = true;
        setIsManualSyncing(true);
        try {
            // Sincronização robusta com limite estendido para 15 segundos (ideal para as redes móveis instáveis dos restaurantes no Brasil)
            const allOrders = await Promise.race([
                fetchOrders(currentUser.restaurantId, { limit: 150 }),
                new Promise<Order[]>((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 15000))
            ]);
            processOrdersUpdate(allOrders);
            lastSuccessfulSyncRef.current = Date.now();
            setLastSuccessfulSyncTime(Date.now());
            setConnectionStatus('CONNECTED');
        } catch (e) {
            console.warn("[GuaraFood Sync] Falha ou timeout na sincronização automática. Utilizando estado guardado offline.", e);
            try {
                const cached = localStorage.getItem('guarafood-cached-orders');
                if (cached && orders.length === 0) {
                    const parsed = JSON.parse(cached);
                    setOrders(parsed);
                }
            } catch (err) {
                console.error("Erro ao ler cache secundário de pedidos:", err);
            }
        } finally {
            isSyncingRef.current = false;
            setIsManualSyncing(false);
        }
    }, [currentUser?.restaurantId, processOrdersUpdate, orders.length]);

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

        const handleOnline = () => {
            setIsBrowserOffline(false);
            forceSync();
        };
        const handleOffline = () => {
            setIsBrowserOffline(true);
        };
        const handleFocus = () => {
            const now = Date.now();
            lastSuccessfulSyncRef.current = now;
            setLastSuccessfulSyncTime(now);
            forceSync();
        };
        const handleVisibilityChange = () => { 
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                lastSuccessfulSyncRef.current = now;
                setLastSuccessfulSyncTime(now);
                forceSync(); 
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('guarafood:update-orders', forceSync);

        heartbeatIntervalRef.current = window.setInterval(() => {
            const idleTime = Date.now() - lastSuccessfulSyncRef.current;
            if (idleTime > 90000) { // Antes era 30000. Damos tolerância de 90s para redes móveis lentas
                setConnectionStatus('RECONNECTING');
                forceSync();
            } else if (idleTime > 45000) { // Antes era 10000. Damos tolerância de 45s para evitar acúmulo de tráfego
                forceSync();
            }
        }, 15000); // Executa verificação a cada 15 segundos (antes era 8s)

        return () => { 
            if (wakeLock !== null) wakeLock.release(); 
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
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
                const printJobId = printJob.jobId;
                const orderId = printJob.order.id;
                try {
                    window.focus();
                    
                    if (printJob.mode === 'full' && !printJob.jobId) {
                        printedOrderIdsRef.current.add(printJob.order.id);
                    }
                    
                    window.print();

                    // Se era um trabalho da fila remota (jobId), marcamos como feito no banco
                    if (printJobId) {
                        try {
                            const { markPrintJobAsDone } = await import('../services/orderService');
                            await markPrintJobAsDone(orderId, printJobId);
                        } catch (e) {
                            console.error("Erro ao marcar impressão como concluída:", e);
                        }
                    }
                } catch (err) {
                    console.error("Erro ao processar impressão:", err);
                } finally {
                    // Ativa o cooldown e limpa o job ativo de forma limpa para recuperar thread
                    setIsPrintingCooldown(true);
                    setPrintJob(null);
                    setTimeout(() => {
                        setIsPrintingCooldown(false);
                    }, 1800);
                }
            }, 500); 
            return () => clearTimeout(printTimer);
        }
    }, [printJob]);

    // GESTOR DE FILA DE IMPRESSÃO LOCAL
    useEffect(() => {
        if (!printJob && !isPrintingCooldown && printQueue.length > 0) {
            const nextJob = printQueue[0];
            setPrintQueue(prev => prev.slice(1));
            setPrintJob(nextJob);
        }
    }, [printJob, printQueue, isPrintingCooldown]);

    // MONITOR DE FILA DE IMPRESSÃO REMOTA (Para Mesas/Garçons)
    useEffect(() => {
        const isPrintServer = localStorage.getItem('guarafood-is-print-server') === 'true';
        if (!isPrintServer || orders.length === 0) return;

        // Procuramos em todos os pedidos ativos por solicitações de impressão pendentes
        const pendingJobsToQueue: Array<{
            order: Order;
            mode: 'full' | 'kitchen' | 'admin';
            items?: any[];
            jobId?: string;
        }> = [];
        let shouldPlayNotification = false;

        for (const order of orders) {
            const queue = order.payment_details?.print_queue || [];
            const pendingJobs = queue.filter((job: any) => job.status === 'pending');
            
            for (const pendingJob of pendingJobs) {
                // Se já processamos esse ID ou se já está em processamento, ignoramos
                if (!processedJobIdsRef.current.has(pendingJob.id)) {
                    processedJobIdsRef.current.add(pendingJob.id);
                    
                    shouldPlayNotification = true;
                    pendingJobsToQueue.push({
                        order: order,
                        mode: pendingJob.type || 'kitchen',
                        items: pendingJob.items,
                        jobId: pendingJob.id
                    });
                }
            }
        }

        if (pendingJobsToQueue.length > 0) {
            if (shouldPlayNotification) {
                const areNotificationsEnabled = localStorage.getItem('guarafood-notifications-enabled') === 'true';
                if (areNotificationsEnabled) {
                    playNotification();
                }
            }
            // Enfilera no spooler local de forma limpa
            setPrintQueue(prev => [...prev, ...pendingJobsToQueue]);
        }
    }, [orders, playNotification]);

    const handleManualPrint = (order: Order, mode: 'full' | 'kitchen' | 'admin' = 'full') => {
        // Se for modo cozinha, verificamos se há itens novos para evitar impressão em branco
        if (mode === 'kitchen') {
            const hasNewItems = order.items.some(item => {
                return true; 
            });
            if (!hasNewItems && mode === 'kitchen') return;
        }

        printedOrderIdsRef.current.delete(order.id);
        setPrintQueue(prev => [...prev, { order, mode }]);
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
                // Quando o canal de tempo real oscila ou desconecta, nós não mostramos a temida tarja vermelha
                // imediatamente porque o polling de backup em segundo plano está 100% ativo e atualizando tudo.
                // A tarja vermelha só será ativada se ambos falharem no intervalo do heartbeat.
                console.log(`Canal de tempo real oscilou (${status}). Polling HTTP de backup ativo operando.`);
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
                return <OrdersView orders={orders} printerWidth={printerWidth} onPrint={handleManualPrint} currentStaffUser={currentStaffUser} restaurant={restaurant} />;
            case 'tables':
                return <TableManagement orders={orders} currentStaffUser={currentStaffUser} onPrint={handleManualPrint} restaurant={restaurant} />;
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
            case 'mensalistas': return <MensalistasManager />;
            case 'settings': return <RestaurantSettings />;
            case 'help': return <HelpCenter onBack={() => setActiveTab('orders')} />;
            default: return null;
        }
    }
    
    // A tarja vermelha só é exibida se realmente ficarmos mais de 60 segundos sem conseguir atualizar os pedidos
    const showOfflineBanner = isBrowserOffline || (Date.now() - lastSuccessfulSyncTime > 60000);
    
    return (
        <div className="w-full min-h-screen bg-gray-50" onClick={enableAudio} onTouchStart={enableAudio}>
            {showOfflineBanner && (
                <div 
                    className="text-white text-center text-[10px] uppercase tracking-widest font-black p-1.5 cursor-pointer bg-red-600 animate-pulse flex items-center justify-center gap-2 transition-all duration-500 z-50 sticky top-0"
                    onClick={forceSync}
                >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></div>
                    <span>{isBrowserOffline ? 'Sem Conexão com a Internet' : 'Sincronização Lenta ou Desconectado...'} - Clique para Forçar</span>
                </div>
            )}

            <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b flex justify-between items-center gap-4">
                <div className="flex items-center space-x-4 flex-grow min-w-0">
                    <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-xl sm:text-2xl font-black text-gray-800 truncate flex items-center gap-2">
                            {currentUser?.name || 'Painel Lojista'}
                            <span 
                                className={`inline-block w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                                    connectionStatus === 'CONNECTED' 
                                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                                        : (Date.now() - lastSuccessfulSyncTime < 45000 
                                            ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                            : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]')
                                }`} 
                                title={
                                    connectionStatus === 'CONNECTED' 
                                        ? 'Conexão em Tempo Real Ativa' 
                                        : (Date.now() - lastSuccessfulSyncTime < 45000 
                                            ? 'Tempo real instável, mas sistema sincronizado via canal HTTP de backup útil' 
                                            : 'Sem contato com o servidor. Verifique sua conexão...')
                                }
                            />
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-orange-600 font-bold uppercase">
                                {currentUser?.role === 'waiter' ? 'Garçom' : currentUser?.role === 'manager' ? 'Gerente' : 'Administrador'}
                            </span>
                            <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold">v{APP_VERSION}</span>
                            {isWakeLocked ? (
                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1 animate-pulse" title="A tela não entrará em repouso automaticamente para evitar que você perca pedidos novos!">
                                    <span className="w-1 h-1 rounded-full bg-green-500 inline-block"></span>
                                    Tela Ativa
                                </span>
                            ) : (
                                <span 
                                    onClick={requestWakeLock}
                                    className="text-[9px] bg-gray-200 text-gray-500 hover:bg-orange-100 hover:text-orange-700 cursor-pointer px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 transition-colors"
                                    title="O navegador permite repouso da tela. Clique para forçar a tela a ficar sempre ativada!"
                                >
                                    <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                    Tela Normal
                                </span>
                            )}
                        </div>
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
                        className={`p-2 rounded-lg transition-all ${isManualSyncing ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}
                        disabled={isManualSyncing}
                        title="Sincronizar Manualmente"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 ${isManualSyncing ? 'animate-spin' : ''}`}>
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
                                financial: 'Financeiro', customers: 'Clientes', staff: 'Equipe', 
                                settings: 'Config', help: 'Ajuda', mensalistas: 'Mensalistas'
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

            {printQueue.length > 0 && (
                <div id="print-queue-indicator" className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-3xl p-5 shadow-2xl z-[80] flex items-center gap-4 animate-bounce max-w-sm border border-orange-500/30">
                    <div className="flex-shrink-0 relative flex items-center justify-center">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40 animate-ping"></span>
                        <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="font-black text-xs uppercase tracking-wider">Fila de Impressão</p>
                        <p className="text-[11px] opacity-90 truncate">{printQueue.length} {printQueue.length === 1 ? 'impressão na fila' : 'impressões na fila'}...</p>
                    </div>
                    <button 
                        id="btn-cancel-print-queue"
                        onClick={() => {
                            setPrintQueue([]);
                            setPrintJob(null);
                            setIsPrintingCooldown(false);
                        }}
                        className="bg-white/20 hover:bg-white/35 active:scale-95 transition-all text-[9px] font-black uppercase px-3 py-2 rounded-xl border border-white/25 flex-shrink-0"
                    >
                        Limpar
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
