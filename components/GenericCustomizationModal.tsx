
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption } from '../types';
import OptimizedImage from './OptimizedImage';

interface GenericCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (customizedItem: CartItem) => void;
    initialItem: MenuItem;
    allAddons: Addon[];
}

const GenericCustomizationModal: React.FC<GenericCustomizationModalProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    initialItem,
    allAddons,
}) => {
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (initialItem.sizes && initialItem.sizes.length > 0) {
            setSelectedSize(initialItem.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialItem.price });
        }
        setSelectedAddonIds(new Set());
    }, [initialItem, isOpen]);

    const availableAddons = useMemo(() => {
        return allAddons.filter(addon => initialItem.availableAddonIds?.includes(addon.id));
    }, [allAddons, initialItem]);
    
    const totalPrice = useMemo(() => {
        const basePrice = Number(selectedSize?.price || initialItem.price);
        const addonsPrice = availableAddons
            .filter(a => selectedAddonIds.has(a.id))
            .reduce((total, addon) => total + Number(addon.price || 0), 0);
        
        return basePrice + addonsPrice;
    }, [initialItem, selectedSize, selectedAddonIds, availableAddons]);
    
    const handleAddonToggle = (addonId: number) => {
        setSelectedAddonIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(addonId)) {
                newSet.delete(addonId);
            } else {
                newSet.add(addonId);
            }
            return newSet;
        });
    };
    
    const handleAddToCartClick = () => {
        if (!selectedSize) return;

        const selectedAddons = availableAddons.filter(a => selectedAddonIds.has(a.id));
        
        const topAddons = selectedAddons.slice(0, 2).map(a => a.name).join(', ');
        const remainingCount = selectedAddons.length - 2;
        const name = `${initialItem.name}${selectedAddons.length > 0 ? ` (com ${topAddons}` : ''}${remainingCount > 0 ? ` e mais ${remainingCount}` : ''}${selectedAddons.length > 0 ? ')' : ''}`;

        const addonIds = Array.from(selectedAddonIds).sort().join('-');
        const cartId = `item-${initialItem.id}_size-${selectedSize.name}_addons-${addonIds}`;
        
        const customizedItem: CartItem = {
            id: cartId,
            name: name,
            price: totalPrice,
            basePrice: Number(selectedSize.price),
            imageUrl: initialItem.imageUrl,
            quantity: 1,
            description: `${selectedAddons.length} adicionais selecionados`,
            selectedAddons: selectedAddons,
            sizeName: selectedSize.name !== 'Único' ? selectedSize.name : undefined,
        };
        
        onAddToCart(customizedItem);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="generic-modal-title">
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
                            <h3 className="font-bold mb-2">{initialItem.sizes && initialItem.sizes.length > 0 ? '2. ' : ''}Selecione os adicionais</h3>
                            <div className="space-y-2">
                                {availableAddons.map(addon => (
                                     <label key={addon.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-400">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedAddonIds.has(addon.id)}
                                                onChange={() => handleAddonToggle(addon.id)}
                                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-3 font-semibold text-gray-700">{addon.name}</span>
                                        </div>
                                        {addon.price > 0 && <span className="font-semibold text-gray-600">+ R$ {Number(addon.price).toFixed(2)}</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center mt-auto">
                    <div className="text-lg font-bold">
                        <span>Total: </span>
                        <span className="text-orange-600">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={handleAddToCartClick}
                        className="bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericCustomizationModal;
