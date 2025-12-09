
import React, { useState, useMemo } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import type { Order, OrderStatus } from '../types';
import OrderDetailsModal from './OrderDetailsModal';
import { updateOrderStatus } from '../services/orderService';


const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
);
const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
);


const statusConfig: { [key in OrderStatus]: { text: string; color: string; } } = {
    'Aguardando Pagamento': { text: 'Pgto Pendente', color: 'bg-gray-400' },
    'Novo Pedido': { text: 'Novo', color: 'bg-blue-500' },
    'Preparando': { text: 'Preparo', color: 'bg-yellow-500' },
    'A Caminho': { text: 'Entrega', color: 'bg-orange-500' },
    'Entregue': { text: 'Entregue', color: 'bg-green-500' },
    'Cancelado': { text: 'Cancelado', color: 'bg-red-500' },
};

const OrderCard: React.FC<{ order: Order; onStatusUpdate: (id: string, status: OrderStatus) => void; onNotify: (order: Order) => void; onViewDetails: (order: Order) => void; }> = ({ order, onStatusUpdate, onNotify, onViewDetails }) => {
    const { confirm } = useNotification();
    const { text, color } = statusConfig[order.status];
    const [isExpanded, setIsExpanded] = useState(false);

    const isNew = useMemo(() => {
        if (order.status !== 'Novo Pedido') return false;
        const orderDate = new Date(order.timestamp);
        const now = new Date();
        // Consider new if less than 5 minutes old
        return (now.getTime() - orderDate.getTime()) < 300000;
    }, [order.status, order.timestamp]);

    const handleConfirmAndUpdate = async (message: string, newStatus: OrderStatus) => {
        const confirmed = await confirm({
            title: 'Confirmar Ação',
            message: message,
            confirmText: 'Sim',
            cancelText: 'Não',
        });
        if (confirmed) {
            onStatusUpdate(order.id, newStatus);
        }
    };

    const timeString = new Date(order.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const ActionButtons: React.FC = () => {
        const btnClass = "flex-1 py-1 px-2 rounded text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap";
        
        switch (order.status) {
            case 'Aguardando Pagamento':
                return (
                    <div className="flex gap-1 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Confirmar pgto?", 'Novo Pedido'); }} className={`${btnClass} bg-green-600`}>
                            Confirmar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Cancelar pedido?", 'Cancelado'); }} className={`${btnClass} bg-red-600`}>
                            Cancelar
                        </button>
                    </div>
                );
            case 'Novo Pedido':
                 return (
                    <div className="flex gap-1 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Aceitar pedido?", 'Preparando'); }} className={`${btnClass} bg-green-600`}>
                            Aceitar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Rejeitar pedido?", 'Cancelado'); }} className={`${btnClass} bg-red-600`}>
                            Rejeitar
                        </button>
                    </div>
                );
            case 'Preparando':
                return (
                    <div className="flex gap-1 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Despachar para entrega?", 'A Caminho'); }} className={`${btnClass} bg-orange-600 flex-grow-[2]`}>
                            Despachar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onNotify(order); }} className={`${btnClass} bg-blue-600`} title="Avisar Cliente">
                            Avisar
                        </button>
                    </div>
                );
            case 'A Caminho':
                return (
                    <div className="flex gap-1 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleConfirmAndUpdate("Marcar como Entregue?", 'Entregue'); }} className={`${btnClass} bg-green-600 flex-grow-[2]`}>
                            Entregue
                        </button>
                         <button onClick={(e) => { e.stopPropagation(); onNotify(order); }} className={`${btnClass} bg-blue-600`} title="Avisar Cliente">
                            Avisar
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-sm p-2 flex flex-col cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 
            ${isNew ? 'border-l-blue-500 animate-pulse ring-1 ring-blue-300' : 'border-l-gray-300 border-gray-200 border'}`}
            onClick={() => onViewDetails(order)}
            role="article"
        >
            {/* Header Compacto */}
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-gray-800 text-sm">#{order.id.substring(0, 4)}</span>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">{timeString}</span>
                </div>
                <div className="text-right">
                    <span className="block font-bold text-sm text-orange-700">R$ {order.totalPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* Informações Resumidas */}
            <div className="space-y-1 mb-1">
                <div className="flex items-center gap-1 text-xs text-gray-800 truncate" title={order.customerName}>
                    <UserIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{order.customerName.split(' ')[0]}</span>
                    <span className="text-gray-400 font-normal truncate">{order.customerName.split(' ').slice(1).join(' ')}</span>
                </div>
                
                {order.customerAddress && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                        <MapPinIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{order.customerAddress.street}, {order.customerAddress.number}</span>
                    </div>
                )}

                <div className="flex items-center gap-1 text-[10px] text-gray-600 truncate">
                    <CreditCardIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className={`truncate ${order.paymentMethod === 'Marcar na minha conta' ? 'text-red-600 font-bold' : ''}`}>
                        {order.paymentMethod === 'Marcar na minha conta' ? 'FIADO' : order.paymentMethod}
                    </span>
                </div>
            </div>

            {/* Itens Colapsáveis Compactos */}
            <div className="border-t border-dashed border-gray-200 pt-1 mt-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="w-full flex justify-between items-center text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded px-1 py-0.5"
                >
                    <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} Itens</span>
                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {isExpanded && (
                    <ul className="mt-1 space-y-1 bg-gray-50 p-1 rounded text-[10px] text-gray-700">
                        {order.items.map((item, idx) => (
                            <li key={`${order.id}-item-${idx}`} className="flex justify-between border-b border-gray-100 last:border-0 pb-0.5">
                                <span className="truncate w-full">
                                    <strong className="text-orange-600">{item.quantity}x</strong> {item.name}
                                </span>
                            </li>
                        ))}
                        {order.notes && (
                            <li className="text-orange-600 italic border-t border-gray-200 pt-0.5 mt-0.5">
                                "{order.notes}"
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Action Buttons */}
            {order.status !== 'Entregue' && order.status !== 'Cancelado' && (
                <ActionButtons />
            )}
        </div>
    );
};

interface OrdersViewProps {
    orders: Order[];
    printerWidth?: number;
}

const OrdersView: React.FC<OrdersViewProps> = ({ orders, printerWidth = 80 }) => {
    const { addToast } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
        updateOrderStatus(orderId, newStatus)
            .then(() => {
                addToast({ message: "Status atualizado!", type: 'success' });
            })
            .catch(err => {
                addToast({ message: `Erro: ${err.message}`, type: 'error' });
            });
    };

    const handleNotify = (order: Order) => {
        const cleanRestaurantPhone = order.restaurantPhone.replace(/\D/g, '');
        let message = '';
        
        if (order.status === 'Preparando') {
            message = `Olá *${order.customerName.split(' ')[0]}*! Recebemos seu pedido *#${order.id.substring(0, 6)}*! 👨‍🍳\n\nJá estamos preparando. Total: R$ ${order.totalPrice.toFixed(2)}.`;
        } else if (order.status === 'A Caminho') {
            message = `Olá *${order.customerName.split(' ')[0]}*! \n\n🏍️ Seu pedido saiu para entrega!\n\nLogo chega aí. Bom apetite! 😋`;
        } else {
            message = `Olá *${order.customerName.split(' ')[0]}*! Sobre seu pedido *#${order.id.substring(0, 6)}*...`;
        }

        const whatsappUrl = `https://wa.me/55${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm.trim()) return orders;
        const lowercasedFilter = searchTerm.toLowerCase();
        return orders.filter(order =>
            order.customerName.toLowerCase().includes(lowercasedFilter) ||
            order.id.substring(0, 6).toLowerCase().includes(lowercasedFilter)
        );
    }, [orders, searchTerm]);

    const { activeOrders, historyOrders, groupedActiveOrders, groupedHistoryOrders } = useMemo(() => {
        const active = filteredOrders.filter(o => ['Novo Pedido', 'Preparando', 'A Caminho', 'Aguardando Pagamento'].includes(o.status));
        const history = filteredOrders.filter(o => ['Entregue', 'Cancelado'].includes(o.status));
        const group = (orderList: Order[]) => orderList.reduce((acc, order) => {
            const status = order.status;
            if (!acc[status]) acc[status] = [];
            acc[status]!.push(order);
            return acc;
        }, {} as { [key in OrderStatus]?: Order[] });

        return {
            activeOrders: active,
            historyOrders: history,
            groupedActiveOrders: group(active),
            groupedHistoryOrders: group(history)
        };
    }, [filteredOrders]);

    // Active Columns Configuration
    const activeSections = [
        { title: 'Pendente', status: 'Aguardando Pagamento' as OrderStatus, bgColor: 'bg-gray-100 border-gray-200' },
        { title: 'Novos', status: 'Novo Pedido' as OrderStatus, bgColor: 'bg-blue-50' },
        { title: 'Cozinha', status: 'Preparando' as OrderStatus, bgColor: 'bg-yellow-50' },
        { title: 'Entrega', status: 'A Caminho' as OrderStatus, bgColor: 'bg-orange-50' },
    ];
    
    const historySections = [
        { title: 'Entregues', status: 'Entregue' as OrderStatus },
        { title: 'Cancelados', status: 'Cancelado' as OrderStatus },
    ];

    const RenderHistoryList = ({ groupedOrders }: { groupedOrders: any }) => (
        <>
            {historySections.map(section => (
                (groupedOrders[section.status] && groupedOrders[section.status]!.length > 0) ? (
                    <div key={section.status} role="region" aria-labelledby={`section-title-${section.status}`}>
                        <h2 id={`section-title-${section.status}`} className="text-xl font-bold mb-4">{section.title} ({groupedOrders[section.status]!.length})</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
                            {groupedOrders[section.status]!.map((order: Order) => (
                                <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} onNotify={handleNotify} onViewDetails={setSelectedOrder} />
                            ))}
                        </div>
                    </div>
                ) : null
            ))}
        </>
    );

    return (
        <>
            <div className="p-3 border-b bg-white sticky top-[138px] z-10 shadow-sm">
                <div className="relative flex gap-2">
                     <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar pedido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-9 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                            aria-label="Buscar pedidos"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="flex bg-gray-200 rounded-lg p-1 flex-shrink-0">
                        <button 
                            onClick={() => setViewMode('active')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'active' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        >
                            Ativos
                        </button>
                        <button 
                            onClick={() => setViewMode('history')} 
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'history' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        >
                            Histórico
                        </button>
                    </div>
                </div>
            </div>

            <main className="p-3 bg-gray-50 min-h-[calc(100vh-200px)]">
                {viewMode === 'active' && (
                    <div id="panel-active-orders" role="tabpanel" className="h-full">
                        {/* KANBAN LAYOUT - Compact Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start h-full">
                            {activeSections.map(section => {
                                const ordersInSection = groupedActiveOrders[section.status] || [];
                                return (
                                    <div key={section.status} className={`p-2 rounded-lg flex flex-col shadow-inner border border-gray-200 ${section.bgColor}`}>
                                        {/* Column Header */}
                                        <h2 className="text-sm font-bold mb-2 flex justify-between items-center text-gray-700 uppercase tracking-wide px-1">
                                            {section.title}
                                            <span className="bg-white text-gray-800 px-2 py-0.5 rounded-full text-xs shadow-sm font-extrabold border">
                                                {ordersInSection.length}
                                            </span>
                                        </h2>
                                        
                                        {/* Orders Container */}
                                        <div className="space-y-2 flex-grow min-h-[100px]">
                                            {ordersInSection.length > 0 ? (
                                                ordersInSection.map((order: Order) => (
                                                    <OrderCard 
                                                        key={order.id} 
                                                        order={order} 
                                                        onStatusUpdate={handleStatusUpdate} 
                                                        onNotify={handleNotify} 
                                                        onViewDetails={setSelectedOrder} 
                                                    />
                                                ))
                                            ) : (
                                                <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-300/50 rounded-lg">
                                                    <p className="text-gray-400 text-xs italic">Vazio</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {viewMode === 'history' && (
                    <div id="panel-history-orders" role="tabpanel">
                        {historyOrders.length > 0 ? (
                            <RenderHistoryList groupedOrders={groupedHistoryOrders} />
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold text-sm">Histórico vazio.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
            {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} printerWidth={printerWidth} />}
        </>
    );
};

export default OrdersView;
