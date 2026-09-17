import React, { useState, useMemo, useEffect } from 'react';
import { createOrder, recordOrderPayment, updateOrderStatus, fetchOpenTableOrders, requestKitchenPrint, requestBillPrint, updateOrderDetails } from '../services/orderService';
import { searchMensalistas } from '../services/mensalistaService';
import { fetchRestaurantByIdSecure, fetchMenuForRestaurant, fetchAddonsForRestaurant } from '../services/databaseService';
import { supabase } from '../services/api';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import AddItemToOrderModal from './AddItemToOrderModal';
import type { Order, CartItem, PaymentEntry, StaffMember, Restaurant, Mensalista, MenuItem, Combo } from '../types';

const ReceiptIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.66 0 .754.696 1.375 1.565 1.375h10.87c.87 0 1.565-.621 1.565-1.375 0-.227-.035-.45-.1-.66m-5.801 0c-.651.055-1.302.115-1.951.18M12 4.5v15" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.507 15.324a3.75 3.75 0 011.084-3.515 11.25 11.25 0 00-4.06-1.17 11.25 11.25 0 0111.25 0 11.25 11.25 0 00-4.06 1.17c.213.914.249 1.87.11 2.766a3.75 3.75 0 01-.235.485 3.75 3.75 0 01-1.084 3.515A11.25 11.25 0 0012 21a11.25 11.25 0 008.25-3.676 3.75 3.75 0 01-1.084-3.515c-.139-.896-.103-1.852.11-2.766z" />
    </svg>
);

interface ComandaManagementProps {
    orders: Order[];
    currentStaffUser?: StaffMember | null;
    restaurant?: Restaurant | null;
}

