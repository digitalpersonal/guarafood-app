import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { fetchFiscalOrdersAdmin, fetchRestaurantsSecure } from '../services/databaseService';
import type { Order, Restaurant } from '../types';
import Spinner from './Spinner';
import { getOrderFiscalVerification, formatFiscalTimestamp } from '../utils/fiscalStatus';
import FiscalStatusIcon from './FiscalStatusIcon';

interface DailyFiscalData {
    date: string;
    displayDate: string;
    totalInvoices: number;
    authorized: number;
    pending: number;
    error: number;
    totalAmount: number;
}

const toLocalDateKey = (dateInput: string | Date): string => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getOrderFiscalClassification = (o: Order): 'authorized' | 'error' | 'pending' | null => {
    const fiscalMeta = o.payment_details?.fiscal;
    const raw = o as any;
    const status = String(o.fiscalStatus || raw.fiscal_status || fiscalMeta?.status || '').toLowerCase();
    const key = o.fiscalKey || raw.fiscal_key || fiscalMeta?.chave;

    // Apenas pedidos que possuem transmissão/status fiscal real ou chave NFC-e entram no histórico de notas fiscais.
    // Pedidos apenas marcados com fiscalExport ("NF: Sim") ainda NÃO são notas emitidas.
    if (!status && !key) return null;
    if (status === 'rejeitado' || status === 'erro_autorizacao' || status === 'cancelado') return 'error';
    if (status === 'processando') return 'pending';
    if (status === 'autorizado' || Boolean(key)) return 'authorized';
    return null;
};

