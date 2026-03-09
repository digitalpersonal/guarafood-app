
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../services/authService';
import { fetchOrders } from '../services/orderService';
import { fetchExpenses, createExpense, fetchRestaurantByIdSecure } from '../services/databaseService';
import type { Order, Expense, Restaurant, OperatingHours, StaffMember } from '../types';
import Spinner from './Spinner';
import { useNotification } from '../hooks/useNotification';
import { timeToMinutes } from '../utils/restaurantUtils';

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
);
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
);
const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 0 0-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" /></svg>
);

type PeriodType = 'day' | 'week' | 'month' | 'year' | 'custom';

interface SalesBreakdown {
    total: number;
    count: number;
    payments: Record<string, number>;
    bestSellers: { name: string; qty: number }[];
}

interface DashboardCalculatedData {
    currentOrders: Order[];
    currentExpenses: Expense[];
    stats: { total: number; count: number; cancelledCount: number; pendingPixCount: number };
    deliveryStats: { count: number; totalFees: number; unitFee: number; totalToPay: number };
    totalExpenses: number;
    netProfit: number;
    bestSellers: { name: string; qty: number }[];
    payments: Record<string, number>;
    periodLabel: string;
    deliveryBreakdown: SalesBreakdown;
    tableBreakdown: SalesBreakdown;
}

