import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/authService';
import { fetchMensalistas, createMensalista, updateMensalista, deleteMensalista } from '../services/mensalistaService';
import { fetchOrdersByMensalistaId } from '../services/orderService';
import { Mensalista, Order } from '../types';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';

const MensalistasManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    const [mensalistas, setMensalistas] = useState<Mensalista[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [ordersMap, setOrdersMap] = useState<Record<string, Order[]>>({});
    
    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [monthlyFee, setMonthlyFee] = useState('');
    const [nextPaymentDate, setNextPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadMensalistas();
    }, [currentUser]);

    const loadMensalistas = async () => {
        console.log("Loading mensalistas for restaurant:", currentUser?.restaurantId);
        if (!currentUser?.restaurantId) {
            console.log("No restaurantId found, stopping load.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchMensalistas(currentUser.restaurantId);
            console.log("Mensalistas loaded:", data);
            setMensalistas(data);
        } catch (error) {
            console.error("Error loading mensalistas:", error);
            addToast({ message: 'Erro ao carregar mensalistas', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.restaurantId) return;

        try {
            await createMensalista({
                restaurantId: currentUser.restaurantId,
                name,
                phone,
                startDate: new Date().toISOString().split('T')[0],
                nextPaymentDate,
                status: 'active',
                monthlyFee: Number(monthlyFee),
                balance: 0,
            });
            addToast({ message: 'Mensalista adicionado!', type: 'success' });
            setIsFormOpen(false);
            setName('');
            setPhone('');
            setMonthlyFee('');
            loadMensalistas();
        } catch (error) {
            addToast({ message: 'Erro ao adicionar mensalista', type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Remover mensalista?',
            message: 'Tem certeza que deseja remover este mensalista?',
            confirmText: 'Remover',
            isDestructive: true
        });

        if (confirmed) {
            try {
                await deleteMensalista(id);
                addToast({ message: 'Mensalista removido!', type: 'success' });
                loadMensalistas();
            } catch (error) {
                addToast({ message: 'Erro ao remover mensalista', type: 'error' });
            }
        }
    };

    const handleSettle = async (mensalista: Mensalista) => {
        const amountStr = await prompt({
            title: 'Registrar pagamento',
            message: `Saldo atual: R$ ${mensalista.balance.toFixed(2)}. Informe o valor do pagamento:`,
            placeholder: '0.00',
            submitText: 'Registrar'
        });

        if (amountStr) {
            const amount = parseFloat(amountStr.replace(',', '.'));
            if (isNaN(amount) || amount <= 0) {
                addToast({ message: 'Valor inválido', type: 'error' });
                return;
            }
            
            try {
                const newBalance = Math.max(0, mensalista.balance - amount);
                await updateMensalista(mensalista.id, { ...mensalista, balance: newBalance });
                addToast({ message: 'Pagamento registrado!', type: 'success' });
                loadMensalistas();
            } catch (error) {
                addToast({ message: 'Erro ao registrar pagamento', type: 'error' });
            }
        }
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            if (!ordersMap[id]) {
                const orders = await fetchOrdersByMensalistaId(id);
                setOrdersMap(prev => ({...prev, [id]: orders}));
            }
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="p-6 bg-white rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Mensalistas</h2>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-black">Total a Receber</p>
                    <p className="text-xl font-black text-red-600">R$ {mensalistas.reduce((acc, m) => acc + m.balance, 0).toFixed(2)}</p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="bg-orange-600 text-white font-black px-6 py-3 rounded-2xl hover:bg-orange-700 transition-all text-xs uppercase tracking-widest active:scale-95"
                >
                    {isFormOpen ? 'Cancelar' : 'Novo Mensalista'}
                </button>
            </div>

            {isFormOpen && (
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-2xl">
                    <input type="text" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="p-3 rounded-xl border" required />
                    <input type="text" placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} className="p-3 rounded-xl border" required />
                    <input type="number" placeholder="Valor Mensal" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} className="p-3 rounded-xl border" required />
                    <input type="date" value={nextPaymentDate} onChange={e => setNextPaymentDate(e.target.value)} className="p-3 rounded-xl border" required />
                    <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-black py-3 rounded-xl hover:bg-emerald-700">Salvar</button>
                </form>
            )}

            <div className="space-y-4">
                {mensalistas.map(m => (
                    <div key={m.id} className="border rounded-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-4">
                            <div>
                                <p className="font-bold text-gray-800">{m.name}</p>
                                <p className="text-xs text-gray-500">{m.phone} | Saldo: <span className="font-black text-red-600">R$ {m.balance.toFixed(2)}</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleExpand(m.id)} className="bg-gray-200 text-gray-700 text-[10px] font-black px-3 py-2 rounded-lg hover:bg-gray-300 uppercase">
                                    {expandedId === m.id ? 'Ocultar' : 'Pedidos'}
                                </button>
                                <button onClick={() => handleSettle(m)} className="bg-emerald-600 text-white text-[10px] font-black px-3 py-2 rounded-lg hover:bg-emerald-700 uppercase">Dar Baixa</button>
                                <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700 text-xs">Remover</button>
                            </div>
                        </div>
                        {expandedId === m.id && (
                            <div className="p-4 border-t bg-gray-50">
                                <h4 className="font-bold text-gray-700 mb-2">Últimos Pedidos</h4>
                                {ordersMap[m.id]?.length > 0 ? (
                                    <ul className="space-y-2">
                                        {ordersMap[m.id].map(order => (
                                            <li key={order.id} className="text-xs flex justify-between">
                                                <span>{new Date(order.timestamp).toLocaleDateString()} - {order.status}</span>
                                                <span className="font-bold">R$ {order.totalPrice.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500">Nenhum pedido encontrado.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MensalistasManager;