export const FiscalEmissionChart: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');
    const [timeframe, setTimeframe] = useState<number>(30); // 30 days default

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, restData] = await Promise.all([
                fetchFiscalOrdersAdmin(),
                fetchRestaurantsSecure()
            ]);
            setOrders(ordersData);
            setRestaurants(restData);
        } catch (err) {
            console.error("Erro ao carregar dados fiscais:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handleRefresh = () => {
            loadData();
        };
        window.addEventListener('guarafood:update-orders', handleRefresh);
        return () => window.removeEventListener('guarafood:update-orders', handleRefresh);
    }, []);

    const restaurantNameMap = useMemo(
        () => new Map(restaurants.map(r => [String(r.id), r.name])),
        [restaurants]
    );

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (selectedRestaurantId !== 'all' && String(o.restaurantId) !== selectedRestaurantId) {
                return false;
            }
            return true;
        });
    }, [orders, selectedRestaurantId]);

    const recentFiscalOrders = useMemo(() => {
        return filteredOrders
            .filter(o => getOrderFiscalClassification(o) !== null)
            .slice(0, 12);
    }, [filteredOrders]);

    // Process data for the last N days
    const chartData = useMemo(() => {
        const result: DailyFiscalData[] = [];
        const now = new Date();

        // Generate map for the last 'timeframe' days based strictly on real orders (local timezone)
        for (let i = timeframe - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = toLocalDateKey(d);
            const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            // Encontra pedidos reais neste dia que possuem emissão fiscal registrada
            const dayOrders = filteredOrders.filter(o => {
                if (!o.timestamp) return false;
                const oDate = toLocalDateKey(o.timestamp);
                return oDate === dateStr && getOrderFiscalClassification(o) !== null;
            });

            let authorized = 0;
            let pending = 0;
            let error = 0;
            let totalAmount = 0;

            dayOrders.forEach(o => {
                const cls = getOrderFiscalClassification(o);
                if (cls === 'authorized') {
                    authorized += 1;
                    totalAmount += Number(o.totalPrice || (o as any).total || 0);
                } else if (cls === 'error') {
                    error += 1;
                } else {
                    pending += 1;
                }
            });

            result.push({
                date: dateStr,
                displayDate,
                totalInvoices: dayOrders.length,
                authorized,
                pending,
                error,
                totalAmount
            });
        }

        return result;
    }, [filteredOrders, timeframe]);

    // Summary statistics
    const stats = useMemo(() => {
        let total = 0;
        let auth = 0;
        let revenue = 0;
        chartData.forEach(d => {
            total += d.totalInvoices;
            auth += d.authorized;
            revenue += d.totalAmount;
        });
        const successRate = total > 0 ? ((auth / total) * 100).toFixed(1) : '100.0';
        return { total, auth, revenue, successRate };
    }, [chartData]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header / Filter Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <span>📊</span>
                        <span>Performance de Emissão Fiscal (SEFAZ / Nuvem Fiscal)</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Acompanhamento diário de notas fiscais de consumidor eletrônicas (NFC-e / NF-e) emitidas nos caixas e delivery.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Restaurant Filter */}
                    <select
                        value={selectedRestaurantId}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">Todos os Restaurantes (Plataforma)</option>
                        {restaurants.map(r => (
                            <option key={r.id} value={String(r.id)}>{r.name}</option>
                        ))}
                    </select>

                    {/* Timeframe Filter */}
                    <div className="flex rounded-xl bg-gray-100 p-1">
                        <button
                            onClick={() => setTimeframe(7)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === 7 ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}
                        >
                            7 Dias
                        </button>
                        <button
                            onClick={() => setTimeframe(15)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === 15 ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}
                        >
                            15 Dias
                        </button>
                        <button
                            onClick={() => setTimeframe(30)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === 30 ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}
                        >
                            30 Dias
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={loadData}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                        title="Recarregar emissões recentes"
                    >
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Total de Notas Emitidas</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.total}</h3>
                        <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">↗ Nos últimos {timeframe} dias</span>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        📄
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Notas Autorizadas</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.auth}</h3>
                        <span className="text-[11px] text-gray-500 font-semibold mt-1 inline-block">SEFAZ Autorizada</span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        ✅
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Taxa de Sucesso</p>
                        <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.successRate}%</h3>
                        <span className="text-[11px] text-blue-600 font-bold mt-1 inline-block">SLA de Transmissão</span>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        ⚡
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Volume Fiscal Autorizado (R$)</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">
                            R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">Soma das notas emitidas/autorizadas</span>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        💰
                    </div>
                </div>
            </div>

            {/* Main Recharts Bar Chart Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-base font-black text-gray-900">Volume Diário de Emissão de Notas Fiscais</h3>
                        <p className="text-xs text-gray-500">Distribuição por dia (Autorizadas vs Pendentes/Erros)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> Autorizadas</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded-full inline-block"></span> Pendentes</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-500 rounded-full inline-block"></span> Erros/Rejeitadas</span>
                    </div>
                </div>

                <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                                dataKey="displayDate" 
                                tick={{ fontSize: 11, fill: '#6b7280' }} 
                                tickLine={false} 
                                axisLine={{ stroke: '#e5e7eb' }} 
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#6b7280' }} 
                                tickLine={false} 
                                axisLine={false} 
                                allowDecimals={false}
                            />
                            <Tooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload as DailyFiscalData;
                                        return (
                                            <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-gray-800">
                                                <p className="font-bold text-gray-300 border-b border-gray-800 pb-1">Data: {data.date}</p>
                                                <p className="text-emerald-400 font-semibold">Autorizadas: {data.authorized}</p>
                                                <p className="text-amber-300 font-semibold">Pendentes: {data.pending}</p>
                                                <p className="text-rose-400 font-semibold">Erros: {data.error}</p>
                                                <p className="text-gray-300 font-bold pt-1 border-t border-gray-800">
                                                    Total Faturado: R$ {data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="authorized" name="Autorizadas" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="pending" name="Pendentes" stackId="a" fill="#fbbf24" />
                            <Bar dataKey="error" name="Erros" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Fiscal Transmissions Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-base font-black text-gray-900 mb-4">Últimas Transmissões Fiscais Registradas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold">
                                <th className="pb-3 px-3">Pedido #</th>
                                <th className="pb-3 px-3">Restaurante</th>
                                <th className="pb-3 px-3">Cliente</th>
                                <th className="pb-3 px-3">Valor (R$)</th>
                                <th className="pb-3 px-3">Status do Pedido</th>
                                <th className="pb-3 px-3">Status Nota Fiscal</th>
                                <th className="pb-3 px-3">Log de Verificação</th>
                                <th className="pb-3 px-3 text-right">Data/Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentFiscalOrders.map((order, idx) => {
                                const cls = getOrderFiscalClassification(order);
                                const fiscalInfo = getOrderFiscalVerification(order);
                                const verifiedAt = formatFiscalTimestamp(fiscalInfo.updatedAt);
                                const restLabel = restaurantNameMap.get(String(order.restaurantId)) || order.restaurantName || `Restaurante #${order.restaurantId}`;
                                const orderAmount = Number(order.totalPrice || (order as any).total || 0);
                                return (
                                    <tr key={order.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-3 font-bold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <FiscalStatusIcon order={order} size="sm" />
                                                <span>#{order.order_number || order.id.substring(0, 6)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-gray-700 font-medium">{restLabel}</td>
                                        <td className="py-3 px-3 text-gray-600">{order.customerName || 'Cliente Balcão'}</td>
                                        <td className="py-3 px-3 font-bold text-gray-900">R$ {orderAmount.toFixed(2)}</td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border inline-block ${
                                                order.status === 'Cancelado'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : order.status === 'Entregue'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                                {order.status || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`border px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                                                cls === 'error'
                                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                                    : cls === 'authorized'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                <span>{cls === 'error' ? '❌' : cls === 'authorized' ? '✅' : '⏳'}</span> 
                                                {cls === 'error' ? 'Rejeitada' : cls === 'authorized' ? 'Autorizada (NFC-e)' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-[10px] text-gray-600 max-w-[220px]" title={fiscalInfo.key || fiscalInfo.logText}>
                                            <div className="truncate font-medium">{fiscalInfo.logText}</div>
                                            {verifiedAt && <div className="text-[9px] text-gray-400 font-mono">Log: {verifiedAt}</div>}
                                        </td>
                                        <td className="py-3 px-3 text-right text-gray-400 whitespace-nowrap">
                                            {order.timestamp ? new Date(order.timestamp).toLocaleString('pt-BR') : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {recentFiscalOrders.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-6 text-gray-400">
                                        Nenhuma transmissão fiscal registrada no período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
