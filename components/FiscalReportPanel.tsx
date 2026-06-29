
import React, { useState, useEffect } from 'react';
import { fetchOrders } from '../services/orderService';
import type { Order } from '../types';

const FiscalReportPanel: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadOrders();
    }, [startDate, endDate]);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await fetchOrders();
            setOrders(allOrders);
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrders = orders.filter(o => {
        const orderDate = new Date(o.timestamp).toISOString().slice(0, 10);
        return orderDate >= startDate && orderDate <= endDate && (o as any).fiscalStatus === 'selected';
    });

    const totalFiscalSales = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Relatório Fiscal</h2>
            <div className="flex gap-4 mb-6">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg"/>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg"/>
            </div>
            {isLoading ? <p>Carregando...</p> : (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-xl">
                        <p className="text-sm text-orange-600">Pedidos Marcados</p>
                        <p className="text-2xl font-bold">{filteredOrders.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl">
                        <p className="text-sm text-green-600">Total Fiscais</p>
                        <p className="text-2xl font-bold">R$ {totalFiscalSales.toFixed(2)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FiscalReportPanel;
