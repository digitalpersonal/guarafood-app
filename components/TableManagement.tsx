
import React, { useState, useMemo } from 'react';
import type { Order, CartItem, PaymentEntry } from '../types';
import { createOrder, recordOrderPayment, updateOrderStatus } from '../services/orderService';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import OrderEditorModal from './OrderEditorModal';

const StoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.507 15.324a3.75 3.75 0 011.084-3.515 11.25 11.25 0 00-4.06-1.17 11.25 11.25 0 0111.25 0 11.25 11.25 0 00-4.06 1.17c.213.914.249 1.87.11 2.766a3.75 3.75 0 01-.235.485 3.75 3.75 0 01-1.084 3.515A11.25 11.25 0 0012 21a11.25 11.25 0 008.25-3.676 3.75 3.75 0 01-1.084-3.515c-.139-.896-.103-1.852.11-2.766z" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

interface TableManagementProps {
    orders: Order[];
}

const TableManagement: React.FC<TableManagementProps> = ({ orders }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    const [selectedTableOrder, setSelectedTableOrder] = useState<Order | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');

    const activeTables = useMemo(() => {
        return orders.filter(o => o.status === 'Mesa Aberta' && o.tableNumber);
    }, [orders]);

    const tableNumbers = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0'));

    const handleOpenTable = async (tableNum: string) => {
        const existing = activeTables.find(o => o.tableNumber === tableNum);
        if (existing) {
            setSelectedTableOrder(existing);
            return;
        }

        const name = await prompt({
            title: `Abrir Mesa ${tableNum}`,
            message: 'Digite o nome do cliente ou identificação da mesa:',
            placeholder: 'Ex: João da Silva / Grupo 4'
        });

        if (name && currentUser?.restaurantId) {
            try {
                const newOrder = await createOrder({
                    customerName: name,
                    customerPhone: '0000000000',
                    customerAddress: { zipCode: '00000-000', street: 'Consumo Local', number: 'Mesa ' + tableNum, neighborhood: 'Salão', complement: '' },
                    items: [],
                    totalPrice: 0,
                    restaurantId: currentUser.restaurantId,
                    restaurantName: currentUser.name,
                    restaurantAddress: '',
                    restaurantPhone: '',
                    paymentMethod: 'Pendente (Mesa)',
                    tableNumber: tableNum,
                    status: 'Mesa Aberta'
                });
                addToast({ message: `Mesa ${tableNum} aberta!`, type: 'success' });
                setSelectedTableOrder(newOrder);
            } catch (e) {
                addToast({ message: 'Erro ao abrir mesa.', type: 'error' });
            }
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedTableOrder || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        const currentPaid = (selectedTableOrder.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
        const newTotalPaid = currentPaid + amount;

        try {
            const entry: PaymentEntry = {
                amount,
                method: paymentMethod,
                timestamp: new Date().toISOString()
            };
            const updated = await recordOrderPayment(selectedTableOrder.id, entry, newTotalPaid, selectedTableOrder.totalPrice);
            
            setSelectedTableOrder(updated);
            setPaymentAmount('');
            setIsPaymentModalOpen(false);
            addToast({ message: 'Pagamento registrado!', type: 'success' });

            if (newTotalPaid >= selectedTableOrder.totalPrice) {
                await updateOrderStatus(selectedTableOrder.id, 'Entregue');
                addToast({ message: 'Conta encerrada e mesa liberada!', type: 'success' });
                setSelectedTableOrder(null);
            }
        } catch (e) {
            addToast({ message: 'Erro ao processar pagamento.', type: 'error' });
        }
    };

    const totalPaid = (selectedTableOrder?.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
    const balance = (selectedTableOrder?.totalPrice || 0) - totalPaid;

    return (
        <div className="p-4 max-w-5xl mx-auto space-y-6 pb-32">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <StoreIcon className="w-7 h-7 text-orange-600" />
                Gestão de Mesas
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {tableNumbers.map(num => {
                    const order = activeTables.find(o => o.tableNumber === num);
                    const isOpen = !!order;
                    return (
                        <button
                            key={num}
                            onClick={() => handleOpenTable(num)}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-sm active:scale-95 ${
                                isOpen 
                                ? 'bg-orange-500 border-orange-600 text-white shadow-orange-200' 
                                : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-400'
                            }`}
                        >
                            <span className="text-[10px] font-black uppercase opacity-60">Mesa</span>
                            <span className="text-3xl font-black">{num}</span>
                            {isOpen && (
                                <span className="text-[10px] font-bold mt-1 truncate w-full px-2 text-center">
                                    R$ {order.totalPrice.toFixed(2)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {selectedTableOrder && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-slideUp">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase">Mesa {selectedTableOrder.tableNumber}</h3>
                                <div className="flex items-center gap-1 text-gray-500">
                                    <UserIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">{selectedTableOrder.customerName}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTableOrder(null)} className="p-2 text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-6">
                            {/* Itens da Comanda */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Consumo Atual</h4>
                                    <button 
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1 hover:bg-orange-200 transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Lançar Itens
                                    </button>
                                </div>
                                
                                {selectedTableOrder.items.length === 0 ? (
                                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                                        <p className="text-gray-300 font-bold italic">Nenhum item lançado ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedTableOrder.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex gap-3 items-center">
                                                    <span className="font-black text-orange-600">{item.quantity}x</span>
                                                    <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-600 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Histórico de Pagamentos */}
                            {selectedTableOrder.paymentHistory && selectedTableOrder.paymentHistory.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pagamentos Recebidos</h4>
                                    <div className="space-y-2">
                                        {selectedTableOrder.paymentHistory.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-emerald-800 text-xs">{p.method}</span>
                                                    <span className="text-[9px] text-emerald-600/70">{new Date(p.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <span className="font-black text-emerald-700">R$ {p.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-500 font-bold text-sm">
                                    <span>Total Consumido:</span>
                                    <span>R$ {selectedTableOrder.totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-600 font-bold text-sm">
                                    <span>Já Pago:</span>
                                    <span>R$ {totalPaid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600 font-black text-xl border-t pt-2 mt-2">
                                    <span>Saldo Restante:</span>
                                    <span>R$ {balance.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    Receber Valor
                                </button>
                                <button 
                                    onClick={() => setSelectedTableOrder(null)}
                                    className="bg-gray-800 text-white font-black py-4 rounded-2xl hover:bg-black active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    Fechar Janela
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Recebimento Parcial */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="text-center">
                            <h4 className="text-xl font-black text-gray-800 uppercase">Receber Pagamento</h4>
                            <p className="text-sm text-gray-400">Saldo da mesa: R$ {balance.toFixed(2)}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Valor a Receber</label>
                                <input 
                                    type="number" 
                                    autoFocus
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center text-3xl font-black text-emerald-600 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito'].map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => setPaymentMethod(m)}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                                paymentMethod === m 
                                                ? 'bg-orange-600 border-orange-600 text-white' 
                                                : 'bg-white border-gray-100 text-gray-500 hover:border-orange-100'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                            <button 
                                onClick={handleProcessPayment}
                                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                                Confirmar Recebimento
                            </button>
                            <button 
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="w-full py-3 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && selectedTableOrder && currentUser && (
                <OrderEditorModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    order={selectedTableOrder}
                    onSave={(updated) => setSelectedTableOrder(updated)}
                    restaurantId={currentUser.restaurantId!}
                    restaurantName={currentUser.name}
                />
            )}
        </div>
    );
};

export default TableManagement;
