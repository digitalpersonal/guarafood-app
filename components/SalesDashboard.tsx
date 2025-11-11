
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToOrders } from '../services/orderService';
import type { Order } from '../types';
import Spinner from './Spinner';
import BarChart from './BarChart';

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const SalesDashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // FIX: The subscribeToOrders function was updated to make restaurantId optional. This call is now correct.
        const unsubscribe = subscribeToOrders((allOrders) => {
            setOrders(allOrders);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const salesMetrics = useMemo(() => {
        const completedOrders = orders.filter(o => o.status === 'Entregue');
        const totalRevenue = completedOrders.reduce((acc, order) => acc + order.totalPrice, 0);
        const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

        return {
            totalRevenue,
            averageOrderValue,
            completedOrdersCount: completedOrders.length,
            completedOrders,
        };
    }, [orders]);
    
    const ordersPerDay = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentOrders = orders.filter(o => new Date(o.timestamp) >= thirtyDaysAgo && o.status === 'Entregue');

        const dailyCounts = recentOrders.reduce((acc, order) => {
            const date = new Date(order.timestamp).toLocaleDateString('pt-BR');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        
        return Object.entries(dailyCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => new Date(a.label.split('/').reverse().join('-')).getTime() - new Date(b.label.split('/').reverse().join('-')).getTime());

    }, [orders]);

    const handleExportCSV = () => {
        if (salesMetrics.completedOrders.length === 0) {
            alert("Não há pedidos concluídos para exportar.");
            return;
        }

        const { totalRevenue, averageOrderValue, completedOrdersCount, completedOrders } = salesMetrics;
        const separator = ';';

        const escapeCSV = (field: any): string => {
            const stringField = String(field ?? '');
            if (stringField.includes(separator) || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const toBRL = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

        const summaryRows = [
            ['Resumo das Vendas'],
            ['Receita Total', toBRL(totalRevenue)],
            ['Ticket Médio', toBRL(averageOrderValue)],
            ['Pedidos Concluídos', String(completedOrdersCount)],
            []
        ];

        const detailHeaders = ['ID do Pedido', 'Data', 'Cliente', 'Restaurante', 'Total', 'Status'];
        const detailRows = completedOrders.map(order => [
            order.id.substring(0, 8),
            new Date(order.timestamp).toLocaleString('pt-BR'),
            order.customerName,
            order.restaurantName,
            order.totalPrice.toFixed(2).replace('.', ','),
            order.status
        ]);

        const allRows = [...summaryRows, detailHeaders, ...detailRows];
        const csvContent = allRows.map(row => row.map(escapeCSV).join(separator)).join('\n');
        
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "relatorio_de_vendas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <Spinner message="Calculando métricas de vendas..." />;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Resumo de Vendas</h2>
                <button 
                    onClick={handleExportCSV}
                    className="flex items-center space-x-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
                    disabled={salesMetrics.completedOrders.length === 0}
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Exportar CSV</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Receita Total" value={`R$ ${salesMetrics.totalRevenue.toFixed(2)}`} />
                <StatCard title="Ticket Médio" value={`R$ ${salesMetrics.averageOrderValue.toFixed(2)}`} />
                <StatCard title="Pedidos Concluídos" value={salesMetrics.completedOrdersCount} />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                {ordersPerDay.length > 0 ? (
                    <BarChart data={ordersPerDay} title="Pedidos por Dia (Últimos 30 dias)" />
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">Não há dados de vendas suficientes para exibir o gráfico.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesDashboard;