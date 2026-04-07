
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, CartItem, MenuItem, Combo, Addon } from '../types';
import { useNotification } from '../hooks/useNotification';
import { updateOrderDetails } from '../services/orderService';
import { verifyMensalistaByPhone } from '../services/mensalistaService';
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
    hasServiceCharge?: boolean;
    playNotification?: () => void;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const OrderEditorModal: React.FC<OrderEditorModalProps> = ({ isOpen, onClose, order, onSave, restaurantId, restaurantName, hasServiceCharge, playNotification }) => {
    const { addToast } = useNotification();
    const [editedItems, setEditedItems] = useState<CartItem[]>([]);
    const [editedPaymentMethod, setEditedPaymentMethod] = useState(order.paymentMethod);
    const [editedCustomerName, setEditedCustomerName] = useState(order.customerName);
    const [editedCustomerPhone, setEditedCustomerPhone] = useState(order.customerPhone);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
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
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [initialCartItemForEdit, setInitialCartItemForEdit] = useState<CartItem | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            setEditedItems(order.items.map(item => ({ ...item }))); // Deep copy
            setEditedPaymentMethod(order.paymentMethod);
            setEditedCustomerName(order.customerName);
            setEditedCustomerPhone(order.customerPhone);
            setError(null);
            setIsSaving(false);
        }
    }, [order, isOpen]);

    // Load full menu and addons for the restaurant
    useEffect(() => {
        if (!restaurantId || !isOpen) return;

        const loadRestaurantData = async () => {
            setIsLoadingMenu(true);
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
            } finally {
                setIsLoadingMenu(false);
            }
        };
        loadRestaurantData();
    }, [restaurantId, isOpen, addToast]);

    const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
        setEditedItems(prevItems => {
            const itemToUpdate = prevItems.find(i => i.id === itemId);
            if (!itemToUpdate) return prevItems;

            // If increasing quantity of an already printed item, split it to track the new items
            if (itemToUpdate.kitchenPrinted && newQuantity > itemToUpdate.quantity) {
                const diff = newQuantity - itemToUpdate.quantity;
                const newItem = { 
                    ...itemToUpdate, 
                    id: `${itemToUpdate.id.split('-')[0]}-${Date.now()}`, 
                    quantity: diff, 
                    kitchenPrinted: false 
                };
                return [...prevItems, newItem];
            }

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
        // Safety check: Ensure item belongs to the same restaurant as the order
        if (Number(newItem.restaurantId) !== Number(order.restaurantId)) {
            addToast({ message: "Erro: Este item pertence a outro restaurante.", type: "error" });
            return;
        }

        setEditedItems(prevItems => {
            if (editingItemIndex !== null) {
                // Replacement mode (editing existing item)
                const updated = [...prevItems];
                updated[editingItemIndex] = { ...newItem, quantity: prevItems[editingItemIndex].quantity };
                return updated;
            }

            // Check if it's the exact same custom item (same ID) AND it hasn't been printed yet
            // We check if the item ID matches exactly or starts with the ID followed by a timestamp
            const existingItemIndex = prevItems.findIndex(item => 
                (item.id === newItem.id || item.id.startsWith(`${newItem.id}-`)) && 
                !item.kitchenPrinted
            );

            if (existingItemIndex > -1) {
                // If it exists and not printed, just increment quantity
                const updated = [...prevItems];
                updated[existingItemIndex] = { 
                    ...updated[existingItemIndex], 
                    quantity: updated[existingItemIndex].quantity + newItem.quantity 
                };
                return updated;
            } else {
                // Otherwise, add as a new item (even if another item with same ID exists but was already printed)
                // We need a unique ID for the new entry to avoid React key conflicts and merging issues
                const uniqueNewItem = { ...newItem, id: `${newItem.id}-${Date.now()}`, kitchenPrinted: false };
                return [...prevItems, uniqueNewItem];
            }
        });
        addToast({ message: editingItemIndex !== null ? `${newItem.name} atualizado!` : `${newItem.name} adicionado!`, type: "success" });
        setIsAddItemModalOpen(false); // Close item selection modal
        setIsPizzaModalOpen(false); // Close customization modals
        setIsAcaiModalOpen(false);
        setIsGenericModalOpen(false);
        setItemToCustomize(null);
        setEditingItemIndex(null);
        setInitialCartItemForEdit(undefined);
    }, [addToast, editingItemIndex, order.restaurantId]);

    const { subtotal, totalItems } = useMemo(() => {
        const currentSubtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentTotalItems = editedItems.reduce((sum, item) => sum + item.quantity, 0);
        return { subtotal: currentSubtotal, totalItems: currentTotalItems };
    }, [editedItems]);

    const deliveryFee = order.deliveryFee || 0;
    const discountAmount = order.discountAmount || 0;

    const finalTotalPrice = useMemo(() => {
        const baseTotal = (subtotal - discountAmount) + deliveryFee;
        const serviceCharge = (order.tableNumber && hasServiceCharge) ? (subtotal * 0.1) : 0;
        return Math.max(0, baseTotal + serviceCharge);
    }, [subtotal, discountAmount, deliveryFee, order.tableNumber, hasServiceCharge]);

    const handleSave = async () => {
        setError(null);
        if (editedItems.length === 0) {
            setError('O pedido não pode ficar sem itens. Se desejar cancelar, use a opção de cancelar pedido.');
            return;
        }

        // Final validation: Ensure all items belong to the correct restaurant
        const invalidItems = editedItems.filter(item => Number(item.restaurantId) !== Number(order.restaurantId));
        if (invalidItems.length > 0) {
            setError(`Erro: Foram encontrados ${invalidItems.length} itens de outro restaurante. Remova-os antes de salvar.`);
            return;
        }

        setIsSaving(true);
        try {
            let mensalistaIdToUpdate: string | null | undefined = undefined;
            let finalPaymentMethod = editedPaymentMethod;

            if (editedPaymentMethod === 'Mensalista') {
                if (!editedCustomerPhone.trim()) {
                    setError('O WhatsApp é obrigatório para pedidos de Mensalista.');
                    setIsSaving(false);
                    return;
                }
                const mensalista = await verifyMensalistaByPhone(restaurantId, editedCustomerPhone.replace(/\D/g, ''));
                if (mensalista) {
                    mensalistaIdToUpdate = mensalista.id;
                    finalPaymentMethod = `Mensalista (${mensalista.name})`;
                } else {
                    setError('Mensalista não encontrado com este WhatsApp.');
                    setIsSaving(false);
                    return;
                }
            } else if (order.mensalistaId) {
                // Se era mensalista e mudou para outra forma, removemos o ID do mensalista
                mensalistaIdToUpdate = null;
            }

            const serviceCharge = (order.tableNumber && hasServiceCharge) ? (subtotal * 0.1) : 0;

            const updatedOrder = await updateOrderDetails(order.id, {
                items: editedItems,
                subtotal: subtotal,
                totalPrice: finalTotalPrice,
                discountAmount: discountAmount,
                paymentMethod: finalPaymentMethod,
                customerName: editedCustomerName,
                customerPhone: editedCustomerPhone,
                mensalistaId: mensalistaIdToUpdate,
                waiterName: restaurantName,
                serviceCharge: serviceCharge,
            });
            
            // Play notification if it's a table order
            if (order.tableNumber && playNotification) {
                playNotification();
            }

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

    const handleSelectMenuItemForCustomization = useCallback((item: MenuItem, indexForEdit: number | null = null) => {
        const hasSizes = item.sizes && item.sizes.length > 0;
        const hasAddons = item.availableAddonIds && item.availableAddonIds.length > 0;

        console.log("Customizing item:", item.name, { hasSizes, hasAddons, isPizza: item.isPizza, isAcai: item.isAcai, indexForEdit });

        const isEditing = indexForEdit !== null;

        if (!hasSizes && !hasAddons && !item.isPizza && !item.isAcai && !isEditing) {
            // Se não tem customização e NÃO estamos editando, adiciona direto
            setEditedItems(prev => {
                const cartItem: CartItem = {
                    id: indexForEdit !== null ? prev[indexForEdit].id : `item-${Date.now()}`,
                    restaurantId: restaurantId,
                    name: item.name,
                    price: item.price,
                    basePrice: item.price,
                    imageUrl: item.imageUrl,
                    description: item.description,
                    quantity: indexForEdit !== null ? prev[indexForEdit].quantity : 1,
                    available: true,
                    menuItemId: item.id,
                    selectedAddons: [],
                    notes: indexForEdit !== null ? prev[indexForEdit].notes : '',
                    kitchenPrinted: indexForEdit !== null ? prev[indexForEdit].kitchenPrinted : false
                };

                const newItems = [...prev];
                if (indexForEdit !== null) {
                    newItems[indexForEdit] = cartItem;
                } else {
                    newItems.push(cartItem);
                }
                return newItems;
            });
            setIsAddItemModalOpen(false);
            setEditingItemIndex(null);
            setInitialCartItemForEdit(undefined);
            return;
        }

        setItemToCustomize(item);
        setIsAddItemModalOpen(false); // Fecha o modal de seleção antes de abrir o de customização
        if (item.isPizza) {
            setIsPizzaModalOpen(true);
        } else if (item.isAcai) {
            setIsAcaiModalOpen(true);
        } else {
            setIsGenericModalOpen(true);
        }
    }, []);

    const handleEditItem = useCallback((index: number) => {
        const item = editedItems[index];
        const menuItemId = item.menuItemId;
        
        console.log("Editing item at index:", index, item);

        if (!menuItemId) {
            addToast({ message: "Este item não pode ser editado.", type: "warning" });
            return;
        }

        const menuItem = allRestaurantMenuItems.find(m => m.id === menuItemId);
        if (!menuItem) {
            addToast({ message: "Item original não encontrado no cardápio.", type: "error" });
            return;
        }

        setEditingItemIndex(index);
        setInitialCartItemForEdit(item);
        handleSelectMenuItemForCustomization(menuItem, index);
    }, [editedItems, allRestaurantMenuItems, handleSelectMenuItemForCustomization, addToast]);
    
    const handleAddComboToOrder = useCallback((combo: Combo) => {
        const comboCartItem: CartItem = {
            id: `combo-${combo.id}-${Date.now()}`, // Unique ID
            restaurantId: restaurantId,
            name: combo.name,
            price: combo.price,
            basePrice: combo.price,
            imageUrl: combo.imageUrl,
            quantity: 1,
            description: combo.description,
            menuItemId: undefined, // Combos don't have a single menu item ID
        };
        handleAddItemToOrder(comboCartItem);
    }, [handleAddItemToOrder, restaurantId]);


    if (!isOpen) return null;
    
    if (isLoadingMenu) {
        return (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
                    <Spinner className="w-10 h-10 text-orange-600 mb-4" />
                    <p className="text-gray-500 font-bold">Carregando cardápio...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="order-editor-modal-title">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 id="order-editor-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">Editar Pedido #{order.id.substring(0, 6)}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase">Nome do Cliente</label>
                                <input 
                                    type="text" 
                                    value={editedCustomerName} 
                                    onChange={e => setEditedCustomerName(e.target.value)}
                                    className="w-full p-2 border rounded bg-gray-50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase">WhatsApp</label>
                                <input 
                                    type="text" 
                                    value={editedCustomerPhone} 
                                    onChange={e => setEditedCustomerPhone(e.target.value.replace(/\D/g, ''))}
                                    className="w-full p-2 border rounded bg-gray-50 text-sm font-bold"
                                />
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">Ajuste a quantidade, remova ou adicione itens a este pedido.</p>

                        {editedItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum item no pedido. Clique em "Adicionar Novo Item".
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {editedItems.map((item, index) => (
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
                                            {item.notes && (
                                                <p className="text-xs text-orange-500 italic mt-1 bg-orange-50 p-1 rounded">
                                                    Obs: {item.notes}
                                                </p>
                                            )}
                                            <p className="text-sm text-orange-600 font-bold mt-1">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            <div className="flex items-center space-x-1">
                                                {item.menuItemId && (
                                                    <button onClick={() => handleEditItem(index)} className="text-gray-400 hover:text-blue-500 p-1" title="Editar adicionais">
                                                        <EditIcon className="w-4 h-4"/>
                                                    </button>
                                                )}
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
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

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-500 uppercase">Forma de Pagamento</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Mensalista'].map(m => (
                                    <button 
                                        key={m}
                                        type="button"
                                        onClick={() => setEditedPaymentMethod(m)}
                                        className={`py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${
                                            editedPaymentMethod.startsWith(m)
                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-blue-100'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

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
                    onClose={() => {
                        setIsPizzaModalOpen(false);
                        setEditingItemIndex(null);
                        setInitialCartItemForEdit(undefined);
                    }}
                    onAddToCart={handleAddItemToOrder}
                    initialPizza={itemToCustomize}
                    allPizzas={allRestaurantMenuItems.filter(i => i.isPizza)}
                    allAddons={allRestaurantAddons}
                    restaurantId={restaurantId}
                    initialCartItem={initialCartItemForEdit}
                />
            )}
            {isAcaiModalOpen && itemToCustomize && (
                <AcaiCustomizationModal
                    isOpen={isAcaiModalOpen}
                    onClose={() => {
                        setIsAcaiModalOpen(false);
                        setEditingItemIndex(null);
                        setInitialCartItemForEdit(undefined);
                    }}
                    onAddToCart={handleAddItemToOrder}
                    initialItem={itemToCustomize}
                    allAddons={allRestaurantAddons}
                    restaurantId={restaurantId}
                    initialCartItem={initialCartItemForEdit}
                />
            )}
            {isGenericModalOpen && itemToCustomize && (
                <GenericCustomizationModal
                    isOpen={isGenericModalOpen}
                    onClose={() => {
                        setIsGenericModalOpen(false);
                        setEditingItemIndex(null);
                        setInitialCartItemForEdit(undefined);
                    }}
                    onAddToCart={handleAddItemToOrder}
                    initialItem={itemToCustomize}
                    allAddons={allRestaurantAddons}
                    restaurantId={restaurantId}
                    initialCartItem={initialCartItemForEdit}
                />
            )}
        </>
    );
};

export default OrderEditorModal;