interface SalesDashboardProps {
    currentStaffUser?: StaffMember | null;
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ currentStaffUser }) => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<PeriodType>('day');
    const [referenceDate, setReferenceDate] = useState(new Date());
    
    const isManager = currentStaffUser?.role === 'manager';

    const printerWidth = parseInt(localStorage.getItem('guarafood-printer-width') || '80', 10);
    const printableWidth = printerWidth === 80 ? '70mm' : '46mm';

    const [startDateInput, setStartDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [endDateInput, setEndDateInput] = useState(new Date().toISOString().split('T')[0]);

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.restaurantId) return;
            setIsLoading(true);
            try {
                const [ordersData, expensesData, restData] = await Promise.all([
                    fetchOrders(currentUser.restaurantId, { limit: 10000 }),
                    fetchExpenses(currentUser.restaurantId),
                    fetchRestaurantByIdSecure(currentUser.restaurantId)
                ]);
                setOrders(ordersData);
                setExpenses(expensesData);
                setRestaurant(restData);
            } catch (error) { console.error(error); } finally { setIsLoading(false); }
        };
        loadData();
    }, [currentUser]);

    const getPeriodRange = (date: Date, type: PeriodType) => {
        const start = new Date(date);
        const end = new Date(date);
        
        if (type === 'day') {
            const dayOfWeek = start.getDay();
            const config = restaurant?.operatingHours?.find(h => h.dayOfWeek === dayOfWeek);
            
            if (config && config.isOpen) {
                const [oH, oM] = config.opens.split(':').map(Number);
                const [cH, cM] = (config.closes2 || config.closes).split(':').map(Number);
                
                start.setHours(oH, oM, 0, 0);
                
                const openMins = oH * 60 + oM;
                const closeMins = cH * 60 + cM;
                
                if (closeMins <= openMins) {
                    end.setDate(end.getDate() + 1);
                }
                end.setHours(cH, cM, 59, 999);
            } else {
                start.setHours(0, 0, 0, 0); 
                end.setHours(23, 59, 59, 999);
            }
        } else if (type === 'week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day); 
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6); 
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start.setDate(1); 
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0); 
            end.setHours(23, 59, 59, 999);
        } else if (type === 'year') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'custom') {
            const s = new Date(startDateInput + 'T00:00:00');
            const e = new Date(endDateInput + 'T23:59:59');
            return { start: s, end: e };
        }
        return { start, end };
    };

    const dashboardData = useMemo((): DashboardCalculatedData => {
        const { start, end } = getPeriodRange(referenceDate, activePeriod);
        
        const filterByRange = <T extends { timestamp?: string; date?: string }>(data: T[], s: Date, e: Date): T[] => 
            data.filter(item => {
                const d = new Date(item.timestamp || item.date || '');
                return d >= s && d <= e;
            });

        const currentOrders = filterByRange<Order>(orders, start, end);
        const currentExpenses = filterByRange<Expense>(expenses, start, end);

        const validOrders = currentOrders.filter(o => 
            o.status !== 'Cancelado' && o.status !== 'Aguardando Pagamento'
        );
        
        const cancelledCount = currentOrders.filter(o => o.status === 'Cancelado').length;
        const pendingPixCount = currentOrders.filter(o => o.status === 'Aguardando Pagamento').length;

        const totalRevenue = validOrders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
        const totalExpenses = currentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

        const deliveryOrders = validOrders.filter(o => (Number(o.deliveryFee) || 0) > 0 || (o.customerAddress && !o.tableNumber));
        const deliveryCount = deliveryOrders.length;
        const totalDeliveryFees = deliveryOrders.reduce((acc, o) => acc + (Number(o.deliveryFee) || 0), 0);
        
        const unitFee = Number(restaurant?.deliveryFee) || 0;
        const totalToPay = deliveryCount * unitFee;

        const itemRanking: Record<string, number> = {};
        validOrders.forEach(o => o.items.forEach(i => itemRanking[i.name] = (itemRanking[i.name] || 0) + i.quantity));
        
        const bestSellers = Object.entries(itemRanking)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        const payments: Record<string, number> = {};
        validOrders.forEach(o => {
            let method = o.paymentMethod.split('(')[0].trim();
            if (method.toLowerCase().includes('dinheiro')) method = 'Dinheiro';
            if (method.toLowerCase().includes('pix')) method = 'Pix';
            if (method.toLowerCase().includes('cartão')) method = 'Cartão';
            if (method.toLowerCase().includes('conta')) method = 'Fiado / Conta';
            
            payments[method] = (payments[method] || 0) + (Number(o.totalPrice) || 0);
        });

        const periodLabel = activePeriod === 'day' 
            ? `${start.toLocaleDateString('pt-BR')} (Turno)` 
            : activePeriod === 'year'
            ? start.getFullYear().toString()
            : `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;

        const calculateBreakdown = (orderList: Order[]): SalesBreakdown => {
            const total = orderList.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
            const payments: Record<string, number> = {};
            const itemRanking: Record<string, number> = {};

            orderList.forEach(o => {
                // Payments
                let method = o.paymentMethod.split('(')[0].trim();
                if (method.toLowerCase().includes('dinheiro')) method = 'Dinheiro';
                if (method.toLowerCase().includes('pix')) method = 'Pix';
                if (method.toLowerCase().includes('cartão')) method = 'Cartão';
                payments[method] = (payments[method] || 0) + (Number(o.totalPrice) || 0);

                // Items
                o.items.forEach(i => {
                    itemRanking[i.name] = (itemRanking[i.name] || 0) + i.quantity;
                });
            });

            const bestSellers = Object.entries(itemRanking)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            return { total, count: orderList.length, payments, bestSellers };
        };

        const deliveryOrdersList = validOrders.filter(o => !o.tableNumber);
        const tableOrdersList = validOrders.filter(o => !!o.tableNumber);

        return {
            currentOrders, currentExpenses, 
            stats: { total: totalRevenue, count: validOrders.length, cancelledCount, pendingPixCount }, 
            deliveryStats: { count: deliveryCount, totalFees: totalDeliveryFees, unitFee, totalToPay },
            totalExpenses, 
            netProfit: totalRevenue - totalExpenses - totalToPay,
            bestSellers, payments,
            periodLabel,
            deliveryBreakdown: calculateBreakdown(deliveryOrdersList),
            tableBreakdown: calculateBreakdown(tableOrdersList)
        };
    }, [orders, expenses, referenceDate, activePeriod, startDateInput, endDateInput, restaurant]);

    const handleNavigate = (direction: number) => {
        const newDate = new Date(referenceDate);
        if (activePeriod === 'day') newDate.setDate(newDate.getDate() + direction);
        else if (activePeriod === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        else if (activePeriod === 'month') newDate.setMonth(newDate.getMonth() + direction);
        else if (activePeriod === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
        setReferenceDate(newDate);
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.restaurantId || !desc || !amount) return;
        try {
            const newExp = await createExpense(currentUser.restaurantId, { description: desc, amount: parseFloat(amount), category: 'Outros', date: new Date().toISOString() });
            setExpenses([newExp, ...expenses]);
            setDesc(''); setAmount('');
            addToast({ message: 'Despesa registrada!', type: 'success' });
        } catch (err) { addToast({ message: 'Erro ao salvar.', type: 'error' }); }
    };

    if (isLoading) return <Spinner message="Calculando financeiro..." />;

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto pb-24">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-wrap justify-center gap-2">
                    {(['day', 'week', 'month', 'year', 'custom'] as PeriodType[]).map(p => {
                        if (isManager && p !== 'day') return null;
                        return (
                            <button 
                                key={p} 
                                onClick={() => setActivePeriod(p)} 
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${activePeriod === p ? 'bg-orange-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                                {p === 'day' ? 'Expediente' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : 'Personalizado'}
                            </button>
                        );
                    })}
                </div>

                {activePeriod === 'custom' ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fadeIn">
                        <input type="date" value={startDateInput} onChange={e => setStartDateInput(e.target.value)} className="p-2 border rounded-xl text-sm font-bold bg-gray-50" />
                        <span className="text-gray-400 font-bold">até</span>
                        <input type="date" value={endDateInput} onChange={e => setEndDateInput(e.target.value)} className="p-2 border rounded-xl text-sm font-bold bg-gray-50" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-6 animate-fadeIn">
                        <button onClick={() => handleNavigate(-1)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-full border border-orange-100"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <div className="text-center min-w-[150px]">
                            <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest">Relatório do Turno</span>
                            <span className="text-lg font-black text-gray-800">{dashboardData.periodLabel}</span>
                        </div>
                        <button onClick={() => handleNavigate(1)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-full border border-orange-100"><ChevronRightIcon className="w-6 h-6" /></button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Receita Bruta</p>
                    <h3 className="text-3xl font-black text-gray-800">R$ {dashboardData.stats.total.toFixed(2)}</h3>
                    <p className="text-[10px] text-emerald-600 mt-1 font-bold">{dashboardData.stats.count} pedidos expedidos</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Despesas do Turno</p>
                    <h3 className="text-3xl font-black text-red-600">R$ {dashboardData.totalExpenses.toFixed(2)}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">{dashboardData.currentExpenses.length} lançamentos</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Taxas a Pagar (Motoboy)</p>
                    <h3 className="text-3xl font-black text-blue-600">R$ {dashboardData.deliveryStats.totalToPay.toFixed(2)}</h3>
                    <p className="text-[10px] text-blue-400 mt-1 font-bold">{dashboardData.deliveryStats.count} entregas (Recebido dos clientes: R$ {dashboardData.deliveryStats.totalFees.toFixed(2)})</p>
                </div>
                <div className={`p-6 rounded-3xl shadow-sm border border-gray-100 ${dashboardData.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">Saldo Líquido</p>
                    <h3 className={`text-3xl font-black ${dashboardData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>R$ {dashboardData.netProfit.toFixed(2)}</h3>
                    <p className="text-[10px] opacity-60 font-bold uppercase">Resultado real do período</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DELIVERY BREAKDOWN */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-md font-black text-gray-800 mb-6 flex items-center justify-between uppercase tracking-tight">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-orange-600 rounded-full"></span>
                            Vendas Delivery / Balcão
                        </div>
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">R$ {dashboardData.deliveryBreakdown.total.toFixed(2)}</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Pagamento</p>
                            {Object.entries(dashboardData.deliveryBreakdown.payments).map(([method, val]) => (
                                <div key={method} className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-500">{method}</span>
                                    <span className="text-gray-900">R$ {Number(val).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Produtos</p>
                            {dashboardData.deliveryBreakdown.bestSellers.map((item, i) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold bg-gray-50 p-1.5 rounded-lg">
                                    <span className="truncate max-w-[100px]">{item.name}</span>
                                    <span className="text-orange-600">{item.qty} un</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* TABLE BREAKDOWN */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-md font-black text-gray-800 mb-6 flex items-center justify-between uppercase tracking-tight">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-purple-600 rounded-full"></span>
                            Vendas em Mesa
                        </div>
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">R$ {dashboardData.tableBreakdown.total.toFixed(2)}</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Pagamento</p>
                            {Object.entries(dashboardData.tableBreakdown.payments).map(([method, val]) => (
                                <div key={method} className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-500">{method}</span>
                                    <span className="text-gray-900">R$ {Number(val).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Produtos</p>
                            {dashboardData.tableBreakdown.bestSellers.map((item, i) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold bg-gray-50 p-1.5 rounded-lg">
                                    <span className="truncate max-w-[100px]">{item.name}</span>
                                    <span className="text-purple-600">{item.qty} un</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-md font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                        <span className="w-1.5 h-5 bg-orange-600 rounded-full"></span>
                        Vendas Totais por Pagamento
                    </h4>
                    <div className="space-y-4">
                        {Object.entries(dashboardData.payments).length > 0 ? (
                            Object.entries(dashboardData.payments).map(([method, val]) => {
                                const percentage = dashboardData.stats.total > 0 ? (Number(val) / dashboardData.stats.total) * 100 : 0;
                                return (
                                    <div key={method} className="space-y-1">
                                        <div className="flex justify-between text-xs font-black uppercase">
                                            <span className="text-gray-500">{method}</span>
                                            <span className="text-gray-900">R$ {Number(val).toFixed(2)}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center py-10 text-gray-400 italic text-sm">Nenhuma venda registrada no turno.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-md font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                        <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
                        Top 10 Produtos Totais (Volume)
                    </h4>
                    <div className="space-y-2">
                        {dashboardData.bestSellers.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-[9px] font-black">{i+1}</span>
                                    <span className="font-bold text-gray-700 text-xs truncate max-w-[150px]">{item.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{item.qty} un</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 p-6 rounded-3xl shadow-xl">
                <h4 className="text-md font-black text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
                    💸 Registrar Despesa do Expediente
                </h4>
                <form onSubmit={handleAddExpense} className="flex flex-col md:flex-row gap-3">
                    <input type="text" placeholder="Descrição (ex: Adiantamento motoboy, Gás...)" value={desc} onChange={e => setDesc(e.target.value)} className="flex-[2] p-4 border-none rounded-2xl bg-white/10 text-white placeholder-white/30 text-sm focus:ring-1 focus:ring-orange-500 outline-none" required />
                    <input type="number" placeholder="Valor R$" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 p-4 border-none rounded-2xl bg-white/10 text-white placeholder-white/30 text-sm focus:ring-1 focus:ring-orange-500 outline-none" step="0.01" required />
                    <button type="submit" className="bg-orange-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-orange-700 transition-all text-xs uppercase tracking-widest active:scale-95">Lançar Saída</button>
                </form>
            </div>

            {/* BOTÃO PRINCIPAL DE FECHAMENTO E IMPRESSÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => {
                        const style = document.createElement('style');
                        style.innerHTML = `@media print { #thermal-report-motoboy { display: none !important; } }`;
                        document.head.appendChild(style);
                        setTimeout(() => {
                            window.print();
                            document.head.removeChild(style);
                        }, 100);
                    }} 
                    className="flex items-center justify-center gap-3 p-6 bg-orange-600 text-white font-black rounded-3xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 active:scale-95"
                >
                    <PrinterIcon className="w-8 h-8" /> 
                    <div className="text-left">
                        <span className="block text-[10px] uppercase tracking-widest opacity-80">Finalizar e Imprimir</span>
                        <span className="text-lg uppercase tracking-tight">Fechamento de Turno Geral</span>
                    </div>
                </button>

                <button 
                    onClick={() => {
                        const style = document.createElement('style');
                        style.innerHTML = `@media print { #thermal-report-closing { display: none !important; } #thermal-report-motoboy { display: block !important; } }`;
                        document.head.appendChild(style);
                        setTimeout(() => {
                            window.print();
                            document.head.removeChild(style);
                        }, 100);
                    }} 
                    className="flex items-center justify-center gap-3 p-6 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                >
                    <PrinterIcon className="w-8 h-8" /> 
                    <div className="text-left">
                        <span className="block text-[10px] uppercase tracking-widest opacity-80">Pagar Entregas</span>
                        <span className="text-lg uppercase tracking-tight">Fechamento Turno Motoboy</span>
                    </div>
                </button>
            </div>

            <div className="hidden print:block text-black font-mono">
                <style>{`
                    @media print {
                        @page { margin: 0 !important; size: ${printerWidth}mm auto; }
                        body { margin: 0 !important; padding: 0 !important; width: ${printerWidth}mm !important; background: #fff !important; }
                        #thermal-report-closing, #thermal-report-motoboy { 
                            width: ${printableWidth} !important; 
                            margin: 0 auto !important; 
                            padding: 5mm 0 !important; 
                            font-size: 11px; 
                            line-height: 1.2; 
                            display: none; 
                            box-sizing: border-box !important;
                            background: #fff !important;
                            color: #000 !important;
                        }
                        #thermal-report-closing { display: block; }
                        #thermal-report-motoboy { display: block; }
                        .thermal-header { text-align: center; border-bottom: 1.5px dashed black; padding-bottom: 4px; margin-bottom: 8px; }
                        .thermal-row { display: flex; justify-content: space-between; margin-bottom: 4px; width: 100%; align-items: flex-start; }
                        .thermal-divider { border-top: 1px dashed black; margin: 8px 0; width: 100%; }
                        .thermal-title { font-weight: 900; text-transform: uppercase; font-size: 13px; }
                        .thermal-bold { font-weight: 900; }
                        .thermal-left { flex: 1; padding-right: 4px; }
                        .thermal-right { white-space: nowrap !important; min-width: 70px; text-align: right; }
                        .thermal-footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid black; padding-top: 6px; }
                    }
                `}</style>
                <div id="thermal-report-closing">
                    <div className="thermal-header">
                        <div className="thermal-title">FECHAMENTO DE EXPEDIENTE</div>
                        <div className="thermal-bold">{currentUser?.name}</div>
                        <div className="thermal-divider"></div>
                        <div>TURNO: {dashboardData.periodLabel}</div>
                    </div>

                    <div className="thermal-bold" style={{ marginBottom: '6px', textDecoration: 'underline' }}>RESUMO DE CAIXA</div>
                    <div className="thermal-row">
                        <span className="thermal-left">(+) BRUTO:</span>
                        <span className="thermal-right thermal-bold">R$ {dashboardData.stats.total.toFixed(2)}</span>
                    </div>
                    <div className="thermal-row">
                        <span className="thermal-left">(-) DESPESAS:</span>
                        <span className="thermal-right">R$ {dashboardData.totalExpenses.toFixed(2)}</span>
                    </div>
                    <div className="thermal-row">
                        <span className="thermal-left">(-) ENTREGAS:</span>
                        <span className="thermal-right">R$ {dashboardData.deliveryStats.totalToPay.toFixed(2)}</span>
                    </div>
                    <div className="thermal-divider" style={{ margin: '4px 0' }}></div>
                    <div className="thermal-row thermal-bold" style={{ fontSize: '13px' }}>
                        <span className="thermal-left">(=) LÍQUIDO:</span>
                        <span className="thermal-right">R$ {dashboardData.netProfit.toFixed(2)}</span>
                    </div>
                    <div className="thermal-row">
                        <span className="thermal-left">EXPEDIDOS:</span>
                        <span className="thermal-right">{dashboardData.stats.count}</span>
                    </div>

                    <div className="thermal-divider"></div>
                    <div className="thermal-bold" style={{ marginBottom: '6px' }}>POR FORMA DE PAGTO</div>
                    {Object.entries(dashboardData.payments).map(([m, v]) => (
                        <div key={m} className="thermal-row">
                            <span className="thermal-left">{m.substring(0, 15).toUpperCase()}:</span>
                            <span className="thermal-right thermal-bold">R$ {Number(v).toFixed(2)}</span>
                        </div>
                    ))}

                    <div className="thermal-footer">
                        Impresso em: {new Date().toLocaleString('pt-BR')}
                        <br/>GUARA-FOOD PDV
                        <br/>ESTATÍSTICAS DE EXPEDIENTE
                        <br/>.
                    </div>
                </div>

                <div id="thermal-report-motoboy">
                    <div className="thermal-header">
                        <div className="thermal-title">FECHAMENTO MOTOBOY</div>
                        <div className="thermal-bold">{currentUser?.name}</div>
                        <div className="thermal-divider"></div>
                        <div>TURNO: {dashboardData.periodLabel}</div>
                    </div>

                    <div className="thermal-bold" style={{ marginBottom: '6px', textDecoration: 'underline' }}>RESUMO DE ENTREGAS</div>
                    <div className="thermal-row">
                        <span className="thermal-left">QTD ENTREGAS:</span>
                        <span className="thermal-right thermal-bold">{dashboardData.deliveryStats.count}</span>
                    </div>
                    <div className="thermal-row">
                        <span className="thermal-left">VALOR POR ENTREGA:</span>
                        <span className="thermal-right">R$ {dashboardData.deliveryStats.unitFee.toFixed(2)}</span>
                    </div>
                    <div className="thermal-row">
                        <span className="thermal-left">TAXAS RECEBIDAS (CLIENTES):</span>
                        <span className="thermal-right">R$ {dashboardData.deliveryStats.totalFees.toFixed(2)}</span>
                    </div>
                    
                    <div className="thermal-divider"></div>
                    <div className="thermal-row thermal-bold" style={{ fontSize: '13px' }}>
                        <span className="thermal-left">TOTAL A PAGAR:</span>
                        <span className="thermal-right">R$ {dashboardData.deliveryStats.totalToPay.toFixed(2)}</span>
                    </div>
                    <div className="thermal-row" style={{ fontSize: '9px', marginTop: '2px' }}>
                        <span className="thermal-left">CÁLCULO:</span>
                        <span className="thermal-right">{dashboardData.deliveryStats.count} x R$ {dashboardData.deliveryStats.unitFee.toFixed(2)}</span>
                    </div>

                    <div className="thermal-footer" style={{ marginTop: '30px' }}>
                        <div style={{ borderTop: '1px solid black', width: '80%', margin: '0 auto 5px auto' }}></div>
                        Assinatura do Motoboy
                        <br/><br/>
                        Impresso em: {new Date().toLocaleString('pt-BR')}
                        <br/>GUARA-FOOD PDV
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;
