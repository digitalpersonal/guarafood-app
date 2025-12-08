
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


const statusConfig: { [key in OrderStatus]: { text: string; color: string; } } = {
    'Aguardando Pagamento': { text: 'Aguardando Pagamento', color: 'bg-gray-400' },
    'Novo Pedido': { text: 'Novo Pedido', color: 'bg-blue-500' },
    'Preparando': { text: 'Em Preparo', color: 'bg-yellow-500' },
    'A Caminho': { text: 'A Caminho', color: 'bg-orange-500' },
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
        // Consider new if less than 2 minutes old
        return (now.getTime() - orderDate.getTime()) < 120000;
    }, [order.status, order.timestamp]);

    const handleConfirmAndUpdate = async (message: string, newStatus: OrderStatus) => {
        const confirmed = await confirm({
            title: 'Confirmação Necessária',
            message: message,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
        });
        if (confirmed) {
            onStatusUpdate(order.id, newStatus);
        }
    };


    const ActionButtons: React.FC = () => {
        switch (order.status) {
            case 'Aguardando Pagamento':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAndUpdate("Confirmar o recebimento do pagamento? O pedido irá para 'Novos Pedidos'.", 'Novo Pedido');
                        }} className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 text-sm">
                            Confirmar Pagamento
                        </button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                             handleConfirmAndUpdate("Tem certeza que deseja cancelar este pedido pendente?", 'Cancelado');
                        }} className="bg-red-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700 text-sm">
                            Cancelar
                        </button>
                    </div>
                );
            case 'Novo Pedido':
                 return (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAndUpdate("Deseja realmente aceitar este pedido e alterar o status para 'Em Preparo'?", 'Preparando');
                        }} className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 text-sm">Aceitar</button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                             handleConfirmAndUpdate("Tem certeza que deseja rejeitar este pedido? O status será alterado para 'Cancelado'.", 'Cancelado');
                        }} className="bg-red-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700 text-sm">Rejeitar</button>
                    </div>
                );
            case 'Preparando':
                return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onNotify(order); }} className="bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 text-sm">Notificar Cliente</button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                             handleConfirmAndUpdate("Confirmar despacho do pedido? O status será alterado para 'A Caminho'.", 'A Caminho');
                        }} className="bg-orange-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-orange-700 text-sm">Despachar</button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                             handleConfirmAndUpdate("Tem certeza que deseja cancelar este pedido?", 'Cancelado');
                        }} className="col-span-2 sm:col-span-1 bg-gray-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
                    </div>
                );
            case 'A Caminho':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onNotify(order); }} className="bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 text-sm">Notificar Entrega</button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAndUpdate("Confirmar que o pedido foi entregue ao cliente?", 'Entregue');
                        }} className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 text-sm">Marcar Entregue</button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-sm p-4 flex flex-col space-y-4 cursor-pointer hover:shadow-md transition-shadow duration-200 
            ${isNew ? 'new-order-pulse border-2 border-blue-400' : 'border border-gray-200'}`}
            onClick={() => onViewDetails(order)}
            aria-label={`Detalhes do Pedido ${order.id.substring(0, 6)}`}
            role="listitem"
        >
            {/* Header: Order ID, Timestamp, Status */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                    <h3 className="font-extrabold text-xl text-gray-800">Pedido <span className="text-orange-600">#{order.id.substring(0, 6)}</span></h3>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(order.timestamp).toLocaleString('pt-BR')}</p>
                </div>
                {/* Badge is hidden in Kanban columns since column title says status, but kept for History */}
                {/* We can conditionally hide it via props if needed, but keeping it is fine for quick scanning */}
                <span className={`px-2 py-0.5 text-[10px] font-semibold text-white rounded-full ${color}`}>{text}</span>
            </div>

            {/* Customer and Payment Info */}
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
                <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-1">Cliente</h4>
                    <p className="font-bold text-gray-800 truncate">{order.customerName}</p>
                    {order.customerAddress && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {order.customerAddress.street}, {order.customerAddress.number} - {order.customerAddress.neighborhood}
                            {order.customerAddress.complement && `, ${order.customerAddress.complement}`}
                        </p>
                    )}
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-1">Pagamento</h4>
                    <div className="flex items-center text-sm">
                        <CreditCardIcon className="w-4 h-4 mr-1.5 text-gray-600 flex-shrink-0" aria-hidden="true" />
                        <p className={`font-bold truncate ${order.paymentMethod === 'Marcar na minha conta' ? 'text-red-600' : 'text-gray-800'}`}>
                            {order.paymentMethod}
                            {order.paymentMethod === 'Marcar na minha conta' && <span className="text-xs font-normal ml-1">(Verificar)</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Items List - Collapsible */}
            <div className="pb-3 border-b border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700">Itens ({order.items.reduce((acc, item) => acc + item.quantity, 0)})</h4>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="text-sm text-red-600 font-semibold hover:underline flex items-center space-x-1"
                        aria-expanded={isExpanded}
                        aria-controls={`order-items-${order.id}`}
                    >
                        <span>{isExpanded ? 'Ocultar' : 'Ver'}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                </div>
                {isExpanded && (
                    <ul id={`order-items-${order.id}`} className="text-sm space-y-2 text-gray-700 mt-2" role="list">
                        {order.items.map(item => (
                            <li key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-b-0 last:pb-0" role="listitem">
                                <div>
                                    <span className="font-medium">{item.quantity}x {item.name}</span>
                                    {item.sizeName && <span className="text-xs text-gray-500"> ({item.sizeName})</span>}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                        <ul className="text-xs text-gray-500 pl-3" role="list">
                                            {item.selectedAddons.map(addon => <li key={addon.id} role="listitem">+ {addon.name}</li>)}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Total Price */}
            <div className="flex justify-between items-center font-bold text-lg py-1 text-orange-800" aria-label={`Total do Pedido: R$ ${order.totalPrice.toFixed(2)}`}>
                <span>Total</span>
                <span>R$ {order.totalPrice.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            {order.status !== 'Entregue' && order.status !== 'Cancelado' && (
                <div className="pt-3 border-t border-gray-100">
                    <ActionButtons />
                </div>
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
                addToast({ message: "Status do pedido atualizado!", type: 'success' });
            })
            .catch(err => {
                addToast({ message: `Erro ao atualizar status: ${err.message}`, type: 'error' });
            });
    };

    const handleNotify = (order: Order) => {
        const cleanRestaurantPhone = order.restaurantPhone.replace(/\D/g, '');
        let message = '';
        
        if (order.status === 'Preparando') {
            message = `Olá *${order.customerName.split(' ')[0]}*! Recebemos seu pedido *#${order.id.substring(0, 6)}* no ${order.restaurantName}! 👨‍🍳\n\nJá estamos preparando tudo. O valor total é R$ ${order.totalPrice.toFixed(2)}.\n\nQualquer dúvida, é só responder aqui!`;
        } else if (order.status === 'A Caminho') {
            message = `Olá *${order.customerName.split(' ')[0]}*! \n\n🏍️ Boas notícias: Seu pedido do *${order.restaurantName}* saiu para entrega!\n\nLogo chegará até você. Bom apetite! 😋`;
        } else {
            message = `Olá *${order.customerName.split(' ')[0]}*! Sobre seu pedido *#${order.id.substring(0, 6)}* no ${order.restaurantName}...`;
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

    // Added 'Aguardando Pagamento' to the main view (activeSections)
    const activeSections = [
        { title: 'Aguardando Pagamento', status: 'Aguardando Pagamento' as OrderStatus, bgColor: 'bg-gray-100 border-gray-200' },
        { title: 'Novos Pedidos', status: 'Novo Pedido' as OrderStatus, bgColor: 'bg-blue-50' },
        { title: 'Em Preparo', status: 'Preparando' as OrderStatus, bgColor: 'bg-yellow-50' },
        { title: 'A Caminho', status: 'A Caminho' as OrderStatus, bgColor: 'bg-orange-50' },
    ];
    
    // Removed 'Aguardando Pagamento' from history sections
    const historySections = [
        { title: 'Entregues', status: 'Entregue' as OrderStatus },
        { title: 'Cancelados', status: 'Cancelado' as OrderStatus },
    ];

    // Helper for History View
    const RenderHistoryList = ({ groupedOrders }: { groupedOrders: any }) => (
        <>
            {historySections.map(section => (
                (groupedOrders[section.status] && groupedOrders[section.status]!.length > 0) ? (
                    <div key={section.status} role="region" aria-labelledby={`section-title-${section.status}`}>
                        <h2 id={`section-title-${section.status}`} className="text-xl font-bold mb-4">{section.title} ({groupedOrders[section.status]!.length})</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
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
            <div className="p-4 border-b">
                <div className="relative">
                     <input
                        type="text"
                        placeholder="Buscar por cliente ou ID do pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border rounded-full bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                        aria-label="Buscar pedidos"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                </div>
            </div>
            <div className="p-4 border-b">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1" role="tablist">
                    <button 
                        onClick={() => setViewMode('active')} 
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${viewMode === 'active' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        role="tab"
                        aria-selected={viewMode === 'active'}
                        id="tab-active-orders"
                        aria-controls="panel-active-orders"
                    >
                        Pedidos Ativos (Kanban)
                    </button>
                    <button 
                        onClick={() => setViewMode('history')} 
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${viewMode === 'history' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        role="tab"
                        aria-selected={viewMode === 'history'}
                        id="tab-history-orders"
                        aria-controls="panel-history-orders"
                    >
                        Histórico
                    </button>
                </div>
            </div>
            <main className="p-4 space-y-8 bg-gray-50 min-h-[calc(100vh-200px)]">
                {viewMode === 'active' && (
                    <div id="panel-active-orders" role="tabpanel" aria-labelledby="tab-active-orders" className="h-full">
                        {/* KANBAN LAYOUT - Always visible for active tab */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start h-full">
                            {activeSections.map(section => {
                                const ordersInSection = groupedActiveOrders[section.status] || [];
                                return (
                                    <div key={section.status} className={`p-4 rounded-xl h-full min-h-[300px] flex flex-col shadow-inner ${section.bgColor}`}>
                                        {/* Header */}
                                        <h2 className="text-lg font-bold mb-4 flex justify-between items-center text-gray-700 border-b border-gray-200 pb-2">
                                            {section.title}
                                            <span className="bg-white text-gray-600 px-3 py-1 rounded-full text-xs shadow-sm font-extrabold">
                                                {ordersInSection.length}
                                            </span>
                                        </h2>
                                        
                                        {/* Cards Container */}
                                        <div className="space-y-4 flex-grow">
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
                                                <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                                                    <p className="text-gray-400 text-sm italic">Sem pedidos</p>
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
                    <div id="panel-history-orders" role="tabpanel" aria-labelledby="tab-history-orders">
                        {historyOrders.length > 0 ? (
                            <RenderHistoryList groupedOrders={groupedHistoryOrders} />
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold text-lg">{searchTerm ? "Nenhum registro corresponde à busca." : "O histórico de pedidos está vazio."}</p>
                                <p>{searchTerm ? "Tente refinar seus termos de busca." : "Pedidos entregues ou cancelados aparecerão aqui."}</p>
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
