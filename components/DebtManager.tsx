import React, { useState, useMemo } from 'react';
import type { Order } from '../types';
import { updateOrderPaymentStatus } from '../services/orderService';
import { useNotification } from '../hooks/useNotification';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);

interface DebtManagerProps {
    orders: Order[];
}

interface CustomerDebt {
    name: string;
    phone: string;
    totalDebt: number;
    orders: Order[];
}

const DebtManager: React.FC<DebtManagerProps> = ({ orders }) => {
    const { addToast, confirm } = useNotification();
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

    // Filter pending orders
    const pendingOrders = useMemo(() => {
        return orders.filter(o => 
            o.paymentStatus === 'pending' || 
            (o.paymentMethod === 'Marcar na minha conta' && o.paymentStatus !== 'paid')
        );
    }, [orders]);

    // Group by customer phone
    const customersWithDebt = useMemo(() => {
        const grouped = pendingOrders.reduce((acc, order) => {
            const phone = order.customerPhone.replace(/\D/g, '');
            if (!acc[phone]) {
                acc[phone] = {
                    name: order.customerName,
                    phone: order.customerPhone,
                    totalDebt: 0,
                    orders: []
                };
            }
            acc[phone].totalDebt += order.totalPrice;
            acc[phone].orders.push(order);
            return acc;
        }, {} as Record<string, CustomerDebt>);

        return (Object.values(grouped) as CustomerDebt[]).sort((a, b) => b.totalDebt - a.totalDebt);
    }, [pendingOrders]);

    const handleToggleExpand = (phone: string) => {
        setExpandedCustomers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(phone)) newSet.delete(phone);
            else newSet.add(phone);
            return newSet;
        });
    };

    const handleSettleDebt = async (orderId: string) => {
        const confirmed = await confirm({
            title: 'Confirmar Pagamento',
            message: 'Deseja marcar este pedido como PAGO?',
            confirmText: 'Sim, Recebi',
        });

        if (confirmed) {
            try {
                await updateOrderPaymentStatus(orderId, 'paid');
                addToast({ message: 'Pagamento registrado!', type: 'success' });
            } catch (error) {
                addToast({ message: 'Erro ao atualizar.', type: 'error' });
            }
        }
    };

    const handleNotifyCustomer = (phone: string, name: string, total: number) => {
        const message = `Olá *${name}*! Tudo bem? \n\nConsta em nosso sistema um débito total de *R$ ${total.toFixed(2)}* referente aos seus pedidos marcados na conta.\n\nPodemos combinar o pagamento?`;
        const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (customersWithDebt.length === 0) {
        return (
            <div className="bg-white p-10 rounded-lg shadow-md text-center">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Tudo em dia!</h3>
                <p className="text-gray-500">Não há contas a receber pendentes no momento.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b bg-orange-50">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    Contas a Receber (Fiado)
                    <span className="bg-orange-200 text-orange-800 text-sm py-1 px-3 rounded-full">
                        Total: R$ {customersWithDebt.reduce((acc, c) => acc + c.totalDebt, 0).toFixed(2)}
                    </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">Gerencie aqui os clientes que compraram na opção "Marcar na conta".</p>
            </div>

            <div className="divide-y">
                {customersWithDebt.map((customer) => (
                    <div key={customer.phone} className="bg-white">
                        <div 
                            className="p-4 flex flex-col sm:flex-row justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleToggleExpand(customer.phone)}
                        >
                            <div className="flex-grow">
                                <h4 className="font-bold text-lg text-gray-800">{customer.name}</h4>
                                <p className="text-sm text-gray-500">{customer.phone}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                <span className="text-xl font-bold text-red-600">R$ {customer.totalDebt.toFixed(2)}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleNotifyCustomer(customer.phone, customer.name, customer.totalDebt); }}
                                    className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                                    title="Cobrar no WhatsApp"
                                >
                                    <WhatsAppIcon className="w-5 h-5" />
                                </button>
                                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${expandedCustomers.has(customer.phone) ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {expandedCustomers.has(customer.phone) && (
                            <div className="bg-gray-50 p-4 border-t border-b border-gray-100 pl-8">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="py-2">Data</th>
                                            <th className="py-2">Pedido</th>
                                            <th className="py-2 text-right">Valor</th>
                                            <th className="py-2 text-center">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {customer.orders.map(order => (
                                            <tr key={order.id}>
                                                <td className="py-3">{new Date(order.timestamp).toLocaleDateString()}</td>
                                                <td className="py-3 font-mono">#{order.id.substring(0, 6)}</td>
                                                <td className="py-3 text-right font-medium">R$ {order.totalPrice.toFixed(2)}</td>
                                                <td className="py-3 text-center">
                                                    <button 
                                                        onClick={() => handleSettleDebt(order.id)}
                                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        Receber
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DebtManager;