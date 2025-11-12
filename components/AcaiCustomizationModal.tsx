
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption } from '../types';

interface AcaiCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (customizedItem: CartItem) => void;
    initialItem: MenuItem;
    allAddons: Addon[];
}

const AcaiCustomizationModal: React.FC<AcaiCustomizationModalProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    initialItem,
    allAddons,
}) => {
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Reset state when modal opens for a new item
        if (initialItem.sizes && initialItem.sizes.length > 0) {
            setSelectedSize(initialItem.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialItem.price, freeAddonCount: initialItem.freeAddonCount });
        }
        setSelectedAddonIds(new Set());
    }, [initialItem, isOpen]);

    const freeAddonCount = selectedSize?.freeAddonCount || 0;

    const availableAddons = useMemo(() => {
        return allAddons.filter(addon => initialItem.availableAddonIds?.includes(addon.id));
    }, [allAddons, initialItem]);
    
    const { totalPrice, selectedFreeAddons, selectedPaidAddons } = useMemo(() => {
        const basePrice = selectedSize?.price || initialItem.price;
        const selectedAddons = availableAddons.filter(a => selectedAddonIds.has(a.id));
        
        let free: Addon[] = [];
        let paid: Addon[] = [];

        if (freeAddonCount > 0) {
            const sortedSelectedAddons = [...selectedAddons].sort((a, b) => b.price - a.price);
            free = sortedSelectedAddons.slice(0, freeAddonCount);
            paid = sortedSelectedAddons.slice(freeAddonCount);
        } else {
            paid = selectedAddons;
        }

        const addonsPrice = paid.reduce((total, addon) => total + addon.price, 0);
        
        return {
            totalPrice: basePrice + addonsPrice,
            selectedFreeAddons: free,
            selectedPaidAddons: paid,
        };
    }, [initialItem, selectedSize, selectedAddonIds, availableAddons, freeAddonCount]);
    
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
        if (!selectedSize) {
            alert("Por favor, selecione um tamanho.");
            return;
        }
        const selectedAddons = [...selectedFreeAddons, ...selectedPaidAddons];
        
        const topAddons = selectedAddons.slice(0, 2).map(a => a.name).join(', ');
        const remainingCount = selectedAddons.length - 2;
        const name = `${initialItem.name}${selectedAddons.length > 0 ? ` com ${topAddons}` : ''}${remainingCount > 0 ? ` e mais ${remainingCount}` : ''}`;

        const addonIds = Array.from(selectedAddonIds).sort().join('-');
        const cartId = `acai-${initialItem.id}_size-${selectedSize.name}_addons-${addonIds}`;
        
        const customizedItem: CartItem = {
            id: cartId,
            name: name,
            price: totalPrice,
            basePrice: selectedSize.price,
            imageUrl: initialItem.imageUrl,
            quantity: 1,
            description: `${selectedAddons.length} adicionais selecionados`,
            selectedAddons: selectedAddons,
            sizeName: selectedSize.name,
        };
        
        onAddToCart(customizedItem);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="acai-modal-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 id="acai-modal-title" className="text-xl font-bold text-gray-800">Monte seu {initialItem.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4">
                     {/* --- SIZE SELECTOR --- */}
                    {initialItem.sizes && initialItem.sizes.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2">1. Escolha o Tamanho</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {initialItem.sizes.map(size => (
                                    <label key={size.name} className="flex flex-col items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                        <input
                                            type="radio"
                                            name="acai-size"
                                            value={size.name}
                                            checked={selectedSize?.name === size.name}
                                            onChange={() => setSelectedSize(size)}
                                            className="sr-only"
                                        />
                                        <span className="font-bold text-gray-800">{size.name}</span>
                                        <span className="text-sm text-gray-600">R$ {size.price.toFixed(2)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ADDONS --- */}
                    {availableAddons.length > 0 && (
                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <h3 className="font-bold">2. Escolha os Adicionais</h3>
                                {freeAddonCount > 0 && (
                                    <p className={`font-semibold text-sm ${selectedFreeAddons.length > freeAddonCount ? 'text-red-500' : 'text-green-600'}`}>
                                        ({selectedFreeAddons.length}/{freeAddonCount}) grátis
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                {availableAddons.map(addon => {
                                    const isSelected = selectedAddonIds.has(addon.id);
                                    const isFree = isSelected && selectedFreeAddons.some(a => a.id === addon.id);
                                    return (
                                     <label key={addon.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-400`}>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleAddonToggle(addon.id)}
                                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-3 font-semibold text-gray-700">{addon.name}</span>
                                        </div>
                                        {isFree ? (
                                            <span className="font-bold text-green-600">Grátis</span>
                                        ) : (
                                            <span className="font-semibold text-gray-600">+ R$ {addon.price.toFixed(2)}</span>
                                        )}
                                    </label>
                                )})}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- FOOTER --- */}
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

export default AcaiCustomizationModal;