import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllOrdersAdmin } from '../services/databaseService';
import { fetchRestaurantsSecure } from '../services/databaseService';
import type { Order, Restaurant } from '../types';
import Spinner from './Spinner';
import { getOrderFiscalVerification, formatFiscalTimestamp } from '../utils/fiscalStatus';
import FiscalStatusIcon from './FiscalStatusIcon';

interface RestaurantSalesSummary {
    restaurantId: number;
    restaurantName: string;
    city: string;
    totalOrders: number;
    cancelledOrders: number;
    completedOrders: number;
    nfEmittedCount: number;
    nfErrorCount: number;
    totalRevenue: number;
    deliveryCount: number;
    tableCount: number;
    pickupCount: number;
    deliveryFees: number;
    paymentBreakdown: Record<string, number>;
    ordersList: Order[];
}

const getOrderStatusBadgeClass = (status: string) => {
    if (status === 'Cancelado') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'Entregue') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'A Caminho') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (status === 'Preparando') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'Novo Pedido') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'Aguardando Pagamento') return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-purple-100 text-purple-700 border-purple-200';
};

const renderFiscalBadge = (order: Order) => {
    const info = getOrderFiscalVerification(order);
    if (info.state === 'authorized') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                <span>✅</span>
                <span>{info.label}</span>
            </span>
        );
    }
    if (info.state === 'processing') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                <span>⏳</span>
                <span>{info.label}</span>
            </span>
        );
    }
    if (info.state === 'error') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap" title={info.logText}>
                <span>⚠️</span>
                <span>{info.label}</span>
            </span>
        );
    }
    if (info.state === 'marked_only') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap" title={info.logText}>
                <span>🏷️</span>
                <span>{info.label}</span>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
            <span>—</span>
            <span>{info.label}</span>
        </span>
    );
};

