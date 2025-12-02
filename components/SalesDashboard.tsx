
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToOrders } from '../services/orderService';
import type { Order } from '../types';
import Spinner from './Spinner';
import BarChart from './BarChart';
import DebtManager from './DebtManager';

// --- ICONS ---
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25c0 1.242-1.008 2.25-2.25 2.25H5.25A2.25 2.25 0 013 18.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" /></svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const ChartPieIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
);

const StatCard: React.FC<{ title: string; value: string | number; subtext?: string; color?: string }> = ({ title, value, subtext, color = 'text-gray-800' }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4" style={{ borderLeftColor: color === 'text-green-600' ? '#16a34a' : color === 'text-red-600' ? '#dc2626' : color === 'text-blue-600' ? '#2563eb' : '#f97316' }}>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className={`text-2xl font-extrabold mt-2 ${color}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
);

type DateRangeOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const SalesDashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'debts'>('overview');
    
    // Date Filtering State
    const [dateRange, setDateRange] = useState<DateRangeOption>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const unsubscribe = subscribeToOrders((allOrders) => {
            setOrders(allOrders);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Helper to filter orders based on selected range
    const filteredOrders = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        // Reset hours for accurate comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (dateRange) {
            case 'today':
                // start and end are already today
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                // Last 7 days
                start.setDate(now.getDate() - 6);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1); // First day of month
                break;
            case 'custom':
                if (customStart) start = new Date(customStart + 'T00:00:00');
                if (customEnd) end = new Date(customEnd + 'T23:59:59');
                break;
        }

        return orders.filter(o => {
            const orderDate = new Date(o.timestamp);
            return orderDate >= start && orderDate <= end;
        });
    }, [orders, dateRange, customStart, customEnd]);

    // Financial Calculations
    const metrics = useMemo(() => {
        // Only count valid orders (not cancelled) for revenue
        const validOrders = filteredOrders.filter(o => o.status !== 'Cancelado');
        const cancelledOrders = filteredOrders.filter(o => o.status === 'Cancelado');

        // Gross: Everything sold (including 'pending' payments)
        const totalRevenue = validOrders.reduce((acc, order) => acc + order.totalPrice, 0);
        
        // Net/Cash: Only what is marked as 'paid'
        const cashInHand = validOrders
            .filter(o => !o.payment_details && (o.paymentMethod !== 'Marcar na minha conta' && (!('paymentStatus' in o) || (o as any).paymentStatus === 'paid')))
            .reduce((acc, order) => acc + order.totalPrice, 0);

        // Pending: 'Marcar na conta' or explicit pending status
        const pendingRevenue = validOrders
            .filter(o => o.paymentMethod === 'Marcar na minha conta' || ((o as any).paymentStatus === 'pending'))
            .reduce((acc, order) => acc + order.totalPrice, 0);

        const deliveryFees = validOrders.reduce((acc, order) => acc + (order.deliveryFee || 0), 0);
        const ticketAverage = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

        // Group by Payment Method
        const paymentMethods = validOrders.reduce((acc, order) => {
            // Clean up payment method string (remove "Troco para...")
            let method = order.paymentMethod.split('(')[0].trim();
            if (method === 'Marcar na minha conta') method = 'Fiado / Conta';
            acc[method] = (acc[method] || 0) + order.totalPrice;
            return acc;
        }, {} as Record<string, number>);

        const paymentChartData = Object.entries(paymentMethods)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value); // Descending

        // Group by Day (for the bar chart)
        const salesByDay = validOrders.reduce((acc, order) => {
            const date = new Date(order.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            acc[date] = (acc[date] || 0) + order.totalPrice;
            return acc;
        }, {} as Record<string, number>);

        const timelineData = Object.entries(salesByDay)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => {
                const [d1Str, m1Str] = a.label.split('/');
                const [d2Str, m2Str] = b.label.split('/');
                const d1 = parseInt(d1Str || '0', 10);
                const m1 = parseInt(m1Str || '0', 10);
                const d2 = parseInt(d2Str || '0', 10);
                const m2 = parseInt(m2Str || '0', 10);
                if (m1 !== m2) return Number(m1) - Number(m2);
                return Number(d1) - Number(d2);
            });

        return {
            totalRevenue,
            cashInHand,
            pendingRevenue,
            deliveryFees,
            ticketAverage,
            count: validOrders.length,
            cancelledCount: cancelledOrders.length,
            cancelledValue: cancelledOrders.reduce((acc, o) => acc + o.totalPrice, 0),
            paymentChartData,
            timelineData
        };
    }, [filteredOrders]);

    const handleExportCSV = () => {
        if (filteredOrders.length === 0) {
            alert("Não há dados para exportar no período selecionado.");
            return;
        }

        const separator = ';';
        const headers = ['ID', 'Data', 'Cliente', 'Status', 'Pagamento', 'Total', 'Taxa Entrega', 'Status Pagamento'];
        const rows = filteredOrders.map(order => [
            order.id.substring(0, 6),
            new Date(order.timestamp).toLocaleString('pt-BR'),
            `"${order.customerName}"`,
            order.status,
            `"${order.paymentMethod}"`,
            order.totalPrice.toFixed(2).replace('.', ','),
            (order.deliveryFee || 0).toFixed(2).replace('.', ','),
            order.paymentMethod === 'Marcar na minha conta' || (order as any).paymentStatus === 'pending' ? 'Pendente' : 'Pago'
        ]);

        const csvContent = [headers.join(separator), ...rows.map(r => r.join(separator))].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_guarafood_${dateRange}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <Spinner message="Carregando financeiro..." />;

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="bg-white p-2 rounded-lg shadow-sm border flex space-x-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeTab === 'overview' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Visão Geral & Fechamento
                </button>
                <button
                    onClick={() => setActiveTab('debts')}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeTab === 'debts' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Contas a Receber (Fiado)
                </button>
            </div>

            {activeTab === 'debts' ? (
                <DebtManager orders={orders} />
            ) : (
                <>
                    {/* Date Filters */}
                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                                <CalendarIcon className="w-5 h-5 text-gray-500" />
                                <span className="font-semibold text-gray-700 mr-2">Período:</span>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    {(['today', 'yesterday', 'week', 'month', 'custom'] as DateRangeOption[]).map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setDateRange(option)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateRange === option ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {option === 'today' ? 'Hoje' : 
                                             option === 'yesterday' ? 'Ontem' :
                                             option === 'week' ? '7 Dias' :
                                             option === 'month' ? 'Mês' : 'Personalizado'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {dateRange === 'custom' && (
                                <div className="flex items-center gap-2 text-sm">
                                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-1.5 border rounded bg-gray-50" />
                                    <span className="text-gray-400">até</span>
                                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-1.5 border rounded bg-gray-50" />
                                </div>
                            )}

                            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm whitespace-nowrap">
                                <DownloadIcon className="w-4 h-4" /> Exportar CSV
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard 
                            title="Faturamento Bruto" 
                            value={`R$ ${metrics.totalRevenue.toFixed(2)}`} 
                            subtext={`${metrics.count} pedidos realizados`}
                            color="text-blue-600"
                        />
                        <StatCard 
                            title="Dinheiro em Caixa" 
                            value={`R$ ${metrics.cashInHand.toFixed(2)}`} 
                            subtext="Pix, Dinheiro, Cartão"
                            color="text-green-600"
                        />
                        <StatCard 
                            title="A Receber (Fiado)" 
                            value={`R$ ${metrics.pendingRevenue.toFixed(2)}`} 
                            subtext="Vendas marcadas na conta"
                            color="text-orange-600"
                        />
                        <StatCard 
                            title="Ticket Médio" 
                            value={`R$ ${metrics.ticketAverage.toFixed(2)}`} 
                            subtext="Média por pedido"
                            color="text-gray-800"
                        />
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center">
                            <div>
                                <h4 className="text-red-800 font-bold text-sm uppercase">Cancelamentos</h4>
                                <p className="text-red-600 text-lg font-bold">{metrics.cancelledCount} pedidos</p>
                            </div>
                            <span className="text-red-400 font-mono text-sm">Perda: R$ {metrics.cancelledValue.toFixed(2)}</span>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                            <div>
                                <h4 className="text-blue-800 font-bold text-sm uppercase">Taxas de Entrega</h4>
                                <p className="text-blue-600 text-lg font-bold">Total Arrecadado</p>
                            </div>
                            <span className="text-blue-500 font-mono text-xl">R$ {metrics.deliveryFees.toFixed(2)}</span>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                            <div>
                                <h4 className="text-gray-600 font-bold text-sm uppercase">Lucro Aproximado</h4>
                                <p className="text-xs text-gray-400">(Bruto - Taxas)</p>
                            </div>
                            <span className="text-gray-700 font-mono text-xl font-bold">R$ {(metrics.totalRevenue - metrics.deliveryFees).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Charts Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-orange-500" />
                                Evolução das Vendas ({metrics.timelineData.length} dias)
                            </h3>
                            {metrics.timelineData.length > 0 ? (
                                <BarChart data={metrics.timelineData} title="" />
                            ) : (
                                <p className="text-gray-400 text-center py-10">Sem dados neste período</p>
                            )}
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <ChartPieIcon className="w-5 h-5 text-orange-500" />
                                Formas de Pagamento
                            </h3>
                            <div className="space-y-4">
                                {metrics.paymentChartData.map((item, index) => (
                                    <div key={index} className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block text-gray-600">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-orange-600">
                                                    R$ {item.value.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-100">
                                            <div style={{ width: `${(item.value / metrics.totalRevenue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"></div>
                                        </div>
                                    </div>
                                ))}
                                {metrics.paymentChartData.length === 0 && <p className="text-gray-400 text-center">Sem dados</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesDashboard;
