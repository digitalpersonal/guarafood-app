import React, { useState, useMemo, useEffect } from 'react';
import type { Order, Restaurant, StaffMember, CartItem, ItemPreparationStatus } from '../types';
import { updateOrderDetails, requestKitchenPrint, requestBillPrint } from '../services/orderService';
import { useNotification } from '../hooks/useNotification';

interface WaiterMonitorProps {
    orders: Order[];
    restaurant: Restaurant | null;
    currentStaffUser: StaffMember | null;
    onOpenTableDetail?: (tableNumber: string) => void;
    onOpenComandaDetail?: (comandaNumber: string) => void;
}

// Normaliza o status do item para garantir consistência
const getItemStatus = (item: CartItem): ItemPreparationStatus => {
    if (item.itemStatus) return item.itemStatus;
    return item.served ? 'Entregue' : 'Pendente';
};

// Próximo status no ciclo natural de atendimento
const getNextStatus = (current: ItemPreparationStatus): ItemPreparationStatus => {
    switch (current) {
        case 'Pendente': return 'Em Preparo';
        case 'Em Preparo': return 'Pronto';
        case 'Pronto': return 'Entregue';
        case 'Entregue': return 'Pendente';
        default: return 'Pendente';
    }
};

// Formatação do tempo decorrido desde a criação do pedido
const getElapsedTime = (timestamp: string): { text: string; isUrgent: boolean; isWarning: boolean } => {
    if (!timestamp) return { text: '--', isUrgent: false, isWarning: false };
    const now = new Date().getTime();
    const created = new Date(timestamp).getTime();
    const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));

    if (diffMinutes < 1) return { text: 'Agora mesmo', isUrgent: false, isWarning: false };
    if (diffMinutes < 60) {
        return {
            text: `Há ${diffMinutes} min`,
            isUrgent: diffMinutes >= 35,
            isWarning: diffMinutes >= 20 && diffMinutes < 35
        };
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return {
        text: `Há ${hours}h${mins > 0 ? ` ${mins}m` : ''}`,
        isUrgent: true,
        isWarning: false
    };
};

