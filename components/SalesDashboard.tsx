
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../services/authService';
import { fetchOrders } from '../services/orderService';
import { fetchExpenses, createExpense, deleteExpense } from '../services/databaseService';
import type { Order, Expense } from '../types';
import BarChart from './BarChart';
import Spinner from './Spinner';
import { useNotification } from '../hooks/useNotification';

// Icons
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
);
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
);
const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0014.25 6H9.75a3.375 3.375 0 00-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 10-1.5 0 .75.75 0 001.5 0Z" /></svg>
);
const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);

const SalesDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast, confirm } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Date Filtering State
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Expense Form
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<'Insumos' | 'Pessoal' | 'Aluguel' | 'Entregadores' | 'Outros'>('Outros');

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.restaurantId) return;
            setIsLoading(true);
            try {
                // Fetch all data, then filter client-side for simplicity in this version
                const [ordersData, expensesData] = await Promise.all([
                    fetchOrders(currentUser.restaurantId),
                    fetchExpenses(currentUser.restaurantId)
                ]);
                setOrders(ordersData);
                setExpenses(expensesData);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentUser]);

    // --- DATE NAVIGATION ---
    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + 1);
            return newDate;
        });
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    // --- FILTERED DATA ---
    const filteredData = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();

        const filterDate = (timestamp: string) => {
            const d = new Date(timestamp);
            return d.getFullYear() === year && d.getMonth() === month;
        };

        const filteredOrders = orders.filter(o => filterDate(o.timestamp));
        const filteredExpenses = expenses.filter(e => filterDate(e.date));

        const validOrders = filteredOrders.filter(o => o.status !== 'Cancelado');
        const cancelledOrders = filteredOrders.filter(o => o.status === 'Cancelado');

        // Financial Calculations
        const totalSales = validOrders.reduce((acc, o) => acc + Number(o.totalPrice), 0);
        
        // Receita Líquida (Excluindo Fiado/Pendente)
        const realIncome = validOrders
            .filter(o => o.paymentStatus === 'paid' || (o.paymentMethod !== 'Marcar na minha conta' && o.status === 'Entregue'))
            .reduce((acc, o) => acc + Number(o.totalPrice), 0);

        const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
        const netProfit = realIncome - totalExpenses;
        const ticketAverage = validOrders.length > 0 ? totalSales / validOrders.length : 0;

        // Payment Methods Breakdown
        const paymentMethods = validOrders.reduce((acc, order) => {
            // Clean up payment method string (remove extra details like "Troco para...")
            let method = order.paymentMethod.split('(')[0].trim(); 
            if (!acc[method]) acc[method] = 0;
            acc[method] += Number(order.totalPrice);
            return acc;
        }, {} as Record<string, number>);

        // Expenses by Category
        const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
            if (!acc[exp.category]) acc[exp.category] = 0;
            acc[exp.category] += Number(exp.amount);
            return acc;
        }, {} as Record<string, number>);

        return {
            filteredOrders,
            filteredExpenses,
            validOrders,
            totalSales,
            realIncome,
            totalExpenses,
            netProfit,
            ticketAverage,
            cancelledCount: cancelledOrders.length,
            paymentMethods,
            expensesByCategory
        };
    }, [orders, expenses, selectedDate]);


    // --- ACTIONS ---

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.restaurantId || !desc || !amount) return;

        try {
            // Create expense with the currently selected month's date (or today if current month)
            // Ideally expenses are added for "today", but allow backdating? 
            // For simplicity, we use current real time, but if user is viewing past month, maybe warn?
            // Let's stick to adding for "Now".
            const newExpense = await createExpense(currentUser.restaurantId, {
                description: desc,
                amount: parseFloat(amount),
                category,
                date: new Date().toISOString()
            });
            setExpenses([newExpense, ...expenses]);
            setDesc('');
            setAmount('');
            addToast({ message: 'Despesa registrada.', type: 'success' });
        } catch (error) {
            addToast({ message: 'Erro ao salvar despesa.', type: 'error' });
        }
    };

    const handleDeleteExpense = async (id: number) => {
        if (!currentUser?.restaurantId) return;
        const confirmed = await confirm({ title: 'Excluir', message: 'Confirma a exclusão?', isDestructive: true });
        if (confirmed) {
            try {
                await deleteExpense(currentUser.restaurantId, id);
                setExpenses(expenses.filter(e => e.id !== id));
                addToast({ message: 'Despesa removida.', type: 'info' });
            } catch (error) {
                addToast({ message: 'Erro ao excluir.', type: 'error' });
            }
        }
    };

    const handleDownloadCSV = () => {
        const { filteredOrders, filteredExpenses } = filteredData;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Section 1: Orders
        csvContent += "PEDIDOS\n";
        csvContent += "Data,ID,Cliente,Valor,Pagamento,Status\n";
        filteredOrders.forEach(o => {
            const row = [
                new Date(o.timestamp).toLocaleDateString(),
                o.id.substring(0,6),
                `"${o.customerName}"`,
                o.totalPrice.toFixed(2),
                o.paymentMethod,
                o.status
            ].join(",");
            csvContent += row + "\n";
        });

        // Section 2: Expenses
        csvContent += "\nDESPESAS\n";
        csvContent += "Data,Descrição,Categoria,Valor\n";
        filteredExpenses.forEach(e => {
            const row = [
                new Date(e.date).toLocaleDateString(),
                `"${e.description}"`,
                e.category,
                e.amount.toFixed(2)
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Fechamento_${selectedDate.getMonth()+1}_${selectedDate.getFullYear()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintReport = () => {
        window.print();
    };

    // Chart Data (Filtered by Month)
    const dailyChartData = useMemo(() => {
        const data: { [key: string]: number } = {};
        // Initialize days for the month
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            data[i] = 0;
        }

        filteredData.validOrders.forEach(o => {
            const d = new Date(o.timestamp).getDate();
            if (data[d] !== undefined) {
                data[d] += 1;
            }
        });
        return Object.entries(data).map(([label, value]) => ({ label, value }));
    }, [filteredData.validOrders, selectedDate]);


    if (isLoading) return <Spinner message="Calculando métricas..." />;

    return (
        <div className="p-4 space-y-6">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow gap-4">
                <div className="flex items-center space-x-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 border">
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 capitalize w-48 text-center">
                        {formatMonthYear(selectedDate)}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 border">
                        <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Baixar Excel/CSV
                    </button>
                    <button onClick={handlePrintReport} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <PrinterIcon className="w-4 h-4" />
                        Imprimir Relatório
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Faturamento Bruto</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {filteredData.totalSales.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{filteredData.validOrders.length} pedidos realizados</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Receita Líquida (Caixa)</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {filteredData.realIncome.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Entradas confirmadas</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Despesas Totais</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {filteredData.totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{filteredData.filteredExpenses.length} lançamentos</p>
                </div>
                <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${filteredData.netProfit >= 0 ? 'border-green-600' : 'border-red-600'}`}>
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Lucro Líquido</h3>
                    <p className={`text-2xl font-bold ${filteredData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {filteredData.netProfit.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Margem: {filteredData.totalSales > 0 ? ((filteredData.netProfit / filteredData.totalSales) * 100).toFixed(1) : 0}%</p>
                </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow flex flex-col justify-center items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1">Ticket Médio</span>
                    <span className="text-xl font-bold text-gray-800">R$ {filteredData.ticketAverage.toFixed(2)}</span>
                </div>
                <div className="bg-white p-4 rounded-lg shadow flex flex-col justify-center items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1">Cancelamentos</span>
                    <span className="text-xl font-bold text-red-600">{filteredData.cancelledCount}</span>
                </div>
                <div className="bg-white p-4 rounded-lg shadow flex flex-col justify-center items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase mb-1">Resultado Diário (Média)</span>
                    <span className="text-xl font-bold text-blue-600">
                        R$ {(filteredData.totalSales / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                    <BarChart data={dailyChartData} title={`Pedidos por Dia (${formatMonthYear(selectedDate)})`} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Formas de Pagamento</h3>
                    <div className="space-y-3">
                        {Object.entries(filteredData.paymentMethods).map(([method, amount]) => (
                            <div key={method}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{method}</span>
                                    <span className="font-bold">R$ {(amount as number).toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full" 
                                        style={{ width: `${((amount as number) / filteredData.totalSales) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(filteredData.paymentMethods).length === 0 && <p className="text-gray-400 text-sm">Sem dados.</p>}
                    </div>
                </div>
            </div>

            {/* Expenses Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Despesa</h3>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Descrição (ex: Compra de Carne)" 
                            value={desc} 
                            onChange={e => setDesc(e.target.value)} 
                            className="w-full p-2 border rounded" 
                            required
                        />
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                placeholder="Valor" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                className="w-1/2 p-2 border rounded" 
                                step="0.01" 
                                required
                            />
                            <select 
                                value={category} 
                                onChange={e => setCategory(e.target.value as any)} 
                                className="w-1/2 p-2 border rounded"
                            >
                                <option value="Insumos">Insumos</option>
                                <option value="Pessoal">Pessoal</option>
                                <option value="Aluguel">Aluguel</option>
                                <option value="Entregadores">Entregadores</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
                            Adicionar Despesa
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-lg shadow max-h-96 overflow-y-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas do Mês</h3>
                    {filteredData.filteredExpenses.length === 0 ? (
                        <p className="text-gray-500">Nenhuma despesa neste mês.</p>
                    ) : (
                        <ul className="divide-y">
                            {filteredData.filteredExpenses.map(exp => (
                                <li key={exp.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800">{exp.description}</p>
                                        <p className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString()} - {exp.category}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-red-600">- R$ {exp.amount.toFixed(2)}</span>
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-600">
                                            &times;
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* PRINTABLE REPORT (Hidden on screen, visible on print) */}
            <div id="printable-financial-report" className="hidden">
                <style>
                    {`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #printable-financial-report, #printable-financial-report * {
                                visibility: visible;
                            }
                            #printable-financial-report {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                display: block !important;
                                background: white;
                                padding: 20px;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}
                </style>
                <div className="max-w-4xl mx-auto font-sans">
                    <div className="text-center border-b pb-4 mb-6">
                        <h1 className="text-2xl font-bold text-gray-800 uppercase">Relatório de Fechamento</h1>
                        <p className="text-gray-600">{formatMonthYear(selectedDate)}</p>
                        <p className="text-sm text-gray-500 mt-1">Gerado em: {new Date().toLocaleString()}</p>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-lg font-bold border-b mb-4 pb-1">Resumo Executivo</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded bg-gray-50">
                                <span className="block text-xs text-gray-500 uppercase">Faturamento Bruto</span>
                                <span className="block text-xl font-bold">R$ {filteredData.totalSales.toFixed(2)}</span>
                            </div>
                            <div className="p-3 border rounded bg-gray-50">
                                <span className="block text-xs text-gray-500 uppercase">Despesas Totais</span>
                                <span className="block text-xl font-bold text-red-600">R$ {filteredData.totalExpenses.toFixed(2)}</span>
                            </div>
                            <div className="p-3 border rounded bg-gray-50">
                                <span className="block text-xs text-gray-500 uppercase">Lucro Líquido</span>
                                <span className="block text-xl font-bold text-green-600">R$ {filteredData.netProfit.toFixed(2)}</span>
                            </div>
                            <div className="p-3 border rounded bg-gray-50">
                                <span className="block text-xs text-gray-500 uppercase">Ticket Médio</span>
                                <span className="block text-xl font-bold">R$ {filteredData.ticketAverage.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h2 className="text-lg font-bold border-b mb-3 pb-1">Entradas por Pagamento</h2>
                            <table className="w-full text-sm">
                                <tbody>
                                    {Object.entries(filteredData.paymentMethods).map(([method, amount]) => (
                                        <tr key={method} className="border-b">
                                            <td className="py-2">{method}</td>
                                            <td className="py-2 text-right font-mono">R$ {(amount as number).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold border-b mb-3 pb-1">Despesas por Categoria</h2>
                            <table className="w-full text-sm">
                                <tbody>
                                    {Object.entries(filteredData.expensesByCategory).map(([cat, amount]) => (
                                        <tr key={cat} className="border-b">
                                            <td className="py-2">{cat}</td>
                                            <td className="py-2 text-right font-mono text-red-600">R$ {(amount as number).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold border-b mb-3 pb-1">Detalhamento de Despesas</h2>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-1">Data</th>
                                    <th className="py-2 px-1">Descrição</th>
                                    <th className="py-2 px-1">Categoria</th>
                                    <th className="py-2 px-1 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.filteredExpenses.map(exp => (
                                    <tr key={exp.id} className="border-b">
                                        <td className="py-2 px-1">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="py-2 px-1">{exp.description}</td>
                                        <td className="py-2 px-1">{exp.category}</td>
                                        <td className="py-2 px-1 text-right font-mono">R$ {exp.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-10 text-center text-xs text-gray-400">
                        <p>Documento gerado eletronicamente pelo sistema GuaraFood.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;
