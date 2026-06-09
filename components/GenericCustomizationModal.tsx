
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption, OptionGroup } from '../types';
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
    const [selectedOptions, setSelectedOptions] = useState<{ [groupId: string]: string[] }>({});
    const [notes, setNotes] = useState('');

    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (initialItem.sizes && initialItem.sizes.length > 0) {
            setSelectedSize(initialItem.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialItem.price });
        }
        setSelectedAddonIds(new Set());
        
        // Initialize options with defaults if any
        const initialOptions: { [groupId: string]: string[] } = {};
        initialItem.optionGroups?.forEach(group => {
            const defaults = group.options.filter(o => o.default).map(o => o.name);
            initialOptions[group.id] = defaults;
        });
        setSelectedOptions(initialOptions);
        
        setNotes('');
        setIsAdding(false);
    }, [initialItem, isOpen]);

    const availableAddons = useMemo(() => {
        return allAddons.filter(addon => initialItem.availableAddonIds?.includes(addon.id));
    }, [allAddons, initialItem]);
    
    const totalPrice = useMemo(() => {
        const basePrice = Number(selectedSize?.price || initialItem.price);
        const addonsPrice = availableAddons
            .filter(a => selectedAddonIds.has(a.id))
            .reduce((total, addon) => total + Number(addon.price || 0), 0);
        
        // Add options price
        let optionsPrice = 0;
        initialItem.optionGroups?.forEach(group => {
            const selectedInGroup = selectedOptions[group.id] || [];
            selectedInGroup.forEach(optName => {
                const opt = group.options.find(o => o.name === optName);
                if (opt) optionsPrice += Number(opt.price || 0);
            });
        });

        return basePrice + addonsPrice + optionsPrice;
    }, [initialItem, selectedSize, selectedAddonIds, availableAddons, selectedOptions]);
    
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

    const handleOptionToggle = (groupId: string, optionName: string, max: number) => {
        setSelectedOptions(prev => {
            const current = prev[groupId] || [];
            const isSelected = current.includes(optionName);
            
            if (isSelected) {
                return { ...prev, [groupId]: current.filter(o => o !== optionName) };
            } else {
                if (max === 1) {
                    return { ...prev, [groupId]: [optionName] };
                }
                if (current.length < max) {
                    return { ...prev, [groupId]: [...current, optionName] };
                }
                // Se atingiu o limite, remove a primeira opção escolhida e adiciona a nova (FIFO)
                // permitindo escolher e mudar de ideia com facilidade
                return { ...prev, [groupId]: [...current.slice(1), optionName] };
            }
        });
    };

    const isGroupValid = (group: OptionGroup) => {
        const selectedCount = (selectedOptions[group.id] || []).length;
        return selectedCount >= group.minSelections && selectedCount <= group.maxSelections;
    };

    const isAllValid = () => {
        if (!initialItem.optionGroups) return true;
        return initialItem.optionGroups.every(isGroupValid);
    };
    
    const handleAddToCartClick = () => {
        if (!selectedSize || !isAllValid()) return;

        setIsAdding(true);

        const selectedAddons = availableAddons.filter(a => selectedAddonIds.has(a.id));
        
        const cartSelectedOptions: { groupTitle: string; optionName: string; price: number }[] = [];
        initialItem.optionGroups?.forEach(group => {
            const selectedInGroup = selectedOptions[group.id] || [];
            selectedInGroup.forEach(optName => {
                const opt = group.options.find(o => o.name === optName);
                if (opt) {
                    cartSelectedOptions.push({
                        groupTitle: group.title,
                        optionName: optName,
                        price: opt.price
                    });
                }
            });
        });

        const topAddons = selectedAddons.slice(0, 2).map(a => a.name).join(', ');
        const remainingCount = selectedAddons.length - 2;
        const name = `${initialItem.name}${selectedAddons.length > 0 ? ` (com ${topAddons}` : ''}${remainingCount > 0 ? ` e mais ${remainingCount}` : ''}${selectedAddons.length > 0 ? ')' : ''}`;

        const optionKey = cartSelectedOptions.map(o => `${o.groupTitle}:${o.optionName}`).sort().join('|');
        const addonIds = Array.from(selectedAddonIds).sort().join('-');
        const cartId = `item-${initialItem.id}_size-${selectedSize.name}_addons-${addonIds}_options-${optionKey}`;
        
        const customizedItem: CartItem = {
            id: cartId,
            name: name,
            price: totalPrice,
            basePrice: Number(selectedSize.price),
            imageUrl: initialItem.imageUrl,
            quantity: 1,
            description: cartSelectedOptions.length > 0 
                ? cartSelectedOptions.map(o => o.optionName).join(', ')
                : `${selectedAddons.length} adicionais selecionados`,
            selectedAddons: selectedAddons,
            selectedOptions: cartSelectedOptions,
            sizeName: selectedSize.name !== 'Único' ? selectedSize.name : undefined,
            notes: notes.trim() || undefined,
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

                    {initialItem.optionGroups?.map((group, gIdx) => {
                        const isValid = isGroupValid(group);
                        const selectedCount = (selectedOptions[group.id] || []).length;
                        
                        return (
                            <div key={group.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        {group.title}
                                        {group.minSelections > 0 && (
                                            <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Obrigatório</span>
                                        )}
                                    </h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isValid ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200 animate-pulse'}`}>
                                        {selectedCount} / {group.maxSelections}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {group.options.map(option => {
                                        const isSelected = (selectedOptions[group.id] || []).includes(option.name);
                                        
                                        return (
                                            <label key={option.name} className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-400' : 'border-gray-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type={group.maxSelections === 1 ? "radio" : "checkbox"}
                                                        checked={isSelected}
                                                        onChange={() => handleOptionToggle(group.id, option.name, group.maxSelections)}
                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                    />
                                                    <span className={`font-semibold ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{option.name}</span>
                                                </div>
                                                {option.price > 0 && (
                                                    <span className="text-sm font-bold text-gray-500">+ R$ {option.price.toFixed(2)}</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {availableAddons.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2">Selecione os adicionais</h3>
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
                        disabled={isAdding || !isAllValid()}
                        className={`font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2 ${!isAllValid() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : (isAdding ? 'bg-green-600 text-white scale-105' : 'bg-orange-600 text-white hover:bg-orange-700')}`}
                    >
                        {isAdding ? (
                            <>
                                <span>Adicionado!</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </>
                        ) : (
                            !isAllValid() ? 'Conclua a Seleção' : 'Adicionar ao Carrinho'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericCustomizationModal;
