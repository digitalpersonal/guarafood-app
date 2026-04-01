
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption } from '../types';
import { 
    Check, 
    Plus, 
    Info, 
    ShoppingBag, 
    Maximize2, 
    Sparkles, 
    MessageSquare, 
    X,
    CheckCircle2
} from 'lucide-react';

interface AcaiCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (customizedItem: CartItem) => void;
    initialItem: MenuItem;
    allAddons: Addon[];
    restaurantId: number;
}

const AcaiCustomizationModal: React.FC<AcaiCustomizationModalProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    initialItem,
    allAddons,
    restaurantId,
}) => {
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
    const [notes, setNotes] = useState('');

    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (initialItem.sizes && initialItem.sizes.length > 0) {
            setSelectedSize(initialItem.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialItem.price, freeAddonCount: initialItem.freeAddonCount });
        }
        setSelectedAddonIds(new Set());
        setNotes('');
        setIsAdding(false);
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
        
        setIsAdding(true);
        
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
            restaurantId: restaurantId,
            name: name,
            price: totalPrice,
            basePrice: Number(selectedSize.price),
            imageUrl: initialItem.imageUrl,
            quantity: 1,
            description: descriptionParts.join(' • '),
            selectedAddons: selectedAddons,
            sizeName: selectedSize.name,
            notes: notes.trim() || undefined,
        };
        
        setTimeout(() => {
            onAddToCart(customizedItem);
        }, 300);
    };

    if (!isOpen) return null;

    const remainingFree = Math.max(0, freeAddonCountLimit - currentFreeCount);
    const progressPercent = freeAddonCountLimit > 0 ? Math.min(100, (currentFreeCount / freeAddonCountLimit) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="acai-modal-title">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white flex justify-between items-center shadow-lg z-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-purple-400/20 rounded-full blur-xl" />
                    
                    <div className="relative z-10">
                        <h2 id="acai-modal-title" className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-300" />
                            Monte seu Açaí
                        </h2>
                        <p className="text-xs text-purple-200 font-bold opacity-90 uppercase tracking-widest">{initialItem.name}</p>
                    </div>
                    <button onClick={onClose} className="relative z-10 text-white hover:text-purple-200 bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-all active:scale-90" aria-label="Fechar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-6 bg-gray-50 flex-grow no-scrollbar">
                    {initialItem.sizes && initialItem.sizes.length > 0 && (
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <div className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg shadow-purple-200">
                                    <Maximize2 className="w-4 h-4" />
                                </div>
                                01. Escolha o Tamanho
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {initialItem.sizes.map(size => {
                                    const isSelected = selectedSize?.name === size.name;
                                    return (
                                        <label key={size.name} className={`group relative flex flex-col p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected ? 'border-purple-600 bg-purple-50/50 ring-4 ring-purple-100' : 'border-gray-100 bg-white hover:border-purple-200 hover:bg-gray-50/50'}`}>
                                            <input
                                                type="radio"
                                                name="acai-size"
                                                value={size.name}
                                                checked={isSelected}
                                                onChange={() => setSelectedSize(size)}
                                                className="sr-only"
                                            />
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-black text-lg ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>{size.name}</span>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600 animate-in zoom-in duration-300" />}
                                            </div>
                                            <div className={`text-sm font-black ${isSelected ? 'text-purple-700' : 'text-gray-500'}`}>R$ {Number(size.price).toFixed(2)}</div>
                                            
                                            {size.freeAddonCount && size.freeAddonCount > 0 ? (
                                                <div className={`text-[10px] font-black mt-3 px-2.5 py-1 rounded-lg w-fit border transition-all ${isSelected ? 'bg-green-500 text-white border-green-600 shadow-md shadow-green-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                                    {size.freeAddonCount} ITENS INCLUSOS
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-400 font-bold mt-3 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 w-fit">
                                                    SEM ADICIONAIS
                                                </div>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <div className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg shadow-purple-200">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            02. Personalize seu Copo
                        </h3>
                        
                        {freePool.length > 0 && (
                            <div className="mb-8">
                                <div className={`flex flex-col mb-5 p-5 rounded-3xl border-2 transition-all duration-500 ${isLimitReached ? 'bg-green-50 border-green-200 shadow-lg shadow-green-50' : 'bg-purple-50 border-purple-100'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className={`font-black text-sm uppercase tracking-tight flex items-center gap-2 ${isLimitReached ? 'text-green-900' : 'text-purple-900'}`}>
                                                Itens Inclusos
                                                {isLimitReached && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                            </h4>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isLimitReached ? 'text-green-600' : 'text-purple-600'}`}>
                                                {isLimitReached ? 'Seleção Completa!' : `Escolha até ${freeAddonCountLimit} opções`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-2xl font-black tabular-nums ${isLimitReached ? 'text-green-600' : 'text-purple-800'}`}>
                                                {currentFreeCount}<span className="text-purple-300 text-sm mx-1">/</span>{freeAddonCountLimit}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="relative w-full h-4 bg-white/50 rounded-full overflow-hidden border border-purple-100/50 p-0.5">
                                        <div 
                                            className={`h-full transition-all duration-1000 ease-out rounded-full relative ${
                                                isLimitReached ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gradient-to-r from-purple-500 to-purple-700'
                                            }`} 
                                            style={{ width: `${progressPercent}%` }}
                                        >
                                            {!isLimitReached && progressPercent > 0 && (
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isLimitReached && (
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-green-700 uppercase bg-white/80 p-2.5 rounded-xl border border-green-200 animate-in slide-in-from-top-2 duration-500">
                                            <Info className="w-3.5 h-3.5" />
                                            Você atingiu o limite de itens grátis!
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {freePool.map(addon => {
                                        const isSelected = selectedAddonIds.has(addon.id);
                                        const isDisabled = !isSelected && isLimitReached;
                                        
                                        return (
                                            <label key={addon.id} className={`group flex items-center justify-between p-4 border-2 rounded-2xl transition-all duration-300 ${
                                                isDisabled ? 'opacity-40 bg-gray-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:border-purple-300 hover:bg-purple-50/30'
                                            } ${isSelected ? 'bg-purple-50 border-purple-600 shadow-md ring-2 ring-purple-100' : 'border-gray-100 bg-white'}`}>
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className={`w-7 h-7 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all duration-500 ${
                                                        isSelected ? 'bg-purple-600 border-purple-600 scale-110 rotate-0 shadow-lg shadow-purple-200' : 'border-gray-200 bg-white rotate-12 group-hover:rotate-0'
                                                    }`}>
                                                        {isSelected && <Check className="w-4 h-4 text-white stroke-[4]" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleAddonToggle(addon)}
                                                        disabled={isDisabled}
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className={`font-black text-sm ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>{addon.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] text-green-600 font-black uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Grátis</span>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Incluso no tamanho</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {paidPool.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="bg-orange-100 text-orange-700 p-1.5 rounded-lg">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <h4 className="font-black text-orange-900 text-sm uppercase tracking-tight">Turbinar com Extras</h4>
                                    <div className="h-[1px] flex-grow bg-orange-100" />
                                </div>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {paidPool.map(addon => {
                                        const isSelected = selectedAddonIds.has(addon.id);
                                        
                                        return (
                                            <label key={addon.id} className={`group flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                                                isSelected ? 'bg-orange-50 border-orange-500 shadow-md ring-2 ring-orange-100' : 'hover:border-orange-200 border-gray-100 bg-white hover:bg-orange-50/20'
                                            }`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                                                        isSelected ? 'bg-orange-500 border-orange-500 scale-110 shadow-lg shadow-orange-200' : 'border-gray-200 bg-white group-hover:scale-105'
                                                    }`}>
                                                        {isSelected && <Check className="w-4 h-4 text-white stroke-[4]" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleAddonToggle(addon)}
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className={`font-black text-sm ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{addon.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] text-orange-600 font-black uppercase tracking-widest bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-100">Extra Pago</span>
                                                            <span className="text-[10px] text-orange-700 font-black">+ R$ {Number(addon.price).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 rotate-0' : 'bg-gray-100 text-gray-400 rotate-90 group-hover:rotate-0 group-hover:bg-orange-100 group-hover:text-orange-600'}`}>
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <div className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg shadow-purple-200">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            03. Alguma Observação?
                        </h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Sem granola, caprichar no leite condensado, etc."
                            className="w-full p-5 border-2 border-gray-100 rounded-3xl bg-gray-50 focus:ring-8 focus:ring-purple-100 focus:border-purple-400 focus:outline-none text-sm font-bold transition-all placeholder:text-gray-300"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.08)] relative z-20">
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex flex-col">
                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Total do Pedido</span>
                            <div className="text-3xl font-black text-purple-900 tabular-nums flex items-baseline gap-1">
                                <span className="text-sm font-bold text-purple-400">R$</span>
                                {totalPrice.toFixed(2)}
                            </div>
                        </div>
                        {currentFreeCount > 0 && (
                            <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100 flex flex-col items-end shadow-sm animate-in slide-in-from-right-4">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Sparkles className="w-3 h-3 text-green-500" />
                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Você Economizou</span>
                                </div>
                                <span className="text-xs font-black text-green-700">{currentFreeCount} ITENS GRÁTIS</span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={handleAddToCartClick}
                        disabled={isAdding}
                        className={`w-full font-black py-5 px-6 rounded-2xl transition-all active:scale-[0.97] shadow-xl flex justify-center items-center gap-3 text-sm uppercase tracking-widest group ${isAdding ? 'bg-green-500 text-white shadow-green-100' : 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white hover:shadow-purple-200 hover:-translate-y-0.5'}`}
                    >
                        {isAdding ? (
                            <>
                                <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" />
                                <span>Adicionado com Sucesso!</span>
                            </>
                        ) : (
                            <>
                                <ShoppingBag className="w-5 h-5 group-hover:animate-bounce" />
                                <span>Confirmar e Adicionar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcaiCustomizationModal;