const ComandaManagement: React.FC<ComandaManagementProps> = ({ orders, currentStaffUser, restaurant: initialRestaurant }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    
    const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);
    const [selectedComandaNum, setSelectedComandaNum] = useState<string | null>(null);
    const [selectedComandaOrder, setSelectedComandaOrder] = useState<Order | null>(null);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [changeFor, setChangeFor] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');

    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [combos, setCombos] = useState<Combo[]>([]);

    // Mensalista Search States
    const [mensalistaSearch, setMensalistaSearch] = useState('');
    const [mensalistaSuggestions, setMensalistaSuggestions] = useState<Mensalista[]>([]);
    const [selectedMensalista, setSelectedMensalista] = useState<Mensalista | null>(null);

    // 200 Comandas numbers (1 to 200)
    const comandaNumbers = useMemo(() => Array.from({ length: 200 }, (_, i) => (i + 1).toString()), []);

    useEffect(() => {
        const loadRestaurant = async () => {
            if (currentUser?.restaurantId && !restaurant) {
                const data = await fetchRestaurantByIdSecure(currentUser.restaurantId);
                setRestaurant(data);
            }
        };
        loadRestaurant();
    }, [currentUser?.restaurantId, restaurant]);

    useEffect(() => {
        const loadMenu = async () => {
            if (currentUser?.restaurantId) {
                try {
                    const menuCats = await fetchMenuForRestaurant(currentUser.restaurantId);
                    const items = menuCats.flatMap(c => c.items);
                    const allCombos = menuCats.flatMap(c => c.combos || []);
                    setMenuItems(items);
                    setCombos(allCombos);
                } catch (e) {
                    console.error("Erro ao carregar cardápio para comandas:", e);
                }
            }
        };
        loadMenu();
    }, [currentUser?.restaurantId]);

    // Active comanda orders (status 'Aguardando Pagamento' and have comandaNumber)
    const activeComandasMap = useMemo(() => {
        const map: Record<string, Order> = {};
        orders.forEach(o => {
            if (o.status === 'Aguardando Pagamento' && o.comandaNumber) {
                map[o.comandaNumber] = o;
            }
        });
        return map;
    }, [orders]);

    const handleComandaClick = (num: string) => {
        setSelectedComandaNum(num);
        const existingOrder = activeComandasMap[num];
        if (existingOrder) {
            setSelectedComandaOrder(existingOrder);
        } else {
            setSelectedComandaOrder(null);
            setNewCustomerName('');
            setNewCustomerPhone('');
            setIsCreateModalOpen(true);
        }
    };

    const handleCreateComanda = async () => {
        if (!selectedComandaNum || !currentUser?.restaurantId) return;
        if (!newCustomerName.trim()) {
            addToast({ message: 'Por favor, informe o nome do cliente.', type: 'error' });
            return;
        }

        try {
            const newOrder = await createOrder({
                customerName: newCustomerName.trim(),
                customerPhone: newCustomerPhone.trim() || '0000000000',
                customerAddress: {
                    zipCode: '00000-000',
                    street: 'Salão',
                    number: `Comanda ${selectedComandaNum}`,
                    neighborhood: 'Comandas'
                },
                items: [],
                totalPrice: 0,
                restaurantId: currentUser.restaurantId,
                restaurantName: currentUser.name,
                restaurantAddress: '',
                restaurantPhone: '',
                paymentMethod: 'Dinheiro',
                comandaNumber: selectedComandaNum,
                status: 'Aguardando Pagamento'
            });

            addToast({ message: `Comanda ${selectedComandaNum} aberta para ${newCustomerName}!`, type: 'success' });
            setSelectedComandaOrder(newOrder);
            setIsCreateModalOpen(false);
        } catch (e: any) {
            addToast({ message: `Erro ao abrir comanda: ${e.message}`, type: 'error' });
        }
    };

    const handleAddKiloItem = async () => {
        if (!selectedComandaOrder || !restaurant?.pricePerKilo) return;

        const weightStr = await prompt({
            title: 'Adicionar Prato por Peso (Kg)',
            message: `Valor do Kg: R$ ${restaurant.pricePerKilo.toFixed(2)}\nDigite o peso em KG (ex: 0.450):`,
            placeholder: '0.000',
            submitText: 'Adicionar Peso',
            cancelText: 'Cancelar'
        });

        if (!weightStr) return;
        const weight = parseFloat(weightStr.replace(',', '.'));
        if (isNaN(weight) || weight <= 0) {
            addToast({ message: 'Peso inválido.', type: 'error' });
            return;
        }

        const itemPrice = weight * restaurant.pricePerKilo;

        try {
            const kiloItem: CartItem = {
                id: `kilo-${Date.now()}`,
                restaurantId: currentUser?.restaurantId || 0,
                name: 'Prato por Kilo',
                price: itemPrice,
                basePrice: itemPrice,
                imageUrl: '',
                quantity: 1,
                description: `Peso: ${weight.toFixed(3)}kg (R$ ${restaurant.pricePerKilo.toFixed(2)}/kg)`,
                weight: weight,
                isKiloItem: true,
                served: true
            };

            const updatedItems = [...selectedComandaOrder.items, kiloItem];
            const updatedSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const updatedTotal = updatedSubtotal - (selectedComandaOrder.discountAmount || 0);

            const updated = await updateOrderDetails(selectedComandaOrder.id, {
                items: updatedItems,
                totalPrice: updatedTotal,
                subtotal: updatedSubtotal,
                discountAmount: selectedComandaOrder.discountAmount
            });

            setSelectedComandaOrder(updated);
            addToast({ message: 'Item por peso adicionado!', type: 'success' });
        } catch (e: any) {
            addToast({ message: `Erro: ${e.message}`, type: 'error' });
        }
    };

    const handleAddItemFromMenu = (item: MenuItem) => {
        if (!selectedComandaOrder) return;
        
        const cartItem: CartItem = {
            id: `item-${item.id}-${Date.now()}`,
            restaurantId: item.restaurantId,
            name: item.name,
            price: item.price,
            basePrice: item.price,
            imageUrl: item.imageUrl,
            quantity: 1,
            description: item.description || ''
        };

        (async () => {
            try {
                const updatedItems = [...selectedComandaOrder.items, cartItem];
                const updatedSubtotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                const updatedTotal = updatedSubtotal - (selectedComandaOrder.discountAmount || 0);

                const updated = await updateOrderDetails(selectedComandaOrder.id, {
                    items: updatedItems,
                    totalPrice: updatedTotal,
                    subtotal: updatedSubtotal,
                    discountAmount: selectedComandaOrder.discountAmount
                });

                setSelectedComandaOrder(updated);
                setIsAddItemModalOpen(false);
                addToast({ message: `${item.name} adicionado à comanda!`, type: 'success' });
            } catch (e: any) {
                addToast({ message: `Erro: ${e.message}`, type: 'error' });
            }
        })();
    };

    const handleRemoveItem = async (index: number) => {
        if (!selectedComandaOrder) return;
        const confirmed = await confirm({
            title: 'Remover Item',
            message: `Deseja remover "${selectedComandaOrder.items[index].name}"?`,
            confirmText: 'Remover',
            cancelText: 'Cancelar',
            isDestructive: true
        });

        if (confirmed) {
            try {
                const newItems = [...selectedComandaOrder.items];
                newItems.splice(index, 1);
                const newSubtotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                const newTotal = newSubtotal - (selectedComandaOrder.discountAmount || 0);

                const updated = await updateOrderDetails(selectedComandaOrder.id, {
                    items: newItems,
                    totalPrice: newTotal,
                    subtotal: newSubtotal,
                    discountAmount: selectedComandaOrder.discountAmount
                });
                setSelectedComandaOrder(updated);
                addToast({ message: 'Item removido.', type: 'success' });
            } catch (e: any) {
                addToast({ message: `Erro: ${e.message}`, type: 'error' });
            }
        }
    };

    const triggerKitchenPrint = async () => {
        if (!selectedComandaOrder) return;
        try {
            await requestKitchenPrint(selectedComandaOrder.id, selectedComandaOrder.items);
            addToast({ message: 'Enviado para a cozinha!', type: 'success' });
        } catch (e: any) {
            addToast({ message: `Erro ao imprimir: ${e.message}`, type: 'error' });
        }
    };

    const triggerBillPrint = async () => {
        if (!selectedComandaOrder) return;
        try {
            await requestBillPrint(selectedComandaOrder.id);
            addToast({ message: 'Conta enviada para impressão.', type: 'success' });
        } catch (e: any) {
            addToast({ message: `Erro ao imprimir conta: ${e.message}`, type: 'error' });
        }
    };

    const totalPaid = (selectedComandaOrder?.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
    const balance = (selectedComandaOrder?.totalPrice || 0) - totalPaid;

    const handleProcessPayment = async () => {
        if (!selectedComandaOrder || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        try {
            const { data: latestOrderRaw } = await supabase.from('orders').select('*').eq('id', selectedComandaOrder.id).single();
            if (!latestOrderRaw) throw new Error('Pedido não encontrado.');

            const dbTotalPrice = latestOrderRaw.total_price;
            const history = latestOrderRaw.payment_history || latestOrderRaw.payment_details?.history || [];
            const currentPaid = history.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
            const newTotalPaid = currentPaid + amount;

            let finalMethod = paymentMethod;
            let mensalistaId: string | undefined = undefined;

            if (paymentMethod === 'Dinheiro' && changeFor) {
                const changeVal = parseFloat(changeFor.replace(',', '.').trim());
                if (!isNaN(changeVal) && changeVal > amount) {
                    finalMethod = `Dinheiro (Troco para R$ ${changeVal.toFixed(2)})`;
                }
            } else if (paymentMethod === 'Mensalista') {
                if (!selectedMensalista) {
                    addToast({ message: 'Selecione um mensalista.', type: 'error' });
                    return;
                }
                finalMethod = `Mensalista (${selectedMensalista.name})`;
                mensalistaId = selectedMensalista.id;
            }

            const entry: PaymentEntry = {
                amount,
                method: finalMethod,
                timestamp: new Date().toISOString()
            };

            const updated = await recordOrderPayment(selectedComandaOrder.id, entry, newTotalPaid, dbTotalPrice, mensalistaId);
            setSelectedComandaOrder(updated);
            setPaymentAmount('');
            setChangeFor('');
            setIsPaymentModalOpen(false);
            addToast({ message: 'Pagamento registrado com sucesso!', type: 'success' });

            if (updated.paymentStatus === 'paid' || newTotalPaid >= dbTotalPrice - 0.01) {
                addToast({ message: 'Conta quitada!', type: 'success' });
            }
        } catch (e: any) {
            addToast({ message: `Erro ao pagar: ${e.message}`, type: 'error' });
        }
    };

    const handleCloseComanda = async () => {
        if (!selectedComandaOrder) return;
        const totalPaid = (selectedComandaOrder.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
        const bal = selectedComandaOrder.totalPrice - totalPaid;

        if (selectedComandaOrder.items.length > 0 && bal > 0.01) {
            addToast({ message: 'Ainda há saldo pendente para esta comanda.', type: 'warning' });
            return;
        }

        try {
            await updateOrderStatus(selectedComandaOrder.id, 'Entregue');
            addToast({ message: `Comanda ${selectedComandaOrder.comandaNumber} encerrada!`, type: 'success' });
            setSelectedComandaOrder(null);
            setSelectedComandaNum(null);
        } catch (e: any) {
            addToast({ message: `Erro ao encerrar: ${e.message}`, type: 'error' });
        }
    };

    const handleCancelComanda = async () => {
        if (!selectedComandaOrder) return;
        const confirmed = await confirm({
            title: 'Cancelar Comanda',
            message: `Deseja cancelar a comanda ${selectedComandaOrder.comandaNumber}?`,
            confirmText: 'Sim, Cancelar',
            cancelText: 'Voltar',
            isDestructive: true
        });

        if (confirmed) {
            try {
                await updateOrderStatus(selectedComandaOrder.id, 'Cancelado');
                addToast({ message: 'Comanda cancelada.', type: 'success' });
                setSelectedComandaOrder(null);
                setSelectedComandaNum(null);
            } catch (e: any) {
                addToast({ message: `Erro: ${e.message}`, type: 'error' });
            }
        }
    };

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-6 pb-32">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
                        <ReceiptIcon className="w-7 h-7 text-orange-600" />
                        Controle de Comandas (1 a 200)
                    </h2>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">Selecione uma comanda para gerenciar pedidos, peso e pagamentos</p>
                </div>
            </div>

            {/* Grid de 200 Comandas com botões menores para caber mais na tela */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
                {comandaNumbers.map(num => {
                    const order = activeComandasMap[num];
                    const isOpen = !!order;

                    let btnStyle = 'bg-white border-gray-200 text-gray-600 hover:border-orange-300';
                    if (isOpen) {
                        btnStyle = 'bg-orange-600 border-orange-700 text-white shadow-md shadow-orange-100';
                    }

                    return (
                        <button
                            key={num}
                            onClick={() => handleComandaClick(num)}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 border transition-all active:scale-95 text-center ${btnStyle}`}
                        >
                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Cmd</span>
                            <span className="text-lg sm:text-xl font-black leading-none">{num}</span>
                            
                            {isOpen ? (
                                <div className="w-full truncate">
                                    <span className="text-[8px] font-bold truncate block w-full px-0.5 leading-tight opacity-90">
                                        {order.customerName}
                                    </span>
                                    <span className="text-[9px] font-black block w-full px-0.5 leading-tight">
                                        R$ {order.totalPrice.toFixed(0)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[8px] font-bold opacity-30 uppercase">Livre</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Modal de Abertura de Nova Comanda */}
            {isCreateModalOpen && selectedComandaNum && !selectedComandaOrder && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-black text-gray-800">Abrir Comanda {selectedComandaNum}</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-black">✕</button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-1">Nome do Cliente *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: João Silva"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-1">Telefone (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    value={newCustomerPhone}
                                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                                    className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateComanda}
                                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-black shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors"
                            >
                                Abrir Comanda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gestão da Comanda Selecionada */}
            {selectedComandaOrder && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-2xl sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
                        <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-10 h-10 bg-orange-600 text-white font-black text-lg rounded-xl flex items-center justify-center shadow-md">
                                        {selectedComandaOrder.comandaNumber}
                                    </span>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{selectedComandaOrder.customerName}</h3>
                                        <p className="text-xs text-orange-600 font-black uppercase">Comanda Ativa #{selectedComandaOrder.comandaNumber}</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedComandaOrder(null); setSelectedComandaNum(null); }}
                                className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                            {/* Ações Rápidas */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    onClick={() => setIsAddItemModalOpen(true)}
                                    className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-blue-100 transition-colors"
                                >
                                    <span>➕ Item Cardápio</span>
                                </button>
                                {restaurant?.hasKiloService && restaurant?.pricePerKilo && (
                                    <button
                                        onClick={handleAddKiloItem}
                                        className="p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-purple-100 transition-colors"
                                    >
                                        <span>⚖️ Pesar Prato</span>
                                    </button>
                                )}
                                <button
                                    onClick={triggerKitchenPrint}
                                    className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-amber-100 transition-colors"
                                >
                                    <span>🍳 Imprimir Cozinha</span>
                                </button>
                                <button
                                    onClick={triggerBillPrint}
                                    className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase flex flex-col items-center gap-1 hover:bg-emerald-100 transition-colors"
                                >
                                    <span>🧾 Imprimir Conta</span>
                                </button>
                            </div>

                            {/* Lista de Itens */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Itens Consumidos</h4>
                                {selectedComandaOrder.items.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic text-center py-6 bg-gray-50 rounded-2xl border border-dashed">Nenhum item lançado ainda.</p>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {selectedComandaOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-bold text-gray-800 text-sm">{item.quantity}x {item.name}</p>
                                                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-gray-800 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 p-1 font-bold text-xs">🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Resumo Financeiro & Pagamentos */}
                            <div className="bg-gray-50 p-4 rounded-2xl border space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Subtotal:</span>
                                    <span className="font-bold text-gray-800">R$ {selectedComandaOrder.totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Total Pago:</span>
                                    <span className="font-bold text-green-600">R$ {totalPaid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base border-t pt-2">
                                    <span className="font-black text-gray-800 uppercase">Restante:</span>
                                    <span className={`font-black ${balance > 0.01 ? 'text-red-600' : 'text-green-600'}`}>R$ {balance.toFixed(2)}</span>
                                </div>

                                {selectedComandaOrder.paymentHistory && selectedComandaOrder.paymentHistory.length > 0 && (
                                    <div className="text-xs text-gray-500 pt-1 border-t">
                                        <span className="font-bold">Histórico: </span>
                                        {selectedComandaOrder.paymentHistory.map((p, i) => (
                                            <span key={i} className="inline-block bg-white px-2 py-0.5 rounded border mr-1 my-0.5">
                                                R$ {p.amount.toFixed(2)} ({p.method})
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rodapé com Ações de Pagamento e Encerramento */}
                        <div className="p-4 sm:p-6 border-t bg-gray-50 flex flex-wrap gap-3 justify-between items-center">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setSelectedComandaOrder(null); setSelectedComandaNum(null); }}
                                    className="px-4 py-2.5 bg-gray-200 text-gray-800 border border-gray-300 rounded-xl font-black text-xs uppercase hover:bg-gray-300 transition-colors flex items-center gap-1 shadow-sm"
                                >
                                    🔽 Ocultar Comanda
                                </button>
                                <button
                                    onClick={handleCancelComanda}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase hover:bg-red-100 transition-colors"
                                >
                                    Cancelar Comanda
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {balance > 0.01 && (
                                    <button
                                        onClick={() => { setPaymentAmount(balance.toFixed(2)); setIsPaymentModalOpen(true); }}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-md hover:bg-blue-700 transition-colors"
                                    >
                                        Registrar Pagamento
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseComanda}
                                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-md transition-colors ${balance <= 0.01 ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                                >
                                    Encerrar Comanda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento com Escolha de Tipo de Pagamento */}
            {isPaymentModalOpen && selectedComandaOrder && (
                <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-black text-gray-800">Registrar Pagamento</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 font-bold">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-1">Valor do Pagamento (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full p-3 border rounded-xl font-black text-xl text-gray-800 bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-1">Tipo de Pagamento</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                >
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="PIX">PIX</option>
                                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                                    <option value="Cartão de Débito">Cartão de Débito</option>
                                    {restaurant?.hasMensalistas && <option value="Mensalista">Mensalista (Fiado/Mensal)</option>}
                                </select>
                            </div>

                            {paymentMethod === 'Dinheiro' && (
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-500 mb-1">Troco para (R$) - Opcional</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 50.00"
                                        value={changeFor}
                                        onChange={(e) => setChangeFor(e.target.value)}
                                        className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            {paymentMethod === 'Mensalista' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-black uppercase text-gray-500 mb-1">Buscar Mensalista</label>
                                    <input
                                        type="text"
                                        placeholder="Digite o nome ou telefone..."
                                        value={mensalistaSearch}
                                        onChange={(e) => {
                                            setMensalistaSearch(e.target.value);
                                            if (currentUser?.restaurantId) {
                                                searchMensalistas(e.target.value, currentUser.restaurantId).then(setMensalistaSuggestions);
                                            }
                                        }}
                                        className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:outline-none"
                                    />
                                    {mensalistaSuggestions.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto border rounded-xl bg-white shadow-sm">
                                            {mensalistaSuggestions.map(m => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => { setSelectedMensalista(m); setMensalistaSearch(m.name); setMensalistaSuggestions([]); }}
                                                    className="p-2.5 hover:bg-orange-50 cursor-pointer text-xs font-bold border-b last:border-b-0"
                                                >
                                                    {m.name} ({m.phone}) - Saldo: R$ {m.balance.toFixed(2)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-200 hover:bg-green-700"
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Adicionar Item do Cardápio */}
            <AddItemToOrderModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                restaurantName={restaurant?.name || 'Restaurante'}
                allMenuItems={menuItems}
                allCombos={combos}
                onSelectMenuItem={handleAddItemFromMenu}
                onSelectCombo={(combo) => {
                    const comboItem: CartItem = {
                        id: `combo-${combo.id}-${Date.now()}`,
                        restaurantId: combo.restaurantId,
                        name: combo.name,
                        price: combo.price,
                        basePrice: combo.price,
                        imageUrl: combo.imageUrl,
                        quantity: 1,
                        description: combo.description || ''
                    };
                    handleAddItemFromMenu(comboItem as any);
                }}
            />
        </div>
    );
};

export default ComandaManagement;
