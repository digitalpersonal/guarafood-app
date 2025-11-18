
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
                        <button onClick={(e) => { e.stopPropagation(); onNotify(order); }} className="bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 text-sm">Notificar</button>
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
            className={`bg-white rounded-lg shadow-md p-4 flex flex-col space-y-4 cursor-pointer hover:shadow-lg transition-shadow duration-200 
            ${isNew ? 'new-order-pulse border-2 border-blue-400' : 'border border-gray-100'}`}
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
                <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${color}`}>{text}</span>
            </div>

            {/* Customer and Payment Info */}
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
                <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-1">Cliente</h4>
                    <p className="font-bold text-gray-800">{order.customerName}</p>
                    {order.customerAddress && (
                        <p className="text-sm text-gray-600">
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
                            {order.paymentMethod === 'Marcar na minha conta' && <span className="text-xs font-normal ml-1">(Verificar cadastro)</span>}
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
                        <span>{isExpanded ? 'Ocultar' : 'Ver Detalhes'}</span>
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
                                <span className="font-semibold whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Total Price */}
            <div className="flex justify-between items-center font-bold text-xl py-2 bg-orange-50 rounded-md px-3 text-orange-800" aria-label={`Total do Pedido: R$ ${order.totalPrice.toFixed(2)}`}>
                <span>Total</span>
                <span>R$ {order.totalPrice.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            {order.status !== 'Entregue' && order.status !== 'Cancelado' && order.status !== 'Aguardando Pagamento' && (
                <div className="pt-3 border-t border-gray-100">
                    <ActionButtons />
                </div>
            )}
        </div>
    );
};

interface OrdersViewProps {
    orders: Order[];
}

const OrdersView: React.FC<OrdersViewProps> = ({ orders }) => {
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
        const restaurantWhatsAppLink = `https://wa.me/55${cleanRestaurantPhone}`;
        let message = '';
        
        if (order.status === 'Preparando') {
            message = `Olá ${order.customerName}! Seu pedido no restaurante *${order.restaurantName}* foi confirmado e já estamos preparando tudo com muito carinho. O total é de R$ ${order.totalPrice.toFixed(2)}. Se precisar falar conosco, nosso WhatsApp é: ${restaurantWhatsAppLink}`;
        } else if (order.status === 'A Caminho') {
            message = `Olá ${order.customerName}! Boas notícias! Seu pedido do restaurante *${order.restaurantName}* já saiu para entrega e logo chegará até você!`;
        } else {
            return; // Don't send for other statuses
        }

        const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
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
        const active = filteredOrders.filter(o => ['Novo Pedido', 'Preparando', 'A Caminho'].includes(o.status));
        const history = filteredOrders.filter(o => ['Entregue', 'Cancelado', 'Aguardando Pagamento'].includes(o.status));
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

    const activeSections = [
        { title: 'Novos Pedidos', status: 'Novo Pedido' as OrderStatus },
        { title: 'Em Preparo', status: 'Preparando' as OrderStatus },
        { title: 'A Caminho', status: 'A Caminho' as OrderStatus },
    ];
    const historySections = [
        { title: 'Aguardando Pagamento', status: 'Aguardando Pagamento' as OrderStatus },
        { title: 'Entregues', status: 'Entregue' as OrderStatus },
        { title: 'Cancelados', status: 'Cancelado' as OrderStatus },
    ];

    const RenderOrderList = ({ groupedOrders, sections }: { groupedOrders: any, sections: any[] }) => (
        <>
            {sections.map(section => (
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
                        Pedidos Ativos
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
            <main className="p-4 space-y-8">
                {viewMode === 'active' && (
                    <div id="panel-active-orders" role="tabpanel" aria-labelledby="tab-active-orders">
                        {activeOrders.length > 0 ? (
                            <RenderOrderList groupedOrders={groupedActiveOrders} sections={activeSections} />
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold text-lg">{searchTerm ? "Nenhum pedido ativo corresponde à busca." : "Aguardando novos pedidos..."}</p>
                                <p>{searchTerm ? "Tente buscar no histórico." : "Novos pedidos aparecerão aqui em tempo real."}</p>
                            </div>
                        )}
                    </div>
                )}
                {viewMode === 'history' && (
                    <div id="panel-history-orders" role="tabpanel" aria-labelledby="tab-history-orders">
                        {historyOrders.length > 0 ? (
                            <RenderOrderList groupedOrders={groupedHistoryOrders} sections={historySections} />
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-semibold text-lg">{searchTerm ? "Nenhum registro corresponde à busca." : "O histórico de pedidos está vazio."}</p>
                                <p>{searchTerm ? "Tente refinar seus termos de busca." : "Pedidos entregues ou cancelados aparecerão aqui."}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
            {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </>
    );
};

export default OrdersView;
