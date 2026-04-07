
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption } from '../types';
import OptimizedImage from './OptimizedImage';

interface GenericCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (customizedItem: CartItem) => void;
    initialItem: MenuItem;
    allAddons: Addon[];
    restaurantId: number;
    initialCartItem?: CartItem; // NEW: For editing
}

const GenericCustomizationModal: React.FC<GenericCustomizationModalProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    initialItem,
    allAddons,
    restaurantId,
    initialCartItem,
}) => {
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');

    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (initialCartItem) {
            // Editing mode
            if (initialItem.sizes && initialItem.sizes.length > 0) {
                const size = initialItem.sizes.find(s => s.name === initialCartItem.sizeName) || initialItem.sizes[0];
                setSelectedSize(size);
            } else {
                setSelectedSize({ name: 'Único', price: initialItem.price });
            }
            setSelectedAddonIds(new Set(initialCartItem.selectedAddons?.map(a => String(a.id)) || []));
            setNotes(initialCartItem.notes || '');
        } else {
            // New item mode
            if (initialItem.sizes && initialItem.sizes.length > 0) {
                setSelectedSize(initialItem.sizes[0]);
            } else {
                setSelectedSize({ name: 'Único', price: initialItem.price });
            }
            setSelectedAddonIds(new Set());
            setNotes('');
        }
        setIsAdding(false);
    }, [initialItem, isOpen, initialCartItem]);

    const availableAddons = useMemo(() => {
        if (!initialItem.availableAddonIds) return [];
        const addonIds = initialItem.availableAddonIds.map(id => String(id));
        return allAddons.filter(addon => addonIds.includes(String(addon.id)));
    }, [allAddons, initialItem]);
    
    const totalPrice = useMemo(() => {
        const basePrice = Number(selectedSize?.price || initialItem.price);
        const addonsPrice = availableAddons
            .filter(a => selectedAddonIds.has(String(a.id)))
            .reduce((total, addon) => total + Number(addon.price || 0), 0);
        
        return basePrice + addonsPrice;
    }, [initialItem, selectedSize, selectedAddonIds, availableAddons]);
    
    const handleAddonToggle = (addonId: number | string) => {
        const idStr = String(addonId);
        setSelectedAddonIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idStr)) {
                newSet.delete(idStr);
            } else {
                // Check limit
                if (initialItem.maxAddons !== undefined && initialItem.maxAddons !== null && initialItem.maxAddons > 0 && newSet.size >= initialItem.maxAddons) {
                    return prev;
                }
                if (initialItem.maxAddons === 0) {
                    return prev;
                }
                newSet.add(idStr);
            }
            return newSet;
        });
    };
    
    const handleAddToCartClick = () => {
        if (!selectedSize) return;

        setIsAdding(true);

        const selectedAddons = availableAddons.filter(a => selectedAddonIds.has(String(a.id)));
        
        const topAddons = selectedAddons.slice(0, 2).map(a => a.name).join(', ');
        const remainingCount = selectedAddons.length - 2;
        const name = `${initialItem.name}${selectedAddons.length > 0 ? ` (com ${topAddons}` : ''}${remainingCount > 0 ? ` e mais ${remainingCount}` : ''}${selectedAddons.length > 0 ? ')' : ''}`;

        const addonIds = Array.from(selectedAddonIds).sort().join('-');
        const cartId = `item-${initialItem.id}_size-${selectedSize.name}_addons-${addonIds}`;
        
        const customizedItem: CartItem = {
            id: initialCartItem?.id || cartId,
            restaurantId: restaurantId,
            name: name,
            price: totalPrice,
            basePrice: Number(selectedSize.price),
            imageUrl: initialItem.imageUrl,
            quantity: initialCartItem?.quantity || 1,
            description: `${selectedAddons.length} adicionais selecionados`,
            selectedAddons: selectedAddons,
            sizeName: selectedSize.name !== 'Único' ? selectedSize.name : undefined,
            notes: notes.trim() || undefined,
            menuItemId: initialItem.id,
        };
        
        setTimeout(() => {
            onAddToCart(customizedItem);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="generic-modal-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 id="generic-modal-title" className="text-xl font-bold text-gray-800">Personalize seu Item</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4">
                    {initialItem.sizes && initialItem.sizes.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2">1. Escolha o Tamanho</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {initialItem.sizes.map(size => (
                                    <label key={size.name} className="flex flex-col items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                        <input
                                            type="radio"
                                            name="item-size"
                                            value={size.name}
                                            checked={selectedSize?.name === size.name}
                                            onChange={() => setSelectedSize(size)}
                                            className="sr-only"
                                        />
                                        <span className="font-bold text-gray-800">{size.name}</span>
                                        <span className="text-sm text-gray-600">R$ {Number(size.price).toFixed(2)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="border rounded-lg p-3 flex items-center space-x-3 bg-gray-50">
                        <OptimizedImage src={initialItem.imageUrl || ''} alt={initialItem.name} className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg">{initialItem.name} {selectedSize && selectedSize.name !== 'Único' ? `(${selectedSize.name})` : ''}</p>
                            <p className="text-md text-gray-700">R$ {(selectedSize?.price || initialItem.price).toFixed(2)}</p>
                        </div>
                    </div>

                    {availableAddons.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold">{initialItem.sizes && initialItem.sizes.length > 0 ? '2. ' : ''}Selecione os adicionais</h3>
                                {initialItem.maxAddons && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedAddonIds.size >= initialItem.maxAddons ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {selectedAddonIds.size} / {initialItem.maxAddons}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {availableAddons.map(addon => {
                                    const isSelected = selectedAddonIds.has(String(addon.id));
                                    const maxAddons = initialItem.maxAddons !== undefined && initialItem.maxAddons !== null ? Number(initialItem.maxAddons) : null;
                                    const isDisabled = !isSelected && maxAddons !== null && (maxAddons === 0 || selectedAddonIds.size >= maxAddons);
                                    
                                    return (
                                        <label key={addon.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'} ${isSelected ? 'bg-orange-50 border-orange-400' : ''}`}>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleAddonToggle(addon.id)}
                                                    disabled={isDisabled}
                                                    className="sr-only"
                                                />
                                                <span className={`ml-3 font-semibold ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{addon.name}</span>
                                            </div>
                                            {addon.price > 0 && <span className="font-semibold text-gray-600">+ R$ {Number(addon.price).toFixed(2)}</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Observações</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Sem cebola, bem passado, etc."
                            className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                            rows={2}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center mt-auto">
                    <div className="text-lg font-bold">
                        <span>Total: </span>
                        <span className="text-orange-600">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handleAddToCartClick}
                        disabled={isAdding}
                        className={`font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2 ${isAdding ? 'bg-green-600 text-white scale-105' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                        {isAdding ? (
                            <>
                                <span>{initialCartItem ? 'Atualizado!' : 'Adicionado!'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </>
                        ) : (
                            initialCartItem ? 'Atualizar Item' : 'Adicionar ao Carrinho'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericCustomizationModal;