const WaiterMonitor: React.FC<WaiterMonitorProps> = ({
    orders,
    restaurant,
    currentStaffUser,
    onOpenTableDetail,
    onOpenComandaDetail
}) => {
    const { addToast, confirm } = useNotification();

    // Filtros principais
    const [viewMode, setViewMode] = useState<'unified' | 'tables' | 'comandas' | 'ready_only'>('unified');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'served'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefreshCounter, setAutoRefreshCounter] = useState(0);

    // Modal de detalhes rápidos / inspeção da mesa ou comanda
    const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

    // Efeito para re-renderizar contadores de tempo a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setAutoRefreshCounter(c => c + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Identificar todos os pedidos ativos de salão (mesas e comandas)
    const activeOrders = useMemo(() => {
        return orders.filter(o => 
            o.status === 'Aguardando Pagamento' && (Boolean(o.tableNumber) || Boolean(o.comandaNumber))
        );
    }, [orders]);

    // Resumo e Contagens Globais em Tempo Real
    const globalStats = useMemo(() => {
        let countPending = 0;
        let countPreparing = 0;
        let countReady = 0;
        let countDelivered = 0;

        const tableNumbersSet = new Set<string>();
        const comandaNumbersSet = new Set<string>();

        activeOrders.forEach(order => {
            if (order.tableNumber) tableNumbersSet.add(order.tableNumber);
            if (order.comandaNumber) comandaNumbersSet.add(order.comandaNumber);

            (order.items || []).forEach(item => {
                const qty = Number(item.quantity) || 1;
                const st = getItemStatus(item);
                if (st === 'Pendente') countPending += qty;
                else if (st === 'Em Preparo') countPreparing += qty;
                else if (st === 'Pronto') countReady += qty;
                else if (st === 'Entregue') countDelivered += qty;
            });
        });

        return {
            openTablesCount: tableNumbersSet.size,
            openComandasCount: comandaNumbersSet.size,
            pendingItems: countPending,
            preparingItems: countPreparing,
            readyItems: countReady,
            deliveredItems: countDelivered,
            totalActiveOrders: activeOrders.length
        };
    }, [activeOrders]);

    // Mesas agrupadas com seus pedidos e itens
    const tablesGrouped = useMemo(() => {
        const map = new Map<string, {
            tableNumber: string;
            orders: Order[];
            totalAmount: number;
            totalItems: number;
            pendingCount: number;
            preparingCount: number;
            readyCount: number;
            deliveredCount: number;
            oldestTimestamp: string;
        }>();

        activeOrders.forEach(o => {
            if (!o.tableNumber) return;
            const tNum = o.tableNumber;
            if (!map.has(tNum)) {
                map.set(tNum, {
                    tableNumber: tNum,
                    orders: [],
                    totalAmount: 0,
                    totalItems: 0,
                    pendingCount: 0,
                    preparingCount: 0,
                    readyCount: 0,
                    deliveredCount: 0,
                    oldestTimestamp: o.timestamp
                });
            }

            const item = map.get(tNum)!;
            item.orders.push(o);
            item.totalAmount += Number(o.totalPrice) || 0;
            if (o.timestamp && (!item.oldestTimestamp || new Date(o.timestamp) < new Date(item.oldestTimestamp))) {
                item.oldestTimestamp = o.timestamp;
            }

            (o.items || []).forEach(it => {
                const qty = Number(it.quantity) || 1;
                item.totalItems += qty;
                const st = getItemStatus(it);
                if (st === 'Pendente') item.pendingCount += qty;
                else if (st === 'Em Preparo') item.preparingCount += qty;
                else if (st === 'Pronto') item.readyCount += qty;
                else if (st === 'Entregue') item.deliveredCount += qty;
            });
        });

        return Array.from(map.values()).sort((a, b) => {
            // Prioriza mesas com itens "Pronto" aguardando entrega!
            if (a.readyCount > 0 && b.readyCount === 0) return -1;
            if (b.readyCount > 0 && a.readyCount === 0) return 1;

            const numA = parseInt(a.tableNumber, 10);
            const numB = parseInt(b.tableNumber, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.tableNumber.localeCompare(b.tableNumber);
        });
    }, [activeOrders]);

    // Comandas individuais (mesmo que vinculadas a mesas)
    const comandasList = useMemo(() => {
        return activeOrders
            .filter(o => Boolean(o.comandaNumber))
            .map(o => {
                let totalItems = 0;
                let pendingCount = 0;
                let preparingCount = 0;
                let readyCount = 0;
                let deliveredCount = 0;

                (o.items || []).forEach(it => {
                    const qty = Number(it.quantity) || 1;
                    totalItems += qty;
                    const st = getItemStatus(it);
                    if (st === 'Pendente') pendingCount += qty;
                    else if (st === 'Em Preparo') preparingCount += qty;
                    else if (st === 'Pronto') readyCount += qty;
                    else if (st === 'Entregue') deliveredCount += qty;
                });

                return {
                    order: o,
                    comandaNumber: o.comandaNumber!,
                    tableNumber: o.tableNumber,
                    customerName: o.customerName || 'Cliente',
                    totalPrice: Number(o.totalPrice) || 0,
                    totalItems,
                    pendingCount,
                    preparingCount,
                    readyCount,
                    deliveredCount,
                    timestamp: o.timestamp
                };
            })
            .sort((a, b) => {
                // Prioriza comandas com itens "Pronto" aguardando entrega!
                if (a.readyCount > 0 && b.readyCount === 0) return -1;
                if (b.readyCount > 0 && a.readyCount === 0) return 1;

                const numA = parseInt(a.comandaNumber, 10);
                const numB = parseInt(b.comandaNumber, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.comandaNumber.localeCompare(b.comandaNumber);
            });
    }, [activeOrders]);

    // Entidades Unificadas (Mesas e Comandas Avulsas)
    type UnifiedCard = {
        type: 'table' | 'comanda';
        id: string;
        title: string;
        subtitle: string;
        badgeType: string;
        orders: Order[];
        totalAmount: number;
        totalItems: number;
        pendingCount: number;
        preparingCount: number;
        readyCount: number;
        deliveredCount: number;
        timestamp: string;
        tableNumber?: string;
        comandaNumber?: string;
    };

    const unifiedCards = useMemo<UnifiedCard[]>(() => {
        const cards: UnifiedCard[] = [];

        // 1. Adiciona todas as Mesas
        tablesGrouped.forEach(t => {
            cards.push({
                type: 'table',
                id: `table-${t.tableNumber}`,
                title: `Mesa ${t.tableNumber}`,
                subtitle: `${t.orders.length} ${t.orders.length === 1 ? 'comanda/pedido' : 'comandas/pedidos'}`,
                badgeType: '🍽️ Mesa',
                orders: t.orders,
                totalAmount: t.totalAmount,
                totalItems: t.totalItems,
                pendingCount: t.pendingCount,
                preparingCount: t.preparingCount,
                readyCount: t.readyCount,
                deliveredCount: t.deliveredCount,
                timestamp: t.oldestTimestamp,
                tableNumber: t.tableNumber
            });
        });

        // 2. Adiciona Comandas que NÃO estão vinculadas a mesas (comandas de balcão / avulsas)
        activeOrders
            .filter(o => Boolean(o.comandaNumber) && !Boolean(o.tableNumber))
            .forEach(o => {
                let pendingCount = 0;
                let preparingCount = 0;
                let readyCount = 0;
                let deliveredCount = 0;

                (o.items || []).forEach(it => {
                    const qty = Number(it.quantity) || 1;
                    const st = getItemStatus(it);
                    if (st === 'Pendente') pendingCount += qty;
                    else if (st === 'Em Preparo') preparingCount += qty;
                    else if (st === 'Pronto') readyCount += qty;
                    else if (st === 'Entregue') deliveredCount += qty;
                });

                cards.push({
                    type: 'comanda',
                    id: `comanda-${o.comandaNumber}`,
                    title: `Comanda #${o.comandaNumber}`,
                    subtitle: o.customerName || 'Cliente Balcão',
                    badgeType: '🧾 Comanda',
                    orders: [o],
                    totalAmount: Number(o.totalPrice) || 0,
                    totalItems: (o.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0),
                    pendingCount,
                    preparingCount,
                    readyCount,
                    deliveredCount,
                    timestamp: o.timestamp,
                    comandaNumber: o.comandaNumber
                });
            });

        // Ordenação inteligente:
        // 1º: Quem tem itens "Pronto" aguardando levar à mesa
        // 2º: Quem tem itens "Em Preparo" ou "Pendente"
        // 3º: Mais antigos primeiro
        return cards.sort((a, b) => {
            if (a.readyCount > 0 && b.readyCount === 0) return -1;
            if (b.readyCount > 0 && a.readyCount === 0) return 1;

            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeA - timeB;
        });
    }, [tablesGrouped, activeOrders]);

    // Filtragem dos Cards
    const filteredUnifiedCards = useMemo(() => {
        return unifiedCards.filter(card => {
            // Filtro de Visão
            if (viewMode === 'tables' && card.type !== 'table') return false;
            if (viewMode === 'comandas' && card.type !== 'comanda') return false;
            if (viewMode === 'ready_only' && card.readyCount === 0) return false;

            // Filtro de Status
            if (statusFilter === 'pending' && card.pendingCount === 0) return false;
            if (statusFilter === 'preparing' && card.preparingCount === 0) return false;
            if (statusFilter === 'ready' && card.readyCount === 0) return false;
            if (statusFilter === 'served' && (card.pendingCount > 0 || card.preparingCount > 0 || card.readyCount > 0)) return false;

            // Filtro de Busca
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = card.title.toLowerCase().includes(q);
                const matchesSub = card.subtitle.toLowerCase().includes(q);
                const matchesOrders = card.orders.some(o => 
                    (o.customerName || '').toLowerCase().includes(q) ||
                    (o.items || []).some(i => i.name.toLowerCase().includes(q))
                );
                if (!matchesTitle && !matchesSub && !matchesOrders) return false;
            }

            return true;
        });
    }, [unifiedCards, viewMode, statusFilter, searchQuery]);

    // Atualização do Status de um Item
    const handleSetItemStatus = async (order: Order, itemIndex: number, newStatus: ItemPreparationStatus) => {
        try {
            const newItems = [...order.items];
            const isServed = newStatus === 'Entregue';
            newItems[itemIndex] = {
                ...newItems[itemIndex],
                itemStatus: newStatus,
                served: isServed
            };

            const updated = await updateOrderDetails(order.id, {
                items: newItems,
                totalPrice: order.totalPrice,
                subtotal: order.subtotal || order.totalPrice,
                discountAmount: order.discountAmount
            });

            if (inspectOrder && inspectOrder.id === order.id) {
                setInspectOrder(updated);
            }

            const statusLabels: Record<ItemPreparationStatus, string> = {
                'Pendente': 'marcado como Pendente ⏳',
                'Em Preparo': 'marcado Em Preparo 🔥',
                'Pronto': 'marcado como PRONTO para Servir! 🔔',
                'Entregue': 'marcado como Entregue ✅'
            };

            addToast({
                message: `${newItems[itemIndex].name} ${statusLabels[newStatus]}`,
                type: newStatus === 'Pronto' ? 'success' : 'info'
            });
        } catch (e: any) {
            addToast({ message: `Erro ao alterar status: ${e.message}`, type: 'error' });
        }
    };

    // Marcar em lote o status de todos os itens de um pedido
    const handleBatchSetStatus = async (order: Order, targetStatus: ItemPreparationStatus) => {
        const isServed = targetStatus === 'Entregue';
        try {
            const newItems = order.items.map(it => ({
                ...it,
                itemStatus: targetStatus,
                served: isServed
            }));

            const updated = await updateOrderDetails(order.id, {
                items: newItems,
                totalPrice: order.totalPrice,
                subtotal: order.subtotal || order.totalPrice,
                discountAmount: order.discountAmount
            });

            if (inspectOrder && inspectOrder.id === order.id) {
                setInspectOrder(updated);
            }

            addToast({ 
                message: `Todos os itens foram marcados como "${targetStatus}"!`, 
                type: 'success' 
            });
        } catch (e: any) {
            addToast({ message: `Erro ao atualizar itens: ${e.message}`, type: 'error' });
        }
    };

    // Enviar pedido para a impressora da Cozinha
    const handleSendToKitchen = async (order: Order) => {
        try {
            const pendingItems = order.items.filter(i => getItemStatus(i) !== 'Entregue');
            const itemsToSend = pendingItems.length > 0 ? pendingItems : order.items;
            await requestKitchenPrint(order.id, itemsToSend);
            
            // Avança os itens enviados de 'Pendente' para 'Em Preparo'
            const newItems = order.items.map(it => {
                if (getItemStatus(it) === 'Pendente') {
                    return { ...it, itemStatus: 'Em Preparo' as ItemPreparationStatus };
                }
                return it;
            });
            await updateOrderDetails(order.id, {
                items: newItems,
                totalPrice: order.totalPrice,
                subtotal: order.subtotal || order.totalPrice,
                discountAmount: order.discountAmount
            });

            addToast({ message: 'Comanda enviada para a impressora da Cozinha e itens colocados Em Preparo!', type: 'success' });
        } catch (e: any) {
            console.error(e);
            addToast({ message: `Erro ao enviar para cozinha: ${e.message}`, type: 'error' });
        }
    };

    // Pedir conta no caixa
    const handleRequestBill = async (order: Order) => {
        try {
            await requestBillPrint(order.id);
            addToast({ message: 'Pré-conta enviada para a impressora do Caixa!', type: 'success' });
        } catch (e: any) {
            console.error(e);
            addToast({ message: `Erro ao solicitar conta: ${e.message}`, type: 'error' });
        }
    };

    return (
        <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-5 pb-36 font-sans">
            {/* TOPO: PAINEL DE CONTROLE DO GARÇOM */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-orange-50 via-white to-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center text-2xl shadow-sm shadow-orange-200">
                            👀
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                    Monitor da Equipe de Garçons
                                </h1>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 tracking-wider">
                                    Ao Vivo
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 font-medium mt-0.5">
                                Visão unificada de mesas abertas e comandas ativas com fluxo em tempo real de cada item
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                        {currentStaffUser && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3.5 py-1.5 rounded-2xl shadow-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-gray-700">
                                    Garçom: <strong className="text-gray-900">{currentStaffUser.name}</strong>
                                </span>
                            </div>
                        )}
                        <span className="text-xs text-gray-400 font-bold hidden sm:inline" key={autoRefreshCounter}>
                            ↻ Sincronizado
                        </span>
                    </div>
                </div>

                {/* BANNER DE ALERTA SE HOUVER ITENS PRONTOS */}
                {globalStats.readyItems > 0 && (
                    <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔔</span>
                            <span className="text-xs sm:text-sm font-black tracking-wide">
                                ATENÇÃO: Há {globalStats.readyItems} {globalStats.readyItems === 1 ? 'item pronto' : 'itens prontos'} na cozinha esperando para ser servido!
                            </span>
                        </div>
                        <button
                            onClick={() => setViewMode('ready_only')}
                            className="bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
                        >
                            Ver Prontos →
                        </button>
                    </div>
                )}

                {/* MÉTRICAS EM TEMPO REAL DO FLUXO */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-4 bg-gray-50/70 border-b">
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs text-center">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Mesas Abertas</span>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{globalStats.openTablesCount}</p>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs text-center">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Comandas</span>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{globalStats.openComandasCount}</p>
                    </div>

                    <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 shadow-2xs text-center">
                        <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Pendentes
                        </span>
                        <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{globalStats.pendingItems}</p>
                    </div>

                    <div className="bg-sky-50/80 p-3 rounded-2xl border border-sky-200 shadow-2xs text-center">
                        <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            Em Preparo
                        </span>
                        <p className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">{globalStats.preparingItems}</p>
                    </div>

                    <div className={`p-3 rounded-2xl border shadow-2xs text-center transition-all ${
                        globalStats.readyItems > 0 
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200' 
                            : 'bg-emerald-50/80 text-emerald-800 border-emerald-200'
                    }`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                            globalStats.readyItems > 0 ? 'text-white' : 'text-emerald-700'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${globalStats.readyItems > 0 ? 'bg-white animate-ping' : 'bg-emerald-500'}`}></span>
                            Prontos
                        </span>
                        <p className={`text-xl sm:text-2xl font-black mt-0.5 ${
                            globalStats.readyItems > 0 ? 'text-white' : 'text-emerald-700'
                        }`}>
                            {globalStats.readyItems}
                        </p>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs text-center">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Entregues</span>
                        <p className="text-xl sm:text-2xl font-black text-gray-700 mt-0.5">{globalStats.deliveredItems}</p>
                    </div>
                </div>

                {/* BARRA DE SELEÇÃO DE VISÃO E FILTROS */}
                <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                    {/* Botões de Alternância de Visão */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('unified')}
                            className={`flex-1 md:flex-initial whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                viewMode === 'unified'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            ✨ Visão Unificada ({unifiedCards.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('tables')}
                            className={`flex-1 md:flex-initial whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                viewMode === 'tables'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🍽️ Mesas ({tablesGrouped.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('comandas')}
                            className={`flex-1 md:flex-initial whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                viewMode === 'comandas'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🧾 Comandas ({comandasList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('ready_only')}
                            className={`flex-1 md:flex-initial whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                viewMode === 'ready_only'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-emerald-700 hover:text-emerald-900'
                            }`}
                        >
                            🔔 Prontos ({globalStats.readyItems})
                        </button>
                    </div>

                    {/* Filtro de Status e Busca Rápida */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full sm:w-auto bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                            <option value="all">🔍 Todos os Status de Itens</option>
                            <option value="ready">🔔 Com Itens Prontos</option>
                            <option value="preparing">🔥 Com Itens Em Preparo</option>
                            <option value="pending">⏳ Com Itens Pendentes</option>
                            <option value="served">✅ 100% Entregues</option>
                        </select>

                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Buscar mesa, comanda, cliente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-black"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTAGEM UNIFICADA DE CARDS DE ATENDIMENTO */}
            {filteredUnifiedCards.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center space-y-3">
                    <span className="text-4xl">🍽️</span>
                    <h3 className="text-lg font-black text-gray-900">Nenhum atendimento ativo encontrado</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Não há mesas ou comandas abertas correspondentes aos filtros selecionados. Novos pedidos lançados no salão aparecerão aqui instantaneamente.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {filteredUnifiedCards.map(card => {
                        const elapsed = getElapsedTime(card.timestamp);
                        const hasReady = card.readyCount > 0;
                        const hasPreparing = card.preparingCount > 0;
                        const hasPending = card.pendingCount > 0;

                        return (
                            <div
                                key={card.id}
                                className={`bg-white rounded-3xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                                    hasReady 
                                        ? 'border-emerald-400 ring-2 ring-emerald-400/30' 
                                        : hasPending
                                        ? 'border-gray-200 hover:border-orange-300'
                                        : 'border-gray-200'
                                }`}
                            >
                                {/* TOPO DO CARD */}
                                <div>
                                    <div className={`p-4 border-b flex items-start justify-between gap-3 ${
                                        hasReady ? 'bg-emerald-50/60' : 'bg-gray-50/70'
                                    }`}>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg ${
                                                    card.type === 'table' 
                                                        ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                }`}>
                                                    {card.badgeType}
                                                </span>
                                                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                                                    {card.title}
                                                </h3>
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 mt-0.5">
                                                {card.subtitle}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-base font-black text-emerald-600">
                                                R$ {card.totalAmount.toFixed(2).replace('.', ',')}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                elapsed.isUrgent 
                                                    ? 'bg-rose-100 text-rose-700 font-black animate-pulse' 
                                                    : elapsed.isWarning 
                                                    ? 'bg-amber-100 text-amber-800' 
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                ⏱️ {elapsed.text}
                                            </span>
                                        </div>
                                    </div>

                                    {/* STATUS BAR DO CARD (RESUMO VISUAL DOS ITENS) */}
                                    <div className="px-4 py-2.5 bg-white border-b flex items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {card.readyCount > 0 && (
                                                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-bounce">
                                                    <span>🔔</span> {card.readyCount} Pronto
                                                </span>
                                            )}
                                            {card.preparingCount > 0 && (
                                                <span className="bg-sky-100 text-sky-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span>🔥</span> {card.preparingCount} Preparo
                                                </span>
                                            )}
                                            {card.pendingCount > 0 && (
                                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span>⏳</span> {card.pendingCount} Pendente
                                                </span>
                                            )}
                                            {card.deliveredCount > 0 && card.readyCount === 0 && card.preparingCount === 0 && card.pendingCount === 0 && (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span>✓</span> {card.deliveredCount} Entregue
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-[11px] font-bold text-gray-400">
                                            {card.totalItems} {card.totalItems === 1 ? 'item' : 'itens'}
                                        </span>
                                    </div>

                                    {/* LISTA COMPACTA E INTERATIVA DE ITENS */}
                                    <div className="p-3 sm:p-4 space-y-3">
                                        {card.orders.map(order => (
                                            <div key={order.id} className="space-y-1.5">
                                                {/* Header do pedido/comanda dentro da mesa */}
                                                {card.orders.length > 1 && (
                                                    <div className="flex items-center justify-between text-xs font-black text-gray-700 bg-gray-50 px-2 py-1 rounded-lg">
                                                        <span>
                                                            {order.customerName || 'Cliente'} 
                                                            {order.comandaNumber && ` (Cmd #${order.comandaNumber})`}
                                                        </span>
                                                        <span className="text-gray-400 font-bold">
                                                            R$ {Number(order.totalPrice).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Linhas de Itens com Ciclo de Status Interativo */}
                                                {(order.items || []).map((item, itemIdx) => {
                                                    const status = getItemStatus(item);
                                                    const next = getNextStatus(status);

                                                    const badgeStyles: Record<ItemPreparationStatus, string> = {
                                                        'Pendente': 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
                                                        'Em Preparo': 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
                                                        'Pronto': 'bg-emerald-500 text-white border-emerald-600 shadow-xs hover:bg-emerald-600 animate-pulse',
                                                        'Entregue': 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                    };

                                                    return (
                                                        <div
                                                            key={itemIdx}
                                                            className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors border ${
                                                                status === 'Pronto'
                                                                    ? 'bg-emerald-50/80 border-emerald-300'
                                                                    : status === 'Entregue'
                                                                    ? 'bg-gray-50/50 border-gray-200 opacity-60'
                                                                    : 'bg-white border-gray-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                <span className="font-black text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                                                                    {item.quantity}x
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className={`font-bold truncate ${
                                                                        status === 'Entregue' ? 'line-through text-gray-400' : 'text-gray-800'
                                                                    }`}>
                                                                        {item.name}
                                                                    </p>
                                                                    {item.notes && (
                                                                        <p className="text-[10px] text-orange-600 font-bold truncate">
                                                                            Obs: {item.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Botão de Status: Clicar avança o status no ciclo! */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetItemStatus(order, itemIdx, next)}
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 ${badgeStyles[status]}`}
                                                                title={`Status atual: ${status}. Clique para mudar para ${next}`}
                                                            >
                                                                {status === 'Pendente' && '⏳ Pendente'}
                                                                {status === 'Em Preparo' && '🔥 Preparo'}
                                                                {status === 'Pronto' && '🔔 PRONTO!'}
                                                                {status === 'Entregue' && '✓ Entregue'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RODAPÉ COM AÇÕES RÁPIDAS */}
                                <div className="p-3 bg-gray-50/90 border-t flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setInspectOrder(card.orders[0])}
                                            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-black transition-colors shadow-2xs"
                                        >
                                            ⚙️ Gerenciar
                                        </button>

                                        {card.type === 'table' && onOpenTableDetail && card.tableNumber && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenTableDetail(card.tableNumber!)}
                                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-black transition-colors"
                                            >
                                                Abrir Mesa →
                                            </button>
                                        )}

                                        {card.type === 'comanda' && onOpenComandaDetail && card.comandaNumber && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenComandaDetail(card.comandaNumber!)}
                                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition-colors"
                                            >
                                                Abrir Comanda →
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Botão Rápido para Enviar Cozinha */}
                                        <button
                                            type="button"
                                            onClick={() => handleSendToKitchen(card.orders[0])}
                                            className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-transform active:scale-95 shadow-2xs"
                                            title="Enviar/Reimprimir Cozinha"
                                        >
                                            🍳
                                        </button>
                                        {/* Botão Rápido para Pedir Pré-Conta */}
                                        <button
                                            type="button"
                                            onClick={() => handleRequestBill(card.orders[0])}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-transform active:scale-95 shadow-2xs"
                                            title="Pedir Pré-Conta no Balcão"
                                        >
                                            🧾
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE GERENCIAMENTO COMPLETO / INSPEÇÃO DA MESA OU COMANDA */}
            {inspectOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header Modal */}
                        <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    {inspectOrder.tableNumber && (
                                        <span className="bg-orange-100 text-orange-800 text-xs font-black px-2.5 py-0.5 rounded-lg">
                                            Mesa {inspectOrder.tableNumber}
                                        </span>
                                    )}
                                    {inspectOrder.comandaNumber && (
                                        <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-lg">
                                            Comanda #{inspectOrder.comandaNumber}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mt-1">
                                    Cliente: {inspectOrder.customerName || 'Cliente Salão'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectOrder(null)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-black flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Corpo Modal com Fluxo dos Itens */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="flex flex-wrap items-center justify-between bg-orange-50/80 p-3.5 rounded-2xl border border-orange-100 gap-2">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Total Consumido</p>
                                    <p className="text-xl font-black text-gray-900">
                                        R$ {Number(inspectOrder.totalPrice).toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                
                                {/* Ações Rápidas em Massa */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleBatchSetStatus(inspectOrder, 'Pronto')}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-2xs"
                                    >
                                        🔔 Todos Prontos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBatchSetStatus(inspectOrder, 'Entregue')}
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-2xs"
                                    >
                                        ✓ Todos Entregues
                                    </button>
                                </div>
                            </div>

                            {/* Detalhamento dos Itens com Seletor Granular de Status */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                                    Monitor de Itens Lançados (Selecione o status de cada item)
                                </h4>

                                {(inspectOrder.items || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic text-center py-6">Nenhum item lançado ainda.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {inspectOrder.items.map((item, idx) => {
                                            const status = getItemStatus(item);

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-2xl border transition-all ${
                                                        status === 'Pronto'
                                                            ? 'bg-emerald-50 border-emerald-300'
                                                            : status === 'Em Preparo'
                                                            ? 'bg-sky-50/60 border-sky-200'
                                                            : status === 'Entregue'
                                                            ? 'bg-gray-50 border-gray-200 opacity-60'
                                                            : 'bg-white border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className={`font-black text-sm ${
                                                                status === 'Entregue' ? 'line-through text-gray-400' : 'text-gray-900'
                                                            }`}>
                                                                {item.quantity}x {item.name}
                                                            </p>
                                                            {item.notes && (
                                                                <p className="text-xs font-bold text-orange-600 mt-0.5">
                                                                    Obs: {item.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-black text-gray-700">
                                                            R$ {(item.price * (item.quantity || 1)).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>

                                                    {/* SELETOR DE STATUS EM 4 ETAPAS */}
                                                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-200/70">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetItemStatus(inspectOrder, idx, 'Pendente')}
                                                            className={`py-1 px-1.5 rounded-lg text-[10px] font-black uppercase text-center transition-all ${
                                                                status === 'Pendente'
                                                                    ? 'bg-amber-500 text-white shadow-2xs'
                                                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            ⏳ Pendente
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetItemStatus(inspectOrder, idx, 'Em Preparo')}
                                                            className={`py-1 px-1.5 rounded-lg text-[10px] font-black uppercase text-center transition-all ${
                                                                status === 'Em Preparo'
                                                                    ? 'bg-sky-500 text-white shadow-2xs'
                                                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            🔥 Preparo
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetItemStatus(inspectOrder, idx, 'Pronto')}
                                                            className={`py-1 px-1.5 rounded-lg text-[10px] font-black uppercase text-center transition-all ${
                                                                status === 'Pronto'
                                                                    ? 'bg-emerald-500 text-white shadow-2xs animate-pulse'
                                                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            🔔 Pronto
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetItemStatus(inspectOrder, idx, 'Entregue')}
                                                            className={`py-1 px-1.5 rounded-lg text-[10px] font-black uppercase text-center transition-all ${
                                                                status === 'Entregue'
                                                                    ? 'bg-gray-800 text-white shadow-2xs'
                                                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            ✓ Entregue
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rodapé com Ações de Impressão e Fechar */}
                        <div className="p-4 border-t bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => handleSendToKitchen(inspectOrder)}
                                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                >
                                    <span>🍳</span> Enviar Cozinha
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRequestBill(inspectOrder)}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                >
                                    <span>🧾</span> Pedir Conta (Balcão)
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectOrder(null)}
                                className="px-5 py-2 bg-gray-800 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterMonitor;