const AdminSalesReport: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Date filters - default to today
    const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom'>('this_month');
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    // Selected Restaurant filter ('all' or specific restaurant ID)
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');
    // Search query for restaurant name
    const [searchQuery, setSearchQuery] = useState('');
    // Modal to view detailed orders of a restaurant
    const [detailRestaurant, setDetailRestaurant] = useState<RestaurantSalesSummary | null>(null);
    // Fiscal verification filter for global order history table
    const [historyFiscalFilter, setHistoryFiscalFilter] = useState<'all' | 'emitted' | 'not_emitted' | 'error'>('all');
    const [historyLimit, setHistoryLimit] = useState<number>(50);

    // Initial load
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [ordersData, restData] = await Promise.all([
                    fetchAllOrdersAdmin(),
                    fetchRestaurantsSecure()
                ]);
                setOrders(ordersData);
                setRestaurants(restData);
            } catch (err) {
                console.error("Erro ao carregar dados do relatório:", err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Helper to calculate start and end dates according to filter
    const dateRange = useMemo(() => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        if (dateFilterType === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'yesterday') {
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'this_week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'this_month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'last_month') {
            start.setMonth(start.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateFilterType === 'custom') {
            const s = new Date(startDate + 'T00:00:00');
            const e = new Date(endDate + 'T23:59:59');
            return { start: s, end: e };
        } else {
            // 'all'
            return { start: new Date(2020, 0, 1), end: new Date(2099, 11, 31) };
        }

        return { start, end };
    }, [dateFilterType, startDate, endDate]);

    // Filter orders by date range and restaurant
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const orderTime = new Date(order.timestamp).getTime();
            if (isNaN(orderTime)) return false;
            if (orderTime < dateRange.start.getTime() || orderTime > dateRange.end.getTime()) {
                return false;
            }
            if (selectedRestaurantId !== 'all' && String(order.restaurantId) !== selectedRestaurantId) {
                return false;
            }
            return true;
        });
    }, [orders, dateRange, selectedRestaurantId]);

    // Group sales by restaurant
    const summariesByRestaurant = useMemo(() => {
        const map = new Map<number, RestaurantSalesSummary>();

        // Pre-fill with all known restaurants or only those with orders
        const restMap = new Map<number, Restaurant>();
        restaurants.forEach(r => restMap.set(r.id, r));

        filteredOrders.forEach(order => {
            const rId = order.restaurantId;
            const rName = order.restaurantName || restMap.get(rId)?.name || `Restaurante #${rId}`;
            const rCity = restMap.get(rId)?.city || 'Guaranésia';

            if (!map.has(rId)) {
                map.set(rId, {
                    restaurantId: rId,
                    restaurantName: rName,
                    city: rCity,
                    totalOrders: 0,
                    cancelledOrders: 0,
                    completedOrders: 0,
                    nfEmittedCount: 0,
                    nfErrorCount: 0,
                    totalRevenue: 0,
                    deliveryCount: 0,
                    tableCount: 0,
                    pickupCount: 0,
                    deliveryFees: 0,
                    paymentBreakdown: {},
                    ordersList: []
                });
            }

            const item = map.get(rId)!;
            item.totalOrders += 1;
            item.ordersList.push(order);

            const fiscalCheck = getOrderFiscalVerification(order);
            if (fiscalCheck.isEmitted) item.nfEmittedCount += 1;
            else if (fiscalCheck.state === 'error') item.nfErrorCount += 1;

            if (order.status === 'Cancelado') {
                item.cancelledOrders += 1;
                return; // Do not sum revenue for cancelled orders
            }

            // Completed or in progress
            item.completedOrders += 1;
            const orderTotal = Number(order.totalPrice) || 0;
            item.totalRevenue += orderTotal;

            // Delivery vs Table vs Pickup
            if (order.tableNumber || order.comandaNumber) {
                item.tableCount += 1;
            } else if ((Number(order.deliveryFee) || 0) > 0 || (order.customerAddress && order.customerAddress.street)) {
                item.deliveryCount += 1;
                item.deliveryFees += Number(order.deliveryFee) || 0;
            } else {
                item.pickupCount += 1;
            }

            // Payments breakdown
            if (order.paymentHistory && order.paymentHistory.length > 0) {
                order.paymentHistory.forEach(p => {
                    let m = p.method.split('(')[0].trim();
                    if (m.toLowerCase().includes('dinheiro')) m = 'Dinheiro';
                    else if (m.toLowerCase().includes('pix')) m = 'Pix';
                    else if (m.toLowerCase().includes('alelo') || m.toLowerCase().includes('voucher')) m = 'Cartão Alelo (Voucher)';
                    else if (m.toLowerCase().includes('cartão') || m.toLowerCase().includes('cartao')) m = 'Cartão';
                    else if (m.toLowerCase().includes('conta')) m = 'Conta / Fiado';
                    item.paymentBreakdown[m] = (item.paymentBreakdown[m] || 0) + (Number(p.amount) || 0);
                });
            } else {
                let m = (order.paymentMethod || 'Outros').split('(')[0].trim();
                if (m.toLowerCase().includes('dinheiro')) m = 'Dinheiro';
                else if (m.toLowerCase().includes('pix')) m = 'Pix';
                else if (m.toLowerCase().includes('alelo') || m.toLowerCase().includes('voucher')) m = 'Cartão Alelo (Voucher)';
                else if (m.toLowerCase().includes('cartão') || m.toLowerCase().includes('cartao')) m = 'Cartão';
                else if (m.toLowerCase().includes('conta')) m = 'Conta / Fiado';
                item.paymentBreakdown[m] = (item.paymentBreakdown[m] || 0) + orderTotal;
            }
        });

        // Convert to array and filter by search query
        let list = Array.from(map.values());
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(item => item.restaurantName.toLowerCase().includes(q) || item.city.toLowerCase().includes(q));
        }

        // Sort descending by revenue
        return list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredOrders, restaurants, searchQuery]);

    // Overall Totals across all restaurants in the selected filter
    const globalTotals = useMemo(() => {
        return summariesByRestaurant.reduce(
            (acc, curr) => ({
                revenue: acc.revenue + curr.totalRevenue,
                orders: acc.orders + curr.completedOrders,
                cancelled: acc.cancelled + curr.cancelledOrders,
                deliveryFees: acc.deliveryFees + curr.deliveryFees,
                restaurantsCount: acc.restaurantsCount + 1
            }),
            { revenue: 0, orders: 0, cancelled: 0, deliveryFees: 0, restaurantsCount: 0 }
        );
    }, [summariesByRestaurant]);

    const restaurantNameMap = useMemo(() => {
        const map = new Map<number, string>();
        restaurants.forEach(r => map.set(r.id, r.name));
        return map;
    }, [restaurants]);

    const historyOrdersFiltered = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return filteredOrders.filter(order => {
            if (q) {
                const restName = (order.restaurantName || restaurantNameMap.get(order.restaurantId) || '').toLowerCase();
                const custName = (order.customerName || '').toLowerCase();
                const orderNum = String(order.order_number || order.id).toLowerCase();
                if (!restName.includes(q) && !custName.includes(q) && !orderNum.includes(q)) {
                    return false;
                }
            }
            const fiscal = getOrderFiscalVerification(order);
            if (historyFiscalFilter === 'emitted') return fiscal.isEmitted;
            if (historyFiscalFilter === 'not_emitted') return !fiscal.isEmitted && fiscal.state !== 'error' && fiscal.state !== 'processing';
            if (historyFiscalFilter === 'error') return fiscal.state === 'error' || fiscal.state === 'processing';
            return true;
        });
    }, [filteredOrders, searchQuery, historyFiscalFilter, restaurantNameMap]);

    const fiscalSummaryCounts = useMemo(() => {
        let emitted = 0;
        let notEmitted = 0;
        let errorOrProcessing = 0;
        filteredOrders.forEach(o => {
            const f = getOrderFiscalVerification(o);
            if (f.isEmitted) emitted += 1;
            else if (f.state === 'error' || f.state === 'processing') errorOrProcessing += 1;
            else notEmitted += 1;
        });
        return { emitted, notEmitted, errorOrProcessing, total: filteredOrders.length };
    }, [filteredOrders]);

    // Export CSV
    const handleExportCSV = () => {
        if (summariesByRestaurant.length === 0) return;

        const headers = ['Restaurante', 'Cidade', 'Vendas Concluídas', 'Total Faturado (R$)', 'Cancelados', 'Mesas/Comandas', 'Delivery', 'Retiradas', 'Taxas de Entrega'];
        const rows = summariesByRestaurant.map(s => [
            `"${s.restaurantName.replace(/"/g, '""')}"`,
            `"${s.city}"`,
            s.completedOrders,
            s.totalRevenue.toFixed(2).replace('.', ','),
            s.cancelledOrders,
            s.tableCount,
            s.deliveryCount,
            s.pickupCount,
            s.deliveryFees.toFixed(2).replace('.', ',')
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `relatorio_vendas_por_restaurante_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Spinner />
                <p className="text-gray-500 font-bold text-sm">Carregando relatório consolidado de vendas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Cabeçalho do Relatório */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">📊</span>
                            Relatório Geral de Vendas por Restaurante
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                            Acompanhe o faturamento, quantidade de pedidos e divisão de vendas separadas por restaurante.
                        </p>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                        title="Baixar planilha em formato CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Exportar CSV
                    </button>
                </div>

                {/* Filtros de Data e Seleção */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Período Rápido */}
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                            Período Pré-definido
                        </label>
                        <select
                            value={dateFilterType}
                            onChange={(e) => setDateFilterType(e.target.value as any)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                            <option value="today">Hoje</option>
                            <option value="yesterday">Ontem</option>
                            <option value="this_week">Esta Semana</option>
                            <option value="this_month">Este Mês</option>
                            <option value="last_month">Mês Anterior</option>
                            <option value="all">Todo o Histórico</option>
                            <option value="custom">Personalizado (Datas)</option>
                        </select>
                    </div>

                    {/* Datas Personalizadas */}
                    {dateFilterType === 'custom' ? (
                        <>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">Data Inicial</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">Data Final</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="sm:col-span-2 flex items-center">
                            <div className="text-xs bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 font-medium w-full">
                                <span className="font-bold">Intervalo selecionado: </span>
                                {dateRange.start.toLocaleDateString('pt-BR')} até {dateRange.end.toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    )}

                    {/* Filtrar por Restaurante específico */}
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1.5">
                            Filtrar Restaurante
                        </label>
                        <select
                            value={selectedRestaurantId}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                            <option value="all">Todos os Restaurantes</option>
                            {restaurants.map(r => (
                                <option key={r.id} value={String(r.id)}>
                                    {r.name} ({r.city})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Busca rápida por nome */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="🔍 Buscar restaurante na tabela abaixo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Cards de Métricas Consolidadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Faturamento Total do Período</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                        R$ {globalTotals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 font-bold mt-1">Vendas líquidas concluídas</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Total de Pedidos Concluídos</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">
                        {globalTotals.orders}
                    </p>
                    <p className="text-xs text-gray-400 font-bold mt-1">
                        Ticket Médio: R$ {globalTotals.orders > 0 ? (globalTotals.revenue / globalTotals.orders).toFixed(2).replace('.', ',') : '0,00'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Restaurantes com Vendas</p>
                    <p className="text-2xl font-black text-orange-600 mt-1">
                        {globalTotals.restaurantsCount}
                    </p>
                    <p className="text-xs text-gray-400 font-bold mt-1">Lojas ativas no período</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Pedidos Cancelados</p>
                    <p className="text-2xl font-black text-rose-500 mt-1">
                        {globalTotals.cancelled}
                    </p>
                    <p className="text-xs text-gray-400 font-bold mt-1">Não computados na receita</p>
                </div>
            </div>

            {/* Tabela de Vendas por Restaurante */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">
                        Detalhamento por Restaurante ({summariesByRestaurant.length})
                    </h3>
                    <span className="text-xs font-bold text-gray-500">
                        Clique em &quot;Ver Pedidos&quot; para abrir o extrato completo
                    </span>
                </div>

                {summariesByRestaurant.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-bold">
                        Nenhum pedido ou venda encontrada para o período e critérios selecionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100/70 border-b text-gray-500 uppercase font-black tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3.5 px-4">Restaurante</th>
                                    <th className="py-3.5 px-3">Cidade</th>
                                    <th className="py-3.5 px-3 text-center">Pedidos</th>
                                    <th className="py-3.5 px-3 text-center">Notas Fiscais</th>
                                    <th className="py-3.5 px-3 text-right">Faturamento</th>
                                    <th className="py-3.5 px-3 text-center">Tipo de Atendimento</th>
                                    <th className="py-3.5 px-3 text-center">Pagamentos Mais Usados</th>
                                    <th className="py-3.5 px-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {summariesByRestaurant.map((item) => (
                                    <tr key={item.restaurantId} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="font-black text-gray-900 text-sm">{item.restaurantName}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">ID #{item.restaurantId}</div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                                                {item.city}
                                            </span>
                                        </td>
                                        <td className="py-4 px-3 text-center">
                                            <span className="font-black text-gray-800 text-xs">{item.completedOrders}</span>
                                            {item.cancelledOrders > 0 && (
                                                <div className="text-[10px] text-rose-500 font-semibold">
                                                    ({item.cancelledOrders} canc.)
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-3 text-center">
                                            {item.nfEmittedCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    ✅ {item.nfEmittedCount} emitida{item.nfEmittedCount > 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400">0 emitidas</span>
                                            )}
                                            {item.nfErrorCount > 0 && (
                                                <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                                                    ⚠️ {item.nfErrorCount} erro{item.nfErrorCount > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-3 text-right">
                                            <span className="font-black text-emerald-600 text-sm">
                                                R$ {item.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                Médio: R$ {item.completedOrders > 0 ? (item.totalRevenue / item.completedOrders).toFixed(2).replace('.', ',') : '0,00'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold">
                                                {item.deliveryCount > 0 && (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                                        🛵 {item.deliveryCount} Entregas
                                                    </span>
                                                )}
                                                {item.tableCount > 0 && (
                                                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                                                        🍽️ {item.tableCount} Mesas/Comandas
                                                    </span>
                                                )}
                                                {item.pickupCount > 0 && (
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                                        🛍️ {item.pickupCount} Balcão
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto text-[10px]">
                                                {(Object.entries(item.paymentBreakdown) as [string, number][])
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 3)
                                                    .map(([method, amount]) => (
                                                        <span key={method} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                                                            {method}: R$ {Number(amount).toFixed(0)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <button
                                                onClick={() => setDetailRestaurant(item)}
                                                className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors shadow-sm"
                                            >
                                                Ver Pedidos
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tabela de Histórico de Pedidos com Verificação Fiscal Separada */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                            <span>🧾</span>
                            <span>Histórico de Pedidos &amp; Log de Verificação Fiscal ({historyOrdersFiltered.length})</span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Diferencia claramente o <strong>Status do Pedido</strong> (entrega/preparo) do <strong>Status da Nota Fiscal (SEFAZ)</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setHistoryFiscalFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${historyFiscalFilter === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Todos ({fiscalSummaryCounts.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryFiscalFilter('emitted')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${historyFiscalFilter === 'emitted' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            ✅ NF Emitida ({fiscalSummaryCounts.emitted})
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryFiscalFilter('not_emitted')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${historyFiscalFilter === 'not_emitted' ? 'bg-slate-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            — Não Emitida ({fiscalSummaryCounts.notEmitted})
                        </button>
                        <button
                            type="button"
                            onClick={() => setHistoryFiscalFilter('error')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${historyFiscalFilter === 'error' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                        >
                            ⚠️ Erro / Pendente ({fiscalSummaryCounts.errorOrProcessing})
                        </button>
                    </div>
                </div>

                {historyOrdersFiltered.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-bold text-xs">
                        Nenhum pedido encontrado para os filtros selecionados neste período.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100/70 border-b text-gray-500 uppercase font-black tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Pedido #</th>
                                        <th className="py-3 px-3">Restaurante / Cliente</th>
                                        <th className="py-3 px-3 text-right">Valor</th>
                                        <th className="py-3 px-3 text-center">Status do Pedido</th>
                                        <th className="py-3 px-3 text-center">Status da Nota Fiscal</th>
                                        <th className="py-3 px-4">Log de Verificação Fiscal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {historyOrdersFiltered.slice(0, historyLimit).map(ord => {
                                        const fiscalInfo = getOrderFiscalVerification(ord);
                                        const restLabel = ord.restaurantName || restaurantNameMap.get(ord.restaurantId) || `Restaurante #${ord.restaurantId}`;
                                        const verifiedAt = formatFiscalTimestamp(fiscalInfo.updatedAt);

                                        return (
                                            <tr key={ord.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <FiscalStatusIcon order={ord} />
                                                        <div>
                                                            <div className="font-mono font-black text-gray-900">
                                                                #{String(ord.order_number || ord.id.slice(0, 6)).padStart(3, '0')}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                {new Date(ord.timestamp).toLocaleString('pt-BR')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-bold text-gray-900">{restLabel}</div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {ord.customerName || 'Cliente Balcão'} • {ord.paymentMethod || 'Dinheiro'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                                                    R$ {Number(ord.totalPrice || 0).toFixed(2).replace('.', ',')}
                                                </td>
                                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                                    <span className={`inline-block border text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getOrderStatusBadgeClass(ord.status)}`}>
                                                        {ord.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                                    {renderFiscalBadge(ord)}
                                                </td>
                                                <td className="py-3 px-4 max-w-xs">
                                                    <div
                                                        className={`text-[11px] font-medium leading-snug ${
                                                            fiscalInfo.state === 'error'
                                                                ? 'text-rose-700'
                                                                : fiscalInfo.isEmitted
                                                                    ? 'text-emerald-800'
                                                                    : fiscalInfo.state === 'marked_only'
                                                                        ? 'text-purple-700'
                                                                        : 'text-gray-400'
                                                        }`}
                                                        title={fiscalInfo.key ? `Chave completa: ${fiscalInfo.key}` : fiscalInfo.logText}
                                                    >
                                                        {fiscalInfo.logText}
                                                    </div>
                                                    {verifiedAt && (
                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                            Verificado em {verifiedAt}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {historyOrdersFiltered.length > historyLimit && (
                            <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                                <span className="text-gray-500 font-semibold">
                                    Exibindo {historyLimit} de {historyOrdersFiltered.length} pedidos do período.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setHistoryLimit(prev => prev + 100)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
                                >
                                    Carregar mais 100
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Detalhamento dos Pedidos de um Restaurante Específico */}
            {detailRestaurant && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">
                                    {detailRestaurant.restaurantName}
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-0.5">
                                    Extrato de pedidos no período ({detailRestaurant.ordersList.length} pedidos • {detailRestaurant.nfEmittedCount} NF emitida{detailRestaurant.nfEmittedCount !== 1 ? 's' : ''})
                                </p>
                            </div>
                            <button
                                onClick={() => setDetailRestaurant(null)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-black flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-600">Total Faturado</p>
                                    <p className="text-lg font-black text-gray-900">
                                        R$ {detailRestaurant.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-600">Concluídos</p>
                                    <p className="text-lg font-black text-gray-900">
                                        {detailRestaurant.completedOrders}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-700">NF Emitidas (SEFAZ)</p>
                                    <p className="text-lg font-black text-emerald-700">
                                        {detailRestaurant.nfEmittedCount}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-600">Cancelados</p>
                                    <p className="text-lg font-black text-rose-600">
                                        {detailRestaurant.cancelledOrders}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-gray-600">Histórico de Pedidos &amp; Verificação Fiscal</h4>
                                <div className="overflow-x-auto border rounded-xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-100/80 border-b text-[10px] font-black uppercase text-gray-500">
                                            <tr>
                                                <th className="py-2.5 px-3">Pedido #</th>
                                                <th className="py-2.5 px-3">Cliente / Pagamento</th>
                                                <th className="py-2.5 px-3 text-right">Valor</th>
                                                <th className="py-2.5 px-3 text-center">Status do Pedido</th>
                                                <th className="py-2.5 px-3 text-center">Nota Fiscal (SEFAZ)</th>
                                                <th className="py-2.5 px-3">Log de Verificação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {detailRestaurant.ordersList.map(ord => {
                                                const fiscalInfo = getOrderFiscalVerification(ord);
                                                const verifiedAt = formatFiscalTimestamp(fiscalInfo.updatedAt);
                                                return (
                                                    <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <FiscalStatusIcon order={ord} size="sm" />
                                                                <div>
                                                                    <div className="font-mono font-black text-gray-900">
                                                                        #{String(ord.order_number || ord.id.slice(0, 6)).padStart(3, '0')}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {new Date(ord.timestamp).toLocaleString('pt-BR')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-gray-800">{ord.customerName}</span>
                                                                {ord.tableNumber && (
                                                                    <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                                                        Mesa {ord.tableNumber}
                                                                    </span>
                                                                )}
                                                                {ord.comandaNumber && (
                                                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                                                        Comanda #{ord.comandaNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                                {ord.paymentMethod || 'Dinheiro'}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                                                            R$ {Number(ord.totalPrice).toFixed(2).replace('.', ',')}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            <span className={`inline-block border text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getOrderStatusBadgeClass(ord.status)}`}>
                                                                {ord.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            {renderFiscalBadge(ord)}
                                                        </td>
                                                        <td className="py-2.5 px-3 max-w-[240px]">
                                                            <div
                                                                className={`text-[10px] font-medium leading-snug ${
                                                                    fiscalInfo.state === 'error'
                                                                        ? 'text-rose-700'
                                                                        : fiscalInfo.isEmitted
                                                                            ? 'text-emerald-800'
                                                                            : fiscalInfo.state === 'marked_only'
                                                                                ? 'text-purple-700'
                                                                                : 'text-gray-400'
                                                                }`}
                                                                title={fiscalInfo.key ? `Chave: ${fiscalInfo.key}` : fiscalInfo.logText}
                                                            >
                                                                {fiscalInfo.logText}
                                                            </div>
                                                            {verifiedAt && (
                                                                <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                                                                    {verifiedAt}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setDetailRestaurant(null)}
                                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs uppercase transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSalesReport;
