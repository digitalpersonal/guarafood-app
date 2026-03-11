import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Order, CartItem } from '../types';

interface TableKitchenDisplayProps {
    orders: Order[];
    onUpdateItemStatus: (orderId: string, itemId: string, status: 'pending' | 'preparing' | 'ready') => void;
}

const TableKitchenDisplay: React.FC<TableKitchenDisplayProps> = ({ orders, onUpdateItemStatus }) => {
    const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
    const prevOrdersRef = useRef<Order[]>([]);

    const tableOrders = useMemo(() => {
        return orders.filter(o => (o.status === 'Mesa Aberta' || o.status === 'Aguardando Pagamento') && o.tableNumber);
    }, [orders]);

    useEffect(() => {
        const prevOrders = prevOrdersRef.current;
        const newOrders = tableOrders.filter(o => !prevOrders.find(po => po.id === o.id));
        
        if (newOrders.length > 0) {
            const newIds = new Set(newOrderIds);
            newOrders.forEach(o => newIds.add(o.id));
            setNewOrderIds(newIds);
            
            // Remove after 5 seconds
            setTimeout(() => {
                setNewOrderIds(prev => {
                    const next = new Set(prev);
                    newOrders.forEach(o => next.delete(o.id));
                    return next;
                });
            }, 5000);
        }
        
        prevOrdersRef.current = tableOrders;
    }, [tableOrders]);

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <h2 className="text-2xl font-black text-gray-800 mb-6">Kanban de Mesas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableOrders.map(order => (
                    <div key={order.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-200 transition-all duration-500 ${newOrderIds.has(order.id) ? 'animate-pulse ring-4 ring-orange-400 bg-orange-50' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-gray-800">Mesa {order.tableNumber}</h3>
                            <span className="text-xs font-bold text-gray-500">#{order.order_number}</span>
                        </div>
                        <div className="space-y-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-bold text-gray-700">{item.quantity}x {item.name}</span>
                                    <div className="flex gap-1">
                                        {(['pending', 'preparing', 'ready'] as const).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => onUpdateItemStatus(order.id, item.id, status)}
                                                className={`px-2 py-1 text-[10px] font-black uppercase rounded ${
                                                    item.status === status 
                                                    ? status === 'pending' ? 'bg-gray-400 text-white' : status === 'preparing' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {status === 'pending' ? 'Pendente' : status === 'preparing' ? 'Preparando' : 'Pronto'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TableKitchenDisplay;
