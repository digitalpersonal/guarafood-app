
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../services/authService';
import { fetchOrders } from '../services/orderService';
import { fetchExpenses, createExpense } from '../services/databaseService';
import type { Order, Expense } from '../types';
import Spinner from './Spinner';
import { useNotification } from '../hooks/useNotification';

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
);
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
);
const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 0 0-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" /></svg>
);
const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.5 4.5L21.75 7m0 0H16.5m5.25 0v5.25" /></svg>
);
const TrendingDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6l6.75 6.75 4.5-4.5L21.75 17m0 0H16.5m5.25 0v-5.25" /></svg>
);

type PeriodType = 'day' | 'week' | 'month';

interface DashboardCalculatedData {
    currentOrders: Order[];
    currentExpenses: Expense[];
    stats: { total: number; count: number };
    totalExpenses: number;
    netProfit: number;
    growth: number;
    bestSellers: { name: string; qty: number }[];
    payments: Record<string, number>;
    periodLabel: string;
}

const SalesDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<PeriodType>('day');
    const [referenceDate, setReferenceDate] = useState(new Date());

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.restaurantId) return;
            setIsLoading(true);
            try {
                const [ordersData, expensesData] = await Promise.all([
                    fetchOrders(currentUser.restaurantId, { limit: 2000 }),
                    fetchExpenses(currentUser.restaurantId)
                ]);
                setOrders(ordersData);
                setExpenses(expensesData);
            } catch (error) { console.error(error); } finally { setIsLoading(false); }
        };
        loadData();
    }, [currentUser]);

    const getPeriodRange = (date: Date, type: PeriodType) => {
        const start = new Date(date); const end = new Date(date);
        const prevStart = new Date(date); const prevEnd = new Date(date);
        if (type === 'day') {
            start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
            prevStart.setDate(start.getDate() - 1); prevEnd.setDate(end.getDate() - 1);
        } else if (type === 'week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
            prevStart.setDate(start.getDate() - 7); prevEnd.setDate(end.getDate() - 7);
        } else {
            start.setDate(1); start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
            prevStart.setMonth(start.getMonth() - 1, 1); prevEnd.setMonth(start.getMonth(), 0);
        }
        return { start, end, prevStart, prevEnd };
    };

    const dashboardData = useMemo((): DashboardCalculatedData => {
        const { start, end, prevStart, prevEnd } = getPeriodRange(referenceDate, activePeriod);
        const filterByRange = <T extends { timestamp?: string; date?: string }>(data: T[], s: Date, e: Date): T[] => 
            data.filter(item => {
                const d = new Date(item.timestamp || item.date || '');
                return d >= s && d <= e;
            });
        const currentOrders = filterByRange<Order>(orders, start, end);
        const previousOrders = filterByRange<Order>(orders, prevStart, prevEnd);
        const currentExpenses = filterByRange<Expense>(expenses, start, end);
        const calcStats = (list: Order[]) => {
            const valid = list.filter(o => o.status !== 'Cancelado');
            const total = valid.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
            return { total, count: valid.length };
        };
        const currentStats = calcStats(currentOrders);
        const previousStats = calcStats(previousOrders);
        const totalExpenses = currentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const netProfit = currentStats.total - totalExpenses;
        const growth = previousStats.total > 0 ? ((currentStats.total - previousStats.total) / previousStats.total) * 100 : 0;
        const itemRanking: Record<string, number> = {};
        currentOrders.filter(o => o.status !== 'Cancelado').forEach(o => o.items.forEach(i => itemRanking[i.name] = (itemRanking[i.name] || 0) + i.quantity));
        const bestSellers = Object.entries(itemRanking).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
        const payments: Record<string, number> = {};
        currentOrders.filter(o => o.status !== 'Cancelado').forEach(o => {
            const method = o.paymentMethod.split('(')[0].trim();
            payments[method] = (payments[method] || 0) + (Number(o.totalPrice) || 0);
        });
        return {
            currentOrders, currentExpenses, stats: currentStats, totalExpenses, netProfit, growth, bestSellers, payments,
            periodLabel: activePeriod === 'day' ? start.toLocaleDateString('pt-BR') : `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
        };
    }, [orders, expenses, referenceDate, activePeriod]);

    const handleNavigate = (direction: number) => {
        const newDate = new Date(referenceDate);
        if (activePeriod === 'day') newDate.setDate(newDate.getDate() + direction);
        else if (activePeriod === 'week') newDate.setDate(newDate.getDate() + (direction * 7));
        else newDate.setMonth(newDate.getMonth() + direction);
        setReferenceDate(newDate);
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.restaurantId || !desc || !amount) return;
        try {
            const newExp = await createExpense(currentUser.restaurantId, { description: desc, amount: parseFloat(amount), category: 'Outros', date: new Date().toISOString() });
            setExpenses([newExp, ...expenses]);
            setDesc(''); setAmount('');
            addToast({ message: 'Lançamento realizado!', type: 'success' });
        } catch (err) { addToast({ message: 'Erro ao salvar.', type: 'error' }); }
    };

    if (isLoading) return <Spinner message="Processando números..." />;

    return (
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
            {/* Header / Filtro */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                    {(['day', 'week', 'month'] as PeriodType[]).map(p => (
                        <button key={p} onClick={() => setActivePeriod(p)} className={`flex-1 md:px-4 py-2 rounded-lg text-sm font-bold transition-all ${activePeriod === p ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
                            {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => handleNavigate(-1)} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <span className="font-bold text-gray-800 text-center min-w-[140px]">{dashboardData.periodLabel}</span>
                    <button onClick={() => handleNavigate(1)} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronRightIcon className="w-5 h-5" /></button>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all">
                    <PrinterIcon className="w-4 h-4" /> <span>Imprimir Fechamento</span>
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-black uppercase mb-1">Vendas Brutas</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-black text-gray-800">R$ {dashboardData.stats.total.toFixed(2)}</h3>
                        <div className={`flex items-center text-sm font-bold ${dashboardData.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {dashboardData.growth >= 0 ? <TrendingUpIcon className="w-4 h-4 mr-1"/> : <TrendingDownIcon className="w-4 h-4 mr-1"/>}
                            {Math.abs(dashboardData.growth).toFixed(1)}%
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-black uppercase mb-1">Despesas Lançadas</p>
                    <h3 className="text-3xl font-black text-red-600">R$ {dashboardData.totalExpenses.toFixed(2)}</h3>
                </div>
                <div className={`p-6 rounded-3xl shadow-sm border border-gray-100 ${dashboardData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-gray-500 text-xs font-black uppercase mb-1">Lucro Líquido Estimado</p>
                    <h3 className={`text-3xl font-black ${dashboardData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>R$ {dashboardData.netProfit.toFixed(2)}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ranking */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">⭐ Top 5 Produtos</h4>
                    <div className="space-y-4">
                        {dashboardData.bestSellers.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">{i+1}. {item.name}</span>
                                <span className="text-sm font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{item.qty} vendidos</span>
                            </div>
                        ))}
                        {dashboardData.bestSellers.length === 0 && <p className="text-center py-10 text-gray-400 italic">Sem vendas no período.</p>}
                    </div>
                </div>
                {/* Pagamentos */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h4 className="text-lg font-black text-gray-800 mb-4">💳 Recebimento por Meio</h4>
                    <div className="space-y-4">
                        {Object.entries(dashboardData.payments).map(([method, val]) => (
                            <div key={method} className="flex justify-between text-sm">
                                <span className="font-bold text-gray-600">{method}</span>
                                <span className="font-black text-gray-900">R$ {Number(val).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Registrar Despesa */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-black text-gray-800 mb-4">💸 Lançar Despesa / Saída de Caixa</h4>
                <form onSubmit={handleAddExpense} className="flex flex-col md:flex-row gap-3">
                    <input type="text" placeholder="Ex: Carne, Embalagem, Luz..." value={desc} onChange={e => setDesc(e.target.value)} className="flex-[2] p-3 border rounded-xl bg-gray-50" required />
                    <input type="number" placeholder="Valor R$" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 p-3 border rounded-xl bg-gray-50" step="0.01" required />
                    <button type="submit" className="bg-red-600 text-white font-black px-8 py-3 rounded-xl hover:bg-red-700 shadow-lg active:scale-95 transition-all">SALVAR SAÍDA</button>
                </form>
            </div>

            {/* Imprimir Fechamento (Oculto na Tela) */}
            <div className="hidden print:block font-mono text-black text-[12px]">
                <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } }`}</style>
                <div className="print-area">
                    <div className="text-center border-b-2 border-black pb-4 mb-4">
                        <h1 className="text-xl font-bold uppercase">FECHAMENTO DE CAIXA</h1>
                        <p>{dashboardData.periodLabel}</p>
                    </div>
                    <div className="mb-4 space-y-1">
                        <div className="flex justify-between"><span>VENDAS BRUTAS:</span><span>R$ {dashboardData.stats.total.toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-600"><span>DESPESAS:</span><span>- R$ {dashboardData.totalExpenses.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t-2 border-black font-black pt-1"><span>SALDO LÍQUIDO:</span><span>R$ {dashboardData.netProfit.toFixed(2)}</span></div>
                    </div>
                    <div className="mb-4">
                        <h2 className="font-bold border-b mb-1 uppercase">Recebimentos</h2>
                        {Object.entries(dashboardData.payments).map(([m, v]) => (
                            <div key={m} className="flex justify-between"><span>{m}:</span><span>R$ {Number(v).toFixed(2)}</span></div>
                        ))}
                    </div>
                    <div className="mt-10 pt-4 border-t border-black text-center text-[10px]">GuaraFood Enterprise - Gestão de Vendas</div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;
