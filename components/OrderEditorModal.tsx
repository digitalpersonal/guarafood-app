
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, CartItem, MenuItem, Combo, Addon } from '../types';
import { useNotification } from '../hooks/useNotification';
import { updateOrderDetails } from '../services/orderService';
import { fetchMenuForRestaurant, fetchAddonsForRestaurant } from '../services/databaseService';
import Spinner from './Spinner';
import OptimizedImage from './OptimizedImage';
import AddItemToOrderModal from './AddItemToOrderModal';
import PizzaCustomizationModal from './PizzaCustomizationModal';
import AcaiCustomizationModal from './AcaiCustomizationModal';
import GenericCustomizationModal from './GenericCustomizationModal';

interface OrderEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    onSave: (updatedOrder: Order) => void;
    restaurantId: number;
    restaurantName: string;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const OrderEditorModal: React.FC<OrderEditorModalProps> = ({ isOpen, onClose, order, onSave, restaurantId, restaurantName }) => {
    const { addToast } = useNotification();
    const [editedItems, setEditedItems] = useState<CartItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // States for adding new items
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [allRestaurantMenuItems, setAllRestaurantMenuItems] = useState<MenuItem[]>([]);
    const [allRestaurantCombos, setAllRestaurantCombos] = useState<Combo[]>([]);
    const [allRestaurantAddons, setAllRestaurantAddons] = useState<Addon[]>([]);

    // States for item customization modals
    const [isPizzaModalOpen, setIsPizzaModalOpen] = useState(false);
    const [isAcaiModalOpen, setIsAcaiModalOpen] = useState(false);
    const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
    const [itemToCustomize, setItemToCustomize] = useState<MenuItem | null>(null);

    useEffect(() => {
        if (isOpen) {
            setEditedItems(order.items.map(item => ({ ...item }))); // Deep copy
            setError(null);
            setIsSaving(false);
        }
    }, [order, isOpen]);

    // Load full menu and addons for the restaurant
    useEffect(() => {
        if (!restaurantId || !isOpen) return;

        const loadRestaurantData = async () => {
            try {
                // Pass true to ignore day filter, so admin can add ANY item to the order manually
                const [menuData, addonsData] = await Promise.all([
                    fetchMenuForRestaurant(restaurantId, true), 
                    fetchAddonsForRestaurant(restaurantId),
                ]);
                setAllRestaurantMenuItems(menuData.flatMap(c => c.items));
                setAllRestaurantCombos(menuData.flatMap(c => c.combos || []));
                setAllRestaurantAddons(addonsData);
            } catch (err) {
                console.error("Failed to load restaurant menu/addons:", err);
                addToast({ message: "Erro ao carregar cardápio do restaurante para edição.", type: "error" });
            }
        };
        loadRestaurantData();
    }, [restaurantId, isOpen, addToast]);

    const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
        setEditedItems(prevItems => {
            const updated = prevItems.map(item =>
                item.id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item
            );
            return updated.filter(item => item.quantity > 0);
        });
    }, []);

    const handleRemoveItem = useCallback((itemId: string) => {
        setEditedItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }, []);

    const handleAddItemToOrder = useCallback((newItem: CartItem) => {
        setEditedItems(prevItems => {
            // Check if it's the exact same custom item (same ID)
            const existingItemIndex = prevItems.findIndex(item => item.id === newItem.id);

            if (existingItemIndex > -1) {
                // If it exists, just increment quantity
                return prevItems.map((item, index) =>
                    index === existingItemIndex ? { ...item, quantity: item.quantity + newItem.quantity } : item
                );
            } else {
                // Otherwise, add as a new item
                return [...prevItems, { ...newItem }];
            }
        });
        addToast({ message: `${newItem.name} adicionado!`, type: "success" });
        setIsAddItemModalOpen(false); // Close item selection modal
        setIsPizzaModalOpen(false); // Close customization modals
        setIsAcaiModalOpen(false);
        setIsGenericModalOpen(false);
        setItemToCustomize(null);
    }, [addToast]);

    const { subtotal, totalItems } = useMemo(() => {
        const currentSubtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentTotalItems = editedItems.reduce((sum, item) => sum + item.quantity, 0);
        return { subtotal: currentSubtotal, totalItems: currentTotalItems };
    }, [editedItems]);

    const deliveryFee = order.deliveryFee || 0;
    const discountAmount = order.discountAmount || 0;

    const finalTotalPrice = useMemo(() => {
        return Math.max(0, (subtotal - discountAmount) + deliveryFee);
    }, [subtotal, discountAmount, deliveryFee]);

    const handleSave = async () => {
        setError(null);
        if (editedItems.length === 0) {
            setError('O pedido não pode ficar sem itens. Se desejar cancelar, use a opção de cancelar pedido.');
            return;
        }

        setIsSaving(true);
        try {
            const updatedOrder = await updateOrderDetails(order.id, {
                items: editedItems,
                subtotal: subtotal,
                totalPrice: finalTotalPrice,
                discountAmount: discountAmount,
                paymentMethod: order.paymentMethod,
            });
            addToast({ message: 'Pedido atualizado com sucesso!', type: 'success' });
            onSave(updatedOrder);
            onClose();
        } catch (err: any) {
            console.error("Failed to update order:", err);
            setError(`Erro ao salvar alterações: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectMenuItemForCustomization = useCallback((item: MenuItem) => {
        setItemToCustomize(item);
        if (item.isPizza) {
            setIsPizzaModalOpen(true);
        } else if (item.isAcai) {
            setIsAcaiModalOpen(true);
        } else if (item.availableAddonIds && item.availableAddonIds.length > 0) {
            setIsGenericModalOpen(true);
        } else if (item.sizes && item.sizes.length > 0) {
            setIsGenericModalOpen(true);
        } else {
            // Simple item, add directly
            const simpleCartItem: CartItem = {
                id: `item-${item.id}-${Date.now()}`, // Generate a unique ID to allow multiple additions
                name: item.name,
                price: item.price,
                basePrice: item.price,
                imageUrl: item.imageUrl,
                quantity: 1,
                description: item.description,
            };
            handleAddItemToOrder(simpleCartItem);
        }
    }, [handleAddItemToOrder]);
    
    const handleAddComboToOrder = useCallback((combo: Combo) => {
        const comboCartItem: CartItem = {
            id: `combo-${combo.id}-${Date.now()}`, // Unique ID
            name: combo.name,
            price: combo.price,
            basePrice: combo.price,
            imageUrl: combo.imageUrl,
            quantity: 1,
            description: combo.description,
        };
        handleAddItemToOrder(comboCartItem);
    }, [handleAddItemToOrder]);


    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="order-editor-modal-title">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 id="order-editor-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">Editar Pedido #{order.id.substring(0, 6)}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                        <p className="text-sm text-gray-600 mb-4">Ajuste a quantidade, remova ou adicione itens a este pedido.</p>

                        {editedItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum item no pedido. Clique em "Adicionar Novo Item".
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {editedItems.map(item => (
                                    <div key={item.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <OptimizedImage src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-800">
                                                {item.name} {item.sizeName && `(${item.sizeName})`}
                                            </p>
                                            
                                            {/* SHOW CUSTOM OPTIONS */}
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <ul className="text-xs text-blue-600 bg-blue-50 p-1 rounded mt-1">
                                                    {item.selectedOptions.map((opt, idx) => (
                                                        <li key={idx}>• {opt.groupTitle}: {opt.optionName} {opt.price > 0 && `(+ R$ ${opt.price.toFixed(2)})`}</li>
                                                    ))}
                                                </ul>
                                            )}

                                            {item.halves && item.halves.length > 1 && (
                                                <p className="text-xs text-gray-500 pl-1">
                                                    (Meia {item.halves.map(h => h.name).join(' / Meia ')})
                                                </p>
                                            )}
                                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                <ul className="text-xs text-gray-500 pl-1 mt-1">
                                                    {item.selectedAddons.map(addon => (
                                                        <li key={addon.id}>
                                                            + {addon.name} {addon.price > 0 && `(R$ ${addon.price.toFixed(2)})`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <p className="text-sm text-orange-600 font-bold mt-1">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                                                <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600 hover:bg-white rounded">-</button>
                                                <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                                <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600 hover:bg-white rounded">+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setIsAddItemModalOpen(true)}
                            className="w-full py-3 mt-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Adicionar Novo Item
                        </button>

                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-gray-600 text-sm">
                                <span>Subtotal (Itens)</span>
                                <span>R$ {subtotal.toFixed(2)}</span>
                            </div>
                            {order.deliveryFee != null && (
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Taxa de Entrega</span>
                                    <span>R$ {order.deliveryFee.toFixed(2)}</span>
                                </div>
                            )}
                            {order.discountAmount && order.discountAmount > 0 && (
                                <div className="flex justify-between text-green-600 text-sm">
                                    <span>Desconto</span>
                                    <span>- R$ {order.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center font-bold text-lg text-gray-900 border-t pt-2 mt-1">
                                <span>Total Atualizado</span>
                                <span>R$ {finalTotalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

                    <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-blue-400" disabled={isSaving}>
                            {isSaving ? <Spinner message="Salvando..." /> : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>

            {isAddItemModalOpen && (
                <AddItemToOrderModal
                    isOpen={isAddItemModalOpen}
                    onClose={() => setIsAddItemModalOpen(false)}
                    restaurantName={restaurantName}
                    allMenuItems={allRestaurantMenuItems}
                    allCombos={allRestaurantCombos}
                    onSelectMenuItem={handleSelectMenuItemForCustomization}
                    onSelectCombo={handleAddComboToOrder}
                />
            )}

            {isPizzaModalOpen && itemToCustomize && (
                <PizzaCustomizationModal
                    isOpen={isPizzaModalOpen}
                    onClose={() => setIsPizzaModalOpen(false)}
                    onAddToCart={handleAddItemToOrder}
                    initialPizza={itemToCustomize}
                    allPizzas={allRestaurantMenuItems.filter(i => i.isPizza)}
                    allAddons={allRestaurantAddons}
                />
            )}
            {isAcaiModalOpen && itemToCustomize && (
                <AcaiCustomizationModal
                    isOpen={isAcaiModalOpen}
                    onClose={() => setIsAcaiModalOpen(false)}
                    onAddToCart={handleAddItemToOrder}
                    initialItem={itemToCustomize}
                    allAddons={allRestaurantAddons}
                />
            )}
            {isGenericModalOpen && itemToCustomize && (
                <GenericCustomizationModal
                    isOpen={isGenericModalOpen}
                    onClose={() => setIsGenericModalOpen(false)}
                    onAddToCart={handleAddItemToOrder}
                    initialItem={itemToCustomize}
                    allAddons={allRestaurantAddons}
                />
            )}
        </>
    );
};

export default OrderEditorModal;
