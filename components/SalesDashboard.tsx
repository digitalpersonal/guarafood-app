
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../services/authService';
import { fetchOrders } from '../services/orderService';
import { fetchExpenses, createExpense, deleteExpense } from '../services/databaseService';
import type { Order, Expense } from '../types';
import BarChart from './BarChart';
import Spinner from './Spinner';
import { useNotification } from '../hooks/useNotification';

const SalesDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast, confirm } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Expense Form
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<'Insumos' | 'Pessoal' | 'Aluguel' | 'Entregadores' | 'Outros'>('Outros');

    useEffect(() => {
        const loadData = async () => {
            if (!currentUser?.restaurantId) return;
            setIsLoading(true);
            try {
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

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.restaurantId || !desc || !amount) return;

        try {
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

    const validOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelado'), [orders]);
    
    // Ensure numbers are treated as numbers, even if DB returns strings
    const totalSales = validOrders.reduce((acc, o) => acc + Number(o.totalPrice), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    
    // Net Revenue / Cash In Hand (O que realmente entrou no caixa)
    const realIncome = validOrders
        .filter(o => o.paymentStatus !== 'pending' && o.paymentMethod !== 'Marcar na minha conta')
        .reduce((acc: number, order) => acc + Number(order.totalPrice), 0);

    // Net Profit (Resultado) = Entradas Reais - Despesas
    const netProfit = realIncome - totalExpenses;

    // Chart Data (Last 7 days)
    const chartData = useMemo(() => {
        const data: { [key: string]: number } = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            data[d.toLocaleDateString('pt-BR')] = 0;
        }
        validOrders.forEach(o => {
            const date = new Date(o.timestamp).toLocaleDateString('pt-BR');
            if (data[date] !== undefined) {
                data[date] += 1;
            }
        });
        return Object.entries(data).map(([label, value]) => ({ label, value }));
    }, [validOrders]);

    if (isLoading) return <Spinner message="Calculando métricas..." />;

    return (
        <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-bold uppercase">Vendas Totais</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {totalSales.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{validOrders.length} pedidos</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm font-bold uppercase">Receita Líquida (Caixa)</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {realIncome.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Entradas confirmadas</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                    <h3 className="text-gray-500 text-sm font-bold uppercase">Despesas</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{expenses.length} registros</p>
                </div>
                <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${netProfit >= 0 ? 'border-green-600' : 'border-red-600'}`}>
                    <h3 className="text-gray-500 text-sm font-bold uppercase">Lucro Líquido</h3>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {netProfit.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Receita - Despesas</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <BarChart data={chartData} title="Pedidos por Dia (Últimos 7 dias)" />
            </div>

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
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Últimas Despesas</h3>
                    {expenses.length === 0 ? (
                        <p className="text-gray-500">Nenhuma despesa registrada.</p>
                    ) : (
                        <ul className="divide-y">
                            {expenses.map(exp => (
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
        </div>
    );
};

export default SalesDashboard;
