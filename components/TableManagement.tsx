
import React, { useState, useMemo, useEffect } from 'react';
import type { Order, CartItem, PaymentEntry, StaffMember, Restaurant } from '../types';
import { createOrder, recordOrderPayment, updateOrderStatus, fetchOpenTableOrder, fetchOpenTableOrders, requestKitchenPrint, requestBillPrint, markPrintJobAsDone, updateOrderDetails } from '../services/orderService';
import { getMensalistaByPhone } from '../services/mensalistaService';
import { fetchRestaurantByIdSecure } from '../services/databaseService';
import { supabase } from '../services/api';
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

const MinimizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);

import PrintableOrder from './PrintableOrder';

interface TableManagementProps {
    orders: Order[];
    currentStaffUser?: StaffMember | null;
    onPrint?: (order: Order, mode: 'full' | 'kitchen', items?: CartItem[]) => void;
}

const TableManagement: React.FC<TableManagementProps> = ({ orders, currentStaffUser, onPrint }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableOrders, setTableOrders] = useState<Order[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [selectedTableOrder, setSelectedTableOrder] = useState<Order | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [changeFor, setChangeFor] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    
    // Printing States
    const [printedItems, setPrintedItems] = useState<Set<string>>(new Set());

    const tableNumbers = Array.from({ length: 30 }, (_, i) => (i + 1).toString());

    useEffect(() => {
        const loadRestaurant = async () => {
            if (currentUser?.restaurantId) {
                const data = await fetchRestaurantByIdSecure(currentUser.restaurantId);
                setRestaurant(data);
            }
        };
        loadRestaurant();
    }, [currentUser?.restaurantId]);

    const activeTables = useMemo(() => {
        // Filtramos pedidos de mesa abertos
        return orders.filter(o => o.status === 'Aguardando Pagamento' && o.tableNumber);
    }, [orders]);

    // Agrupar pedidos por mesa para o grid
    const tableSummaries = useMemo(() => {
        const summaries: Record<string, { count: number; total: number; hasUnserved: boolean }> = {};
        activeTables.forEach(o => {
            const num = o.tableNumber!;
            if (!summaries[num]) {
                summaries[num] = { count: 0, total: 0, hasUnserved: false };
            }
            summaries[num].count += 1;
            summaries[num].total += o.totalPrice;
            if (o.items?.some(item => !item.served)) {
                summaries[num].hasUnserved = true;
            }
        });
        return summaries;
    }, [activeTables]);

    const handleOpenTable = async (tableNum: string) => {
        setSelectedTable(tableNum);
        if (currentUser?.restaurantId) {
            try {
                const orders = await fetchOpenTableOrders(currentUser.restaurantId, tableNum);
                setTableOrders(orders);
                
                // Se só tiver uma comanda e ela não tiver número/nome específico além de "Mesa X", 
                // talvez queiramos abrir direto? Mas o usuário quer a opção de comandas.
                // Vamos mostrar a lista sempre que houver pelo menos uma ou para criar a primeira.
            } catch (e) {
                console.error("Erro ao buscar comandas da mesa:", e);
                setTableOrders([]);
            }
        }
    };

    const handleCreateComanda = async () => {
        if (!selectedTable || !currentUser?.restaurantId) return;

        const comandaName = await prompt({
            title: 'Nova Comanda',
            message: 'Nome do Cliente:',
            placeholder: 'Ex: João Silva',
            submitText: 'Continuar',
            cancelText: 'Cancelar'
        });

        if (!comandaName) return;

        const comandaNum = await prompt({
            title: 'Número da Comanda',
            message: 'Número ou Identificador (Opcional):',
            placeholder: 'Ex: 01',
            submitText: 'Abrir Comanda',
            cancelText: 'Pular'
        });

        try {
            const newOrder = await createOrder({
                customerName: comandaName,
                customerPhone: '0000000000',
                customerAddress: { 
                    zipCode: '00000-000', 
                    street: 'Consumo Local', 
                    number: 'Mesa ' + selectedTable, 
                    neighborhood: 'Salão', 
                    complement: comandaNum ? `Comanda ${comandaNum}` : '' 
                },
                items: [],
                totalPrice: 0,
                restaurantId: currentUser.restaurantId,
                restaurantName: currentUser.name,
                restaurantAddress: '',
                restaurantPhone: '',
                paymentMethod: 'Dinheiro',
                tableNumber: selectedTable,
                comandaNumber: comandaNum || undefined,
                status: 'Aguardando Pagamento'
            });
            
            addToast({ message: `Comanda para ${comandaName} aberta na Mesa ${selectedTable}!`, type: 'success' });
            setTableOrders(prev => [...prev, newOrder]);
            setSelectedTableOrder(newOrder);
        } catch (e: any) {
            console.error("Erro ao abrir comanda:", e);
            addToast({ message: `Erro ao abrir comanda: ${e.message}`, type: 'error' });
        }
    };

    const handleCreateKiloComanda = async () => {
        if (!selectedTable || !currentUser?.restaurantId || !restaurant?.pricePerKilo) return;

        const comandaName = await prompt({
            title: 'Nova Comanda (Peso)',
            message: 'Nome do Cliente:',
            placeholder: 'Ex: João Silva',
            submitText: 'Continuar',
            cancelText: 'Cancelar'
        });

        if (!comandaName) return;

        const comandaNum = await prompt({
            title: 'Número da Comanda',
            message: 'Número ou Identificador (Opcional):',
            placeholder: 'Ex: 01',
            submitText: 'Continuar',
            cancelText: 'Pular'
        });

        const weightStr = await prompt({
            title: 'Pesar Prato',
            message: `Valor do Kg: R$ ${restaurant.pricePerKilo.toFixed(2)}\nDigite o peso em KG (ex: 0.450):`,
            placeholder: '0.000',
            submitText: 'Confirmar Peso',
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

            const newOrder = await createOrder({
                customerName: comandaName,
                customerPhone: '0000000000',
                customerAddress: { 
                    zipCode: '00000-000', 
                    street: 'Consumo Local', 
                    number: 'Mesa ' + selectedTable, 
                    neighborhood: 'Salão', 
                    complement: comandaNum ? `Comanda ${comandaNum}` : '' 
                },
                items: [kiloItem],
                totalPrice: itemPrice,
                restaurantId: currentUser.restaurantId,
                restaurantName: currentUser.name,
                restaurantAddress: '',
                restaurantPhone: '',
                paymentMethod: 'Dinheiro',
                tableNumber: selectedTable,
                comandaNumber: comandaNum || undefined,
                status: 'Aguardando Pagamento'
            });
            
            addToast({ message: `Comanda de peso para ${comandaName} aberta!`, type: 'success' });
            setTableOrders(prev => [...prev, newOrder]);
            setSelectedTableOrder(newOrder);
        } catch (e: any) {
            console.error("Erro ao abrir comanda por peso:", e);
            addToast({ message: `Erro: ${e.message}`, type: 'error' });
        }
    };

    const handleAddKiloItem = async () => {
        if (!selectedTableOrder || !restaurant?.pricePerKilo) return;

        const weightStr = await prompt({
            title: 'Adicionar Peso',
            message: `Valor do Kg: R$ ${restaurant.pricePerKilo.toFixed(2)}\nDigite o peso em KG (ex: 0.450):`,
            placeholder: '0.000',
            submitText: 'Adicionar ao Pedido',
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

            const updatedItems = [...selectedTableOrder.items, kiloItem];
            const updatedSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const updatedTotal = updatedSubtotal - (selectedTableOrder.discountAmount || 0);

            const updatedOrder = await updateOrderDetails(selectedTableOrder.id, {
                items: updatedItems,
                totalPrice: updatedTotal,
                subtotal: updatedSubtotal,
                discountAmount: selectedTableOrder.discountAmount
            });

            setSelectedTableOrder(updatedOrder);
            addToast({ message: 'Item por peso adicionado!', type: 'success' });
        } catch (e: any) {
            addToast({ message: `Erro ao adicionar item: ${e.message}`, type: 'error' });
        }
    };

    const handleCloseModal = async () => {
        setSelectedTableOrder(null);
    };

    const handleCloseTableList = () => {
        setSelectedTable(null);
        setTableOrders([]);
    };

    const triggerKitchenPrint = (order: Order) => {
        if (onPrint) {
            // Filter only items not yet printed for kitchen
            const unprintedItems = order.items.filter(item => !printedItems.has(`${order.id}-${item.name}-${item.price}`));
            if (unprintedItems.length === 0) {
                addToast({ message: 'Todos os itens já foram enviados para a cozinha.', type: 'info' });
                return;
            }
            onPrint(order, 'kitchen', unprintedItems);
            // Mark as printed locally
            const newPrinted = new Set(printedItems);
            unprintedItems.forEach(item => newPrinted.add(`${order.id}-${item.name}-${item.price}`));
            setPrintedItems(newPrinted);
        }
    };

    const triggerBillPrint = (order: Order) => {
        if (onPrint) {
            onPrint(order, 'full');
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedTableOrder || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        try {
            // Fetch fresh order data to ensure we have the latest total price and history
            const { data: latestOrderRaw, error: fetchError } = await supabase.from('orders').select('*').eq('id', selectedTableOrder.id).single();
            
            if (fetchError || !latestOrderRaw) {
                throw new Error('Falha ao buscar dados atualizados do pedido.');
            }

            const dbTotalPrice = latestOrderRaw.total_price;
            const dbHistory = latestOrderRaw.payment_history || latestOrderRaw.payment_details?.history || [];
            
            const currentPaid = dbHistory.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
            const newTotalPaid = currentPaid + amount;

            let finalMethod = paymentMethod;
            let mensalistaId: string | undefined = undefined;
            if (paymentMethod === 'Dinheiro' && changeFor) {
                const changeVal = parseFloat(changeFor.replace(',', '.').trim());
                if (!isNaN(changeVal) && changeVal > amount) {
                    finalMethod = `Dinheiro (Troco para R$ ${changeVal.toFixed(2)})`;
                }
            } else if (paymentMethod === 'Mensalista') {
                const phone = await prompt({
                    title: 'Identificar Mensalista',
                    message: 'Digite o WhatsApp do mensalista (somente números):',
                    submitText: 'Confirmar',
                    cancelText: 'Cancelar'
                });
                if (!phone) return;
                
                const mensalista = await getMensalistaByPhone(phone.replace(/\D/g, ''), currentUser!.restaurantId!);
                if (!mensalista) {
                    addToast({ message: 'Mensalista não encontrado ou inativo.', type: 'error' });
                    return;
                }
                
                finalMethod = `Mensalista (${mensalista.name})`;
                mensalistaId = mensalista.id;
            }

            const entry: PaymentEntry = {
                amount,
                method: finalMethod,
                timestamp: new Date().toISOString()
            };
            
            const updated = await recordOrderPayment(selectedTableOrder.id, entry, newTotalPaid, dbTotalPrice, mensalistaId);
            
            setSelectedTableOrder(updated);
            setPaymentAmount('');
            setChangeFor('');
            setIsPaymentModalOpen(false);
            addToast({ message: 'Pagamento registrado!', type: 'success' });

            if (updated.paymentStatus === 'paid' || newTotalPaid >= dbTotalPrice - 0.01) {
                addToast({ message: 'Conta quitada! O botão para encerrar a mesa foi liberado.', type: 'success' });
            }
        } catch (e: any) {
            console.error("Payment error:", e);
            addToast({ message: `Erro ao processar pagamento: ${e.message || 'Erro desconhecido'}`, type: 'error' });
        }
    };

    const handleQuickPayment = async (method: string) => {
        if (!selectedTableOrder || balance <= 0) return;
        
        const amount = balance;
        const entry: PaymentEntry = {
            amount,
            method,
            timestamp: new Date().toISOString()
        };

        try {
            const { data: latestOrderRaw } = await supabase.from('orders').select('total_price, payment_history, payment_details').eq('id', selectedTableOrder.id).single();
            if (!latestOrderRaw) throw new Error('Pedido não encontrado.');

            const dbTotalPrice = latestOrderRaw.total_price;
            const history = latestOrderRaw.payment_history || latestOrderRaw.payment_details?.history || [];
            const currentPaid = history.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
            const newTotalPaid = currentPaid + amount;

            const updated = await recordOrderPayment(selectedTableOrder.id, entry, newTotalPaid, dbTotalPrice);
            setSelectedTableOrder(updated);
            addToast({ message: `Pagamento de R$ ${amount.toFixed(2)} (${method}) registrado!`, type: 'success' });
            
            if (newTotalPaid >= dbTotalPrice - 0.01) {
                addToast({ message: 'Conta quitada!', type: 'success' });
            }
        } catch (e: any) {
            addToast({ message: `Erro: ${e.message}`, type: 'error' });
        }
    };

    const handleCloseTable = async () => {
        if (!selectedTableOrder) return;
        
        const totalPaid = (selectedTableOrder.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
        const balance = selectedTableOrder.totalPrice - totalPaid;

        if (selectedTableOrder.items.length > 0 && balance > 0.01) {
            addToast({ message: 'Não é possível encerrar a mesa com saldo pendente. Por favor, registre o pagamento.', type: 'warning' });
            return;
        }
        try {
             await updateOrderStatus(selectedTableOrder.id, 'Entregue');
             addToast({ message: 'Comanda encerrada com sucesso!', type: 'success' });
             setSelectedTableOrder(null);
        } catch (e: any) {
             addToast({ message: `Erro ao encerrar mesa: ${e.message}`, type: 'error' });
        }
    };

    const handleCancelTable = async () => {
        if (!selectedTableOrder) return;

        if (selectedTableOrder.items.length > 0) {
            addToast({ message: 'Não é possível cancelar a mesa com itens lançados.', type: 'warning' });
            return;
        }

        // Restrição: Apenas administradores/gerentes podem cancelar mesa
        if (currentStaffUser && currentStaffUser.role !== 'manager') {
            addToast({ 
                message: 'Apenas o gerente pode cancelar mesas. Por favor, solicite a autorização.', 
                type: 'warning' 
            });
            return;
        }

        const confirmed = await confirm({
            title: 'Cancelar Comanda',
            message: 'Tem certeza que deseja cancelar esta comanda? Isso liberará a comanda e o pedido não será cobrado.',
            confirmText: 'Sim, Cancelar',
            cancelText: 'Voltar'
        });

        if (confirmed) {
            try {
                await updateOrderStatus(selectedTableOrder.id, 'Cancelado');
                addToast({ message: 'Comanda cancelada.', type: 'success' });
                setSelectedTableOrder(null);
            } catch (e: any) {
                addToast({ message: `Erro ao cancelar comanda: ${e.message}`, type: 'error' });
            }
        }
    };

    const handleRemoveItem = async (index: number) => {
        if (!selectedTableOrder) return;
        
        const confirmed = await confirm({
            title: 'Remover Item',
            message: `Deseja remover o item "${selectedTableOrder.items[index].name}" do pedido?`,
            confirmText: 'Sim, Remover',
            cancelText: 'Cancelar',
            isDestructive: true
        });

        if (confirmed) {
            try {
                const newItems = [...selectedTableOrder.items];
                newItems.splice(index, 1);
                
                const newSubtotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const newTotal = newSubtotal - (selectedTableOrder.discountAmount || 0);
                
                const updated = await updateOrderDetails(selectedTableOrder.id, {
                    items: newItems,
                    totalPrice: newTotal,
                    subtotal: newSubtotal,
                    discountAmount: selectedTableOrder.discountAmount
                });
                
                setSelectedTableOrder(updated);
                addToast({ message: 'Item removido com sucesso.', type: 'success' });
            } catch (e: any) {
                addToast({ message: `Erro ao remover item: ${e.message}`, type: 'error' });
            }
        }
    };

    const handleToggleItemServed = async (index: number) => {
        if (!selectedTableOrder) return;
        
        try {
            const newItems = [...selectedTableOrder.items];
            newItems[index] = { ...newItems[index], served: !newItems[index].served };
            
            const updated = await updateOrderDetails(selectedTableOrder.id, {
                items: newItems,
                totalPrice: selectedTableOrder.totalPrice,
                subtotal: selectedTableOrder.subtotal || selectedTableOrder.totalPrice,
                discountAmount: selectedTableOrder.discountAmount
            });
            
            setSelectedTableOrder(updated);
        } catch (e: any) {
            addToast({ message: `Erro ao atualizar item: ${e.message}`, type: 'error' });
        }
    };

    const totalPaid = (selectedTableOrder?.paymentHistory || []).reduce((acc, p) => acc + p.amount, 0);
    const balance = (selectedTableOrder?.totalPrice || 0) - totalPaid;

    return (
        <div className="p-4 max-w-5xl mx-auto space-y-6 pb-32">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <StoreIcon className="w-7 h-7 text-orange-600" />
                    Gestão de Mesas
                </h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {tableNumbers.map(num => {
                    const summary = tableSummaries[num];
                    const isOpen = !!summary;
                    const hasUnservedItems = summary?.hasUnserved;
                    
                    let buttonClass = 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-400';
                    if (isOpen) {
                        if (hasUnservedItems) {
                            buttonClass = 'bg-red-500 border-red-600 text-white shadow-red-200';
                        } else {
                            buttonClass = 'bg-orange-500 border-orange-600 text-white shadow-orange-200';
                        }
                    }

                    return (
                        <button
                            key={num}
                            onClick={() => handleOpenTable(num)}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-sm active:scale-95 ${buttonClass}`}
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase opacity-60">Mesa</span>
                                <span className="text-3xl font-black">{num}</span>
                            </div>
                            {isOpen && (
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-[9px] font-black bg-white/20 px-1.5 rounded uppercase flex items-center gap-1">
                                        {summary.count} {summary.count === 1 ? 'Comanda' : 'Comandas'}
                                        {hasUnservedItems && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                                    </span>
                                    <span className="text-[10px] font-bold truncate w-full px-2 text-center">
                                        R$ {summary.total.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Modal de Lista de Comandas da Mesa */}
            {selectedTable && !selectedTableOrder && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-lg sm:rounded-3xl shadow-2xl animate-slideUp max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 sm:rounded-t-3xl">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase">Mesa {selectedTable}</h3>
                                <p className="text-sm text-gray-500 font-bold">Selecione ou abra uma comanda</p>
                            </div>
                            <button 
                                onClick={handleCloseTableList}
                                className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {tableOrders.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                    <StoreIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-400 font-bold">Nenhuma comanda aberta nesta mesa.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {tableOrders.map(order => (
                                        <button
                                            key={order.id}
                                            onClick={() => setSelectedTableOrder(order)}
                                            className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-500 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-black text-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                    {order.comandaNumber || '?'}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-black text-gray-800 uppercase text-sm">{order.customerName}</h4>
                                                    <p className="text-xs text-gray-400 font-bold">#{String(order.order_number || '').padStart(3, '0')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-gray-800">R$ {order.totalPrice.toFixed(2)}</p>
                                                {order.items.some(i => !i.served) && (
                                                    <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 justify-end">
                                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                                        Itens pendentes
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 sm:rounded-b-3xl space-y-3">
                            {restaurant?.hasKiloService && (
                                <button
                                    onClick={handleCreateKiloComanda}
                                    className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Nova Comanda por Peso
                                </button>
                            )}
                            <button
                                onClick={handleCreateComanda}
                                className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Abrir Nova Comanda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedTableOrder && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-xl sm:rounded-3xl shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-black text-gray-800 uppercase">Mesa {selectedTableOrder.tableNumber}</h3>
                                    {selectedTableOrder.comandaNumber && (
                                        <span className="bg-purple-600 text-white text-xs font-black px-2 py-0.5 rounded-lg">
                                            COMANDA {selectedTableOrder.comandaNumber}
                                        </span>
                                    )}
                                    <span className="bg-orange-100 text-orange-600 text-xs font-black px-2 py-0.5 rounded-lg">
                                        #{String(selectedTableOrder.order_number || '').padStart(3, '0')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                    <UserIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">{selectedTableOrder.customerName}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCloseModal} 
                                    className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                                    title="Minimizar (Manter Aberta)"
                                >
                                    <MinimizeIcon className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={handleCloseModal} 
                                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                    title="Fechar Janela"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Itens da Comanda */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Consumo Atual</h4>
                                    <div className="flex gap-2">
                                        {restaurant?.hasKiloService && (
                                            <button 
                                                onClick={handleAddKiloItem}
                                                className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1 hover:bg-emerald-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg> 
                                                Pesar Prato
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1 hover:bg-orange-200 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg> 
                                            Lançar Itens
                                        </button>
                                    </div>
                                </div>
                                
                                {selectedTableOrder.items.length === 0 ? (
                                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                                        <p className="text-gray-300 font-bold italic">Nenhum item lançado ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedTableOrder.items.map((item, i) => (
                                            <div key={i} className={`flex flex-col p-3 rounded-xl border group transition-colors ${item.served ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex gap-3 items-center">
                                                        <label className="flex items-center cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!item.served}
                                                                onChange={() => handleToggleItemServed(i)}
                                                                className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                            />
                                                        </label>
                                                        <span className={`font-black ${item.served ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {item.isKiloItem ? `${item.weight?.toFixed(3)}kg` : `${item.quantity}x`}
                                                        </span>
                                                        <span className={`font-bold text-sm ${item.served ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-800'}`}>{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-bold text-sm ${item.served ? 'text-gray-400' : 'text-gray-600'}`}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                        <button 
                                                            onClick={() => handleRemoveItem(i)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remover Item"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {(item.notes || (item.isKiloItem && item.description)) && (
                                                    <p className={`text-[10px] italic mt-1 ml-14 ${item.served ? 'text-gray-300' : 'text-gray-400'}`}>
                                                        {item.isKiloItem ? item.description : `Obs: ${item.notes}`}
                                                    </p>
                                                )}
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
                                {balance > 0.01 && (
                                    <div className="col-span-2 grid grid-cols-3 gap-2 mb-2">
                                        <button 
                                            onClick={() => handleQuickPayment('Dinheiro')}
                                            className="bg-emerald-50 text-emerald-700 font-black py-3 rounded-xl hover:bg-emerald-100 transition-all text-[10px] uppercase border border-emerald-100"
                                        >
                                            Pagar Tudo (Dinheiro)
                                        </button>
                                        <button 
                                            onClick={() => handleQuickPayment('Pix')}
                                            className="bg-emerald-50 text-emerald-700 font-black py-3 rounded-xl hover:bg-emerald-100 transition-all text-[10px] uppercase border border-emerald-100"
                                        >
                                            Pagar Tudo (Pix)
                                        </button>
                                        <button 
                                            onClick={() => handleQuickPayment('Cartão')}
                                            className="bg-emerald-50 text-emerald-700 font-black py-3 rounded-xl hover:bg-emerald-100 transition-all text-[10px] uppercase border border-emerald-100"
                                        >
                                            Pagar Tudo (Cartão)
                                        </button>
                                    </div>
                                )}
                                <button 
                                    onClick={() => triggerKitchenPrint(selectedTableOrder)}
                                    className="bg-orange-100 text-orange-600 font-black py-4 rounded-2xl hover:bg-orange-200 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                    </svg>
                                    Imprimir Cozinha
                                </button>
                                <button 
                                    onClick={() => triggerBillPrint(selectedTableOrder)}
                                    className="bg-gray-100 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 4.5ZM3 4.5a.75.75 0 0 1 .75-.75v.75c0 .414-.336.75-.75.75Zm3.375 0h14.25M6 7.5h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Zm0 4.5h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Zm0 4.5h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75ZM15 7.5h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Zm0 4.5h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75ZM15 15h2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75ZM6 3.75v16.5M12 6.75a.75.75 0 0 1 .75.75v11.25a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .75-.75Zm9.75-.75a.75.75 0 0 1 .75.75v11.25a.75.75 0 0 1-1.5 0V6.75a.75.75 0 0 1 .75-.75Z" />
                                    </svg>
                                    Imprimir Conta
                                </button>
                                
                                {balance > 0.01 ? (
                                    <button 
                                        onClick={() => {
                                            setPaymentAmount(balance.toFixed(2));
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Receber Valor
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleCloseTable}
                                        className="bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all text-sm uppercase tracking-widest animate-pulse"
                                    >
                                        Encerrar Comanda
                                    </button>
                                )}
                                
                                <button 
                                    onClick={() => setSelectedTableOrder(null)}
                                    className="bg-gray-100 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <MinimizeIcon className="w-5 h-5" />
                                    Voltar p/ Mesa
                                </button>
                                <button 
                                    onClick={handleCancelTable}
                                    className={`font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 col-span-2 sm:col-span-1 ${
                                        currentStaffUser && currentStaffUser.role !== 'manager'
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                                    title={currentStaffUser && currentStaffUser.role !== 'manager' ? 'Apenas gerentes podem cancelar' : 'Cancelar Comanda'}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                    Cancelar Comanda
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
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {[5, 10, 20, 50].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setPaymentAmount(val.toFixed(2))}
                                            className="py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black text-gray-600 transition-colors"
                                        >
                                            R$ {val}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setPaymentAmount(balance.toFixed(2))}
                                        className="col-span-4 py-2 bg-emerald-100 hover:bg-emerald-200 rounded-xl text-xs font-black text-emerald-700 transition-colors uppercase"
                                    >
                                        Pagar Total (R$ {balance.toFixed(2)})
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'Dinheiro' && (
                                <div className="animate-fadeIn">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Troco para quanto?</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                        <input 
                                            type="number" 
                                            value={changeFor}
                                            onChange={e => setChangeFor(e.target.value)}
                                            placeholder="Ex: 50,00"
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-orange-500 outline-none transition-all font-bold text-lg"
                                        />
                                    </div>
                                    {changeFor && parseFloat(changeFor) > parseFloat(paymentAmount) && (
                                        <p className="text-[10px] font-black text-orange-600 mt-1 ml-1 uppercase">
                                            Troco: R$ {(parseFloat(changeFor) - parseFloat(paymentAmount)).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Mensalista'].map(m => (
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
                                onClick={() => {
                                    setIsPaymentModalOpen(false);
                                    setChangeFor('');
                                }}
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
            
            {/* Hidden Printable Area - REMOVED (Now handled by OrderManagement) */}
        </div>
    );
};

export default TableManagement;
