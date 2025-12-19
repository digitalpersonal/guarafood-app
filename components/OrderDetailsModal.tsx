
import React, { useEffect, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../types';
import PrintableOrder from './PrintableOrder';
import OrderEditorModal from './OrderEditorModal'; // Import the new modal

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const PrintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 0 0-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
);
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
);
const LeafIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
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

interface OrderDetailsModalProps { 
    order: Order; 
    onClose: () => void; 
    printerWidth?: number; // Keep printerWidth for printable order
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, printerWidth = 80 }) => {
    const { text, color } = statusConfig[order.status];
    const [isEditing, setIsEditing] = useState(false); // State to control editing modal
    const [currentOrder, setCurrentOrder] = useState<Order>(order); // Use internal state for order

    useEffect(() => {
        setCurrentOrder(order); // Update internal state if parent order changes
    }, [order]);
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const handlePrint = () => {
        window.print();
    };

    const handleOrderUpdated = (updatedOrder: Order) => {
        setCurrentOrder(updatedOrder); // Update local state when editing modal saves
        setIsEditing(false); // Close editing modal
    };

    const canEditOrder = ['Novo Pedido', 'Preparando'].includes(currentOrder.status);

    const displayOrderNum = currentOrder.order_number 
        ? `#${String(currentOrder.order_number).padStart(3, '0')}`
        : `#${currentOrder.id.substring(currentOrder.id.length - 4).toUpperCase()}`;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 backdrop-blur-sm transition-opacity duration-200"
                onClick={onClose}
                aria-modal="true"
                role="dialog"
            >
                <div
                    className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-transform duration-200 scale-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Pedido</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 p-2 -mt-2 -mr-2 transition-colors active:scale-90">
                            <XIcon className="w-7 h-7" />
                        </button>
                    </div>

                    <div className="overflow-y-auto space-y-6 pr-2 -mr-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="font-black text-2xl text-orange-600">Pedido {displayOrderNum}</p>
                                <p className="text-sm text-gray-500">{new Date(currentOrder.timestamp).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className={`px-4 py-1.5 text-sm font-semibold text-white rounded-full ${color} self-start sm:self-auto shadow-sm`}>{text}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Cliente</h3>
                                <p className="font-semibold text-gray-900">{currentOrder.customerName}</p>
                                <p className="text-sm text-gray-600">Telefone: {currentOrder.customerPhone}</p>
                                 {currentOrder.customerAddress && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        <strong>Endereço:</strong> {currentOrder.customerAddress.street}, {currentOrder.customerAddress.number} - {currentOrder.customerAddress.neighborhood}
                                        {currentOrder.customerAddress.complement && `, ${currentOrder.customerAddress.complement}`}
                                        <br/>
                                        CEP: {currentOrder.customerAddress.zipCode}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600">Pagamento: <span className="font-medium text-gray-900">{currentOrder.paymentMethod}</span></p>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Restaurante</h3>
                                <p className="font-semibold text-gray-900">{currentOrder.restaurantName}</p>
                                <p className="text-sm text-gray-600">{currentOrder.restaurantAddress}</p>
                                <p className="text-sm text-gray-600">Telefone: {currentOrder.restaurantPhone}</p>
                            </div>
                        </div>
                        
                        {/* CONDIMENTS PREFERENCE HIGHLIGHT */}
                        <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all shadow-sm ${currentOrder.wantsSachets ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                            <div className={`p-3 rounded-full ${currentOrder.wantsSachets ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                                <LeafIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-black text-gray-800 uppercase tracking-wide">
                                    {currentOrder.wantsSachets ? '🌿 Enviar Sachês e Talheres' : '🚫 Não enviar sachês/talheres'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-700 border-b pb-1 mb-3">Itens do Pedido</h3>
                            <ul className="space-y-3 text-gray-800">
                                {currentOrder.items.map(item => (
                                    <li key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`}</p>
                                            
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <ul className="text-xs text-blue-600 mt-1 pl-2 border-l-2 border-blue-200 space-y-0.5">
                                                    {item.selectedOptions.map((opt, idx) => (
                                                        <li key={idx} className="font-medium">
                                                            • {opt.groupTitle}: {opt.optionName}
                                                            {opt.price > 0 && ` (+ R$ ${Number(opt.price).toFixed(2)})`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {item.halves && item.halves.length > 1 && (
                                                <p className="text-xs text-gray-500 pl-2">½ {item.halves[0].name} | ½ {item.halves[1].name}</p>
                                            )}

                                            {item.selectedAddons && item.selectedAddonIds && (
                                                <ul className="text-xs text-gray-500 pl-2 mt-1">
                                                    {item.selectedAddons.map(addon => (
                                                        <li key={addon.id}>+ {addon.name} {addon.price > 0 && `(+ R$ ${Number(addon.price).toFixed(2)})`}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            
                                            {item.notes && <p className="text-xs text-orange-600 font-bold mt-1">Nota: {item.notes}</p>}
                                        </div>
                                        <p className="font-semibold ml-4 whitespace-nowrap">R$ {(Number(item.price) * item.quantity).toFixed(2)}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                            {currentOrder.subtotal && (
                              <div className="flex justify-between text-gray-600 text-sm">
                                <span>Subtotal</span>
                                <span>R$ {Number(currentOrder.subtotal).toFixed(2)}</span>
                              </div>
                            )}
                            {currentOrder.discountAmount && Number(currentOrder.discountAmount) > 0 && (
                              <div className="flex justify-between text-green-600 text-sm font-semibold">
                                <span>Desconto ({currentOrder.couponCode})</span>
                                <span>- R$ {Number(currentOrder.discountAmount).toFixed(2)}</span>
                              </div>
                            )}
                            {currentOrder.deliveryFee != null && (
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Taxa de Entrega</span>
                                    <span>R$ {Number(currentOrder.deliveryFee).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center font-bold text-lg sm:text-xl text-gray-900 border-t pt-2 mt-1">
                                <span>Total</span>
                                <span>R$ {Number(currentOrder.totalPrice).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t flex justify-between items-center bg-white sticky bottom-0">
                        <div className="flex space-x-2">
                            {canEditOrder && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-md"
                                >
                                    <EditIcon className="w-5 h-5"/>
                                    <span className="hidden sm:inline">Editar</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 transition-all active:scale-95 shadow-md"
                            >
                                <PrintIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">Imprimir</span>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
            <div className="hidden print:block">
                <div id="printable-order">
                    <PrintableOrder order={currentOrder} printerWidth={printerWidth} /> 
                </div>
            </div>

            {isEditing && (
                <OrderEditorModal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    order={currentOrder}
                    onSave={handleOrderUpdated}
                    restaurantId={currentOrder.restaurantId}
                    restaurantName={currentOrder.restaurantName}
                />
            )}
        </>
    );
};

export default OrderDetailsModal;
