
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
        if (initialItem.sizes && initialItem.sizes.length > 0) {
            setSelectedSize(initialItem.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialItem.price, freeAddonCount: initialItem.freeAddonCount });
        }
        setSelectedAddonIds(new Set());
    }, [initialItem, isOpen]);

    const freeAddonCountLimit = selectedSize?.freeAddonCount || 0;

    const availableAddons = useMemo(() => {
        return allAddons.filter(addon => initialItem.availableAddonIds?.includes(addon.id));
    }, [allAddons, initialItem]);

    const { freePool, paidPool } = useMemo(() => {
        const free = availableAddons.filter(a => Number(a.price) === 0);
        const paid = availableAddons.filter(a => Number(a.price) > 0);
        return { freePool: free, paidPool: paid };
    }, [availableAddons]);

    const { totalPrice, currentFreeCount, isLimitReached } = useMemo(() => {
        const basePrice = Number(selectedSize?.price || initialItem.price);
        
        let addonsTotal = 0;
        let freeCount = 0;

        selectedAddonIds.forEach(id => {
            const addon = availableAddons.find(a => a.id === id);
            if (addon) {
                addonsTotal += Number(addon.price || 0);
                if (Number(addon.price) === 0) {
                    freeCount++;
                }
            }
        });

        return {
            totalPrice: basePrice + addonsTotal,
            currentFreeCount: freeCount,
            isLimitReached: freeCount >= freeAddonCountLimit
        };
    }, [initialItem, selectedSize, selectedAddonIds, availableAddons, freeAddonCountLimit]);
    
    const handleAddonToggle = (addon: Addon) => {
        setSelectedAddonIds(prev => {
            const newSet = new Set(prev);
            const isSelected = newSet.has(addon.id);

            if (isSelected) {
                newSet.delete(addon.id);
            } else {
                if (Number(addon.price) === 0) {
                    if (currentFreeCount >= freeAddonCountLimit) {
                        return prev;
                    }
                }
                newSet.add(addon.id);
            }
            return newSet;
        });
    };
    
    const handleAddToCartClick = () => {
        if (!selectedSize) return;
        
        const selectedAddons = availableAddons.filter(a => selectedAddonIds.has(a.id));
        
        const freeSelectedNames = selectedAddons.filter(a => Number(a.price) === 0).map(a => a.name).join(', ');
        const paidSelectedNames = selectedAddons.filter(a => Number(a.price) > 0).map(a => a.name).join(', ');
        
        const name = `${initialItem.name} ${selectedSize.name}`;
        
        const descriptionParts = [];
        if (freeSelectedNames) descriptionParts.push(`Inclusos: ${freeSelectedNames}`);
        if (paidSelectedNames) descriptionParts.push(`Extras: ${paidSelectedNames}`);

        const addonIds = Array.from(selectedAddonIds).sort().join('-');
        const cartId = `acai-${initialItem.id}_size-${selectedSize.name}_addons-${addonIds}`;
        
        const customizedItem: CartItem = {
            id: cartId,
            name: name,
            price: totalPrice,
            basePrice: Number(selectedSize.price),
            imageUrl: initialItem.imageUrl,
            quantity: 1,
            description: descriptionParts.join(' • '),
            selectedAddons: selectedAddons,
            sizeName: selectedSize.name,
        };
        
        onAddToCart(customizedItem);
    };

    if (!isOpen) return null;

    const remainingFree = Math.max(0, freeAddonCountLimit - currentFreeCount);
    const progressPercent = freeAddonCountLimit > 0 ? Math.min(100, (currentFreeCount / freeAddonCountLimit) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="acai-modal-title">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 bg-purple-800 text-white flex justify-between items-center shadow-md z-10">
                    <div>
                        <h2 id="acai-modal-title" className="text-xl font-bold">Monte seu Açaí</h2>
                        <p className="text-xs text-purple-200 opacity-90">{initialItem.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-purple-200 bg-purple-900 hover:bg-black/20 rounded-full p-1 transition-colors" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-6 bg-gray-50 flex-grow">
                    {initialItem.sizes && initialItem.sizes.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
                                Escolha o Tamanho
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {initialItem.sizes.map(size => {
                                    const isSelected = selectedSize?.name === size.name;
                                    return (
                                        <label key={size.name} className={`flex flex-col p-3 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-200'}`}>
                                            <input
                                                type="radio"
                                                name="acai-size"
                                                value={size.name}
                                                checked={isSelected}
                                                onChange={() => setSelectedSize(size)}
                                                className="sr-only"
                                            />
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>{size.name}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 font-semibold">R$ {Number(size.price).toFixed(2)}</div>
                                            {size.freeAddonCount && size.freeAddonCount > 0 ? (
                                                <div className="text-[10px] text-green-700 font-bold mt-1 bg-green-100 px-2 py-0.5 rounded w-fit border border-green-200">
                                                    Inclui {size.freeAddonCount} itens
                                                </div>
                                            ) : null}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {freePool.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex flex-col mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
                                        Itens Inclusos
                                    </h3>
                                    {freeAddonCountLimit > 0 && (
                                        <span className={`text-xs font-bold ${remainingFree > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                            {remainingFree > 0 ? `Escolha mais ${remainingFree}` : 'Limite atingido'}
                                        </span>
                                    )}
                                </div>
                                {freeAddonCountLimit > 0 && (
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${isLimitReached ? 'bg-green-500' : 'bg-purple-500'}`} 
                                            style={{ width: `${progressPercent}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {freePool.map(addon => {
                                    const isSelected = selectedAddonIds.has(addon.id);
                                    const isDisabled = !isSelected && isLimitReached;
                                    
                                    return (
                                     <label key={addon.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                                         isDisabled ? 'opacity-50 bg-gray-50 cursor-not-allowed border-gray-100' : 'cursor-pointer hover:bg-gray-50'
                                     } ${isSelected ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-green-600 border-green-600' : 'border-gray-400 bg-white'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleAddonToggle(addon)}
                                                disabled={isDisabled}
                                                className="hidden"
                                            />
                                            <span className={`font-medium text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{addon.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">Grátis</span>
                                    </label>
                                )})}
                            </div>
                        </div>
                    )}

                    {paidPool.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">{freePool.length > 0 ? 3 : 2}</span>
                                Turbinar (Extras)
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {paidPool.map(addon => {
                                    const isSelected = selectedAddonIds.has(addon.id);
                                    
                                    return (
                                     <label key={addon.id} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-300' : 'hover:bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-400 bg-white'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleAddonToggle(addon)}
                                                className="hidden"
                                            />
                                            <span className={`font-medium text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{addon.name}</span>
                                        </div>
                                        
                                        <span className={`text-sm font-bold ${isSelected ? 'text-orange-700' : 'text-gray-500'}`}>
                                            + R$ {Number(addon.price).toFixed(2)}
                                        </span>
                                    </label>
                                )})}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-500 text-sm">Total do Item</span>
                        <div className="text-xl font-bold text-gray-900">
                            R$ {totalPrice.toFixed(2)}
                        </div>
                    </div>
                    <button 
                        onClick={handleAddToCartClick}
                        className="w-full bg-purple-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-purple-200 flex justify-center items-center gap-2"
                    >
                        <span>Adicionar ao Carrinho</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcaiCustomizationModal;
