
import React, { useEffect, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../types.ts';
import PrintableOrder from './PrintableOrder.tsx';
import OrderEditorModal from './OrderEditorModal.tsx'; // Import the new modal

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const PrintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 00-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 001.5 0Z" />
    </svg>
);
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
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
    const printableRef = useRef<HTMLDivElement>(null);
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
        // No need to call onClose here, as user might want to see updated details
    };

    // Check if the order can be edited
    const canEditOrder = ['Novo Pedido', 'Preparando'].includes(currentOrder.status);

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
                onClick={onClose}
                aria-modal="true"
                role="dialog"
            >
                <div
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Pedido</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="overflow-y-auto space-y-6 pr-2 -mr-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="font-bold text-lg text-gray-900">Pedido #{currentOrder.id.substring(0, 6)}</p>
                                <p className="text-sm text-gray-500">{new Date(currentOrder.timestamp).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className={`px-4 py-1.5 text-sm font-semibold text-white rounded-full ${color} self-start sm:self-auto`}>{text}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Cliente</h3>
                                <p className="font-semibold">{currentOrder.customerName}</p>
                                <p className="text-sm text-gray-600">Telefone: {currentOrder.customerPhone}</p>
                                 {currentOrder.customerAddress && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        <strong>Endereço:</strong> {currentOrder.customerAddress.street}, {currentOrder.customerAddress.number} - {currentOrder.customerAddress.neighborhood}
                                        {currentOrder.customerAddress.complement && `, ${currentOrder.customerAddress.complement}`}
                                        <br/>
                                        CEP: {currentOrder.customerAddress.zipCode}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600">Pagamento: <span className="font-medium">{currentOrder.paymentMethod}</span></p>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Restaurante</h3>
                                <p className="font-semibold">{currentOrder.restaurantName}</p>
                                <p className="text-sm text-gray-600">{currentOrder.restaurantAddress}</p>
                                <p className="text-sm text-gray-600">Telefone: {currentOrder.restaurantPhone}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-700 border-b pb-1 mb-3">Itens do Pedido</h3>
                            <ul className="space-y-3 text-gray-800">
                                {currentOrder.items.map(item => (
                                    <li key={item.id} className="flex justify-between items-start">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{item.quantity}x {item.name}</p>
                                            <p className="text-xs text-gray-500 italic">{item.description}</p>
                                        </div>
                                        <p className="font-semibold ml-4 whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                            {currentOrder.subtotal && (
                              <div className="flex justify-between text-gray-600 text-sm">
                                <span>Subtotal</span>
                                <span>R$ {currentOrder.subtotal.toFixed(2)}</span>
                              </div>
                            )}
                            {currentOrder.discountAmount && currentOrder.discountAmount > 0 && (
                              <div className="flex justify-between text-green-600 text-sm font-semibold">
                                <span>Desconto ({currentOrder.couponCode})</span>
                                <span>- R$ {currentOrder.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {currentOrder.deliveryFee != null && (
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Taxa de Entrega</span>
                                    <span>R$ {currentOrder.deliveryFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center font-bold text-lg sm:text-xl text-gray-900 border-t pt-2 mt-1">
                                <span>Total</span>
                                <span>R$ {currentOrder.totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t flex justify-between items-center">
                        <div className="flex space-x-2">
                            {canEditOrder && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                                >
                                    <EditIcon className="w-5 h-5"/>
                                    <span>Editar Pedido</span>
                                </button>
                            )}
                            <button
                                onClick={handlePrint}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 transition-colors"
                            >
                                <PrintIcon className="w-5 h-5"/>
                                <span>Imprimir</span>
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
             {/* Hidden component for printing */}
            <div className="hidden">
                <div id="printable-order">
                    {/* Ensure currentOrder is passed to PrintableOrder */}
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
