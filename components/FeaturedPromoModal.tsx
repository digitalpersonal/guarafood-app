import React, { useState, useEffect, useMemo } from 'react';
import type { FeaturedPromo, MenuItem, MenuCategory, Restaurant, CartItem, OptionGroup, SizeOption } from '../types';
import { fetchMenuForRestaurant } from '../services/databaseService';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import OptimizedImage from './OptimizedImage';

interface FeaturedPromoModalProps {
    isOpen: boolean;
    onClose: () => void;
    promo: FeaturedPromo | null;
    restaurant: Restaurant | null;
}

export const FeaturedPromoModal: React.FC<FeaturedPromoModalProps> = ({ isOpen, onClose, promo, restaurant }) => {
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<{ [groupId: string]: string[] }>({});
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToCart } = useCart();
    const { addToast } = useNotification();

    useEffect(() => {
        if (isOpen && promo && restaurant) {
            setIsLoading(true);
            setNotes('');
            fetchMenuForRestaurant(restaurant.id)
                .then(cats => {
                    setMenuCategories(cats);
                    if (promo.itemIds && promo.itemIds.length > 0) {
                        setSelectedItemId(Number(promo.itemIds[0]));
                    } else {
                        setSelectedItemId(null);
                    }
                })
                .catch(err => console.error("Error loading menu for promo modal:", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, promo, restaurant]);

    // Flatten all items across categories to find participating items
    const allItems: MenuItem[] = useMemo(() => {
        return menuCategories.flatMap(cat => cat.items || []);
    }, [menuCategories]);

    const participatingItems: MenuItem[] = useMemo(() => {
        if (!promo || !promo.itemIds || promo.itemIds.length === 0) return [];
        const numericItemIds = promo.itemIds.map(Number);
        return allItems.filter(item => numericItemIds.includes(Number(item.id)));
    }, [allItems, promo]);

    // Ensure selectedItemId is valid
    useEffect(() => {
        if (participatingItems.length > 0) {
            const exists = participatingItems.some(i => i.id === selectedItemId);
            if (!exists) {
                setSelectedItemId(participatingItems[0].id);
            }
        }
    }, [participatingItems, selectedItemId]);

    // Current selected item
    const selectedItem: MenuItem | null = useMemo(() => {
        if (participatingItems.length === 0) return null;
        return participatingItems.find(i => i.id === selectedItemId) || participatingItems[0];
    }, [participatingItems, selectedItemId]);

    // Parse option groups safely (supports both optionGroups and option_groups snake_case from DB)
    const currentOptionGroups: OptionGroup[] = useMemo(() => {
        if (!selectedItem) return [];
        const raw = (selectedItem as any).optionGroups || (selectedItem as any).option_groups;
        let parsed: OptionGroup[] = [];
        if (raw) {
            try {
                parsed = Array.isArray(raw)
                    ? raw
                    : (typeof raw === 'string' ? JSON.parse(raw) : []);
            } catch (e) {
                console.error("Error parsing optionGroups in promo modal:", e);
                parsed = [];
            }
        }

        // Se o item tiver marmitaOptions/sabores simples mas sem optionGroups formal
        const marmitaRaw = (selectedItem as any).marmitaOptions || (selectedItem as any).marmita_options;
        if ((!parsed || parsed.length === 0) && marmitaRaw) {
            try {
                const marmitaList: string[] = Array.isArray(marmitaRaw)
                    ? marmitaRaw
                    : (typeof marmitaRaw === 'string' ? JSON.parse(marmitaRaw) : []);
                if (marmitaList.length > 0) {
                    parsed = [{
                        id: 'marmita-sabor-options',
                        title: 'Opção / Sabor',
                        minSelections: 1,
                        maxSelections: 1,
                        options: marmitaList.map(opt => ({ name: opt, price: 0 }))
                    }];
                }
            } catch {}
        }

        return parsed;
    }, [selectedItem]);

    // Parse sizes safely
    const currentSizes: SizeOption[] = useMemo(() => {
        if (!selectedItem) return [];
        const rawSizes = (selectedItem as any).sizes;
        if (!rawSizes) return [];
        try {
            return Array.isArray(rawSizes)
                ? rawSizes
                : (typeof rawSizes === 'string' ? JSON.parse(rawSizes) : []);
        } catch (e) {
            console.error("Error parsing sizes in promo modal:", e);
            return [];
        }
    }, [selectedItem]);

    // Reset and initialize selected options whenever the selected item changes
    useEffect(() => {
        if (!selectedItem) {
            setSelectedOptions({});
            setSelectedSize(null);
            return;
        }

        const initialOpts: { [groupId: string]: string[] } = {};
        currentOptionGroups.forEach(group => {
            const defaults = group.options.filter(o => o.default).map(o => o.name);
            if (defaults.length > 0) {
                initialOpts[group.id] = defaults;
            } else if (group.minSelections === 1 && group.maxSelections === 1 && group.options.length === 1) {
                initialOpts[group.id] = [group.options[0].name];
            } else {
                initialOpts[group.id] = [];
            }
        });
        setSelectedOptions(initialOpts);

        if (currentSizes.length > 0) {
            setSelectedSize(currentSizes[0]);
        } else {
            setSelectedSize(null);
        }
    }, [selectedItemId, selectedItem?.id, currentOptionGroups, currentSizes]);

    // Calculate additional price from options (hook must be called unconditionally before early returns)
    const optionsExtraPrice = useMemo(() => {
        let total = 0;
        currentOptionGroups.forEach(group => {
            const selectedInGroup = selectedOptions[group.id] || [];
            selectedInGroup.forEach(optName => {
                const opt = group.options.find(o => o.name === optName);
                if (opt && opt.price > 0) {
                    total += Number(opt.price);
                }
            });
        });
        return total;
    }, [currentOptionGroups, selectedOptions]);

    if (!isOpen || !promo) return null;

    // Toggle option selection with radio/checkbox logic
    const handleOptionToggle = (groupId: string, optionName: string, maxSelections: number) => {
        setSelectedOptions(prev => {
            const current = prev[groupId] || [];
            const isSelected = current.includes(optionName);

            if (isSelected) {
                return { ...prev, [groupId]: current.filter(o => o !== optionName) };
            } else {
                if (maxSelections === 1) {
                    return { ...prev, [groupId]: [optionName] };
                }
                if (current.length < maxSelections) {
                    return { ...prev, [groupId]: [...current, optionName] };
                }
                // FIFO when reaching limit
                return { ...prev, [groupId]: [...current.slice(1), optionName] };
            }
        });
    };

    const isGroupValid = (group: OptionGroup) => {
        const selectedCount = (selectedOptions[group.id] || []).length;
        return selectedCount >= group.minSelections && selectedCount <= group.maxSelections;
    };

    const isAllValid = () => {
        return currentOptionGroups.every(isGroupValid);
    };

    const missingRequiredGroups = currentOptionGroups.filter(g => !isGroupValid(g));

    const finalPrice = Number(promo.fixedPrice) + optionsExtraPrice;

    const handleAddToCart = () => {
        if (!restaurant) return;

        if (!isAllValid()) {
            const missingNames = missingRequiredGroups.map(g => g.title).join(', ');
            addToast({ message: `Por favor, selecione: ${missingNames}`, type: 'warning' });
            return;
        }

        const cartSelectedOptions: { groupTitle: string; optionName: string; price: number }[] = [];
        currentOptionGroups.forEach(group => {
            const selectedInGroup = selectedOptions[group.id] || [];
            selectedInGroup.forEach(optName => {
                const opt = group.options.find(o => o.name === optName);
                if (opt) {
                    cartSelectedOptions.push({
                        groupTitle: group.title,
                        optionName: optName,
                        price: Number(opt.price || 0)
                    });
                }
            });
        });

        const optionsSummary = cartSelectedOptions.map(o => `${o.groupTitle}: ${o.optionName}`).join(' | ');
        const optionKey = cartSelectedOptions.map(o => `${o.groupTitle}:${o.optionName}`).sort().join('-');

        const itemNameSuffix = selectedItem && participatingItems.length > 1
            ? ` (${selectedItem.name})`
            : '';

        let formattedNotes = '';
        if (optionsSummary && notes.trim()) {
            formattedNotes = `${optionsSummary} | Obs: ${notes.trim()}`;
        } else if (optionsSummary) {
            formattedNotes = optionsSummary;
        } else if (notes.trim()) {
            formattedNotes = notes.trim();
        }

        const cartItemPayload: CartItem = {
            id: `featured-promo-${promo.id}-${selectedItemId || 'gen'}${optionKey ? `-${optionKey}` : ''}`,
            restaurantId: Number(restaurant.id),
            categoryId: selectedItem?.categoryId,
            name: `${promo.title}${itemNameSuffix}`,
            price: finalPrice,
            basePrice: Number(promo.fixedPrice),
            imageUrl: promo.imageUrl || (selectedItem ? selectedItem.imageUrl : ''),
            quantity: 1,
            description: optionsSummary || promo.description,
            originalPrice: promo.originalPrice ? Number(promo.originalPrice) : undefined,
            promotionName: promo.title,
            includeFreeDelivery: Boolean(promo.includeFreeDelivery),
            selectedOptions: cartSelectedOptions.length > 0 ? cartSelectedOptions : undefined,
            sizeName: selectedSize?.name && selectedSize.name !== 'Único' ? selectedSize.name : undefined,
            notes: formattedNotes || undefined
        };

        const success = addToCart(cartItemPayload, Number(restaurant.id));
        if (success) {
            addToast({ message: 'Item promocional adicionado ao carrinho!', type: 'success' });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header Image */}
                <div className="relative h-52 bg-orange-100 flex-shrink-0">
                    <OptimizedImage 
                        src={promo.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'} 
                        alt={promo.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5 text-white">
                        <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-max mb-1.5 shadow-sm">
                            Destaque Promocional
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black leading-tight">{promo.title}</h2>
                        {promo.includeFreeDelivery && (
                            <span className="text-xs text-green-300 font-bold mt-1 flex items-center gap-1">
                                🛵 Entrega Grátis inclusa!
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all shadow-md"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto space-y-5 flex-grow">
                    {promo.description && (
                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                            {promo.description}
                        </p>
                    )}

                    {/* Preço Promocional */}
                    <div className="flex items-baseline justify-between bg-orange-50/80 p-4 rounded-xl border border-orange-200">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-900 block">Preço Promocional</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl sm:text-3xl font-black text-orange-600">R$ {finalPrice.toFixed(2)}</span>
                                {promo.originalPrice && promo.originalPrice > promo.fixedPrice && (
                                    <span className="text-sm text-gray-400 line-through">R$ {promo.originalPrice.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                        {optionsExtraPrice > 0 && (
                            <span className="text-xs font-semibold text-orange-800 bg-orange-200/60 px-2 py-1 rounded-lg">
                                +R$ {optionsExtraPrice.toFixed(2)} adicionais
                            </span>
                        )}
                    </div>

                    {/* Step 1: Escolha do item participante (caso haja mais de 1) */}
                    {participatingItems.length > 1 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                1. Escolha a opção participante:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {participatingItems.map(item => {
                                    const isSelected = selectedItemId === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setSelectedItemId(item.id)}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                                isSelected 
                                                    ? 'border-orange-600 bg-orange-50/70 ring-2 ring-orange-500/20 shadow-sm' 
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        >
                                            {item.imageUrl && (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                                    <OptimizedImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-grow">
                                                <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                                {item.description && (
                                                    <p className="text-[11px] text-gray-500 truncate">{item.description}</p>
                                                )}
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-300'}`}>
                                                {isSelected && <span className="text-xs font-black">✓</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Item selecionado / incluso quando há apenas 1 item participante */}
                    {participatingItems.length === 1 && selectedItem && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            {selectedItem.imageUrl && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                                    <OptimizedImage src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="min-w-0 flex-grow">
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Item da Promoção</span>
                                <p className="text-sm font-black text-gray-800 truncate">{selectedItem.name}</p>
                                {selectedItem.description && (
                                    <p className="text-xs text-gray-500 truncate">{selectedItem.description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tamanho (se houver tamanhos no item) */}
                    {currentSizes.length > 1 && (
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-sm text-gray-800 mb-2">Escolha o Tamanho</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {currentSizes.map(size => (
                                    <label key={size.name} className="flex flex-col items-center p-2.5 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                        <input
                                            type="radio"
                                            name="promo-item-size"
                                            value={size.name}
                                            checked={selectedSize?.name === size.name}
                                            onChange={() => setSelectedSize(size)}
                                            className="sr-only"
                                        />
                                        <span className="font-bold text-xs text-gray-800">{size.name}</span>
                                        {size.price > 0 && (
                                            <span className="text-[11px] text-gray-500">+ R$ {Number(size.price).toFixed(2)}</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GRUPOS DE OPÇÃO / SABORES (O Ponto Crítico Solicitado pelo Usuário!) */}
                    {currentOptionGroups.length > 0 && (
                        <div className="space-y-4">
                            {currentOptionGroups.map((group) => {
                                const isValid = isGroupValid(group);
                                const selectedCount = (selectedOptions[group.id] || []).length;
                                const isRequired = group.minSelections > 0;

                                return (
                                    <div key={group.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                                <span>{group.title}</span>
                                                {isRequired ? (
                                                    <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                                                        Obrigatório
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                        Opcional
                                                    </span>
                                                )}
                                            </h3>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                                isValid 
                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                    : 'bg-orange-50 text-orange-600 border-orange-200 font-black animate-pulse'
                                            }`}>
                                                {selectedCount} / {group.maxSelections}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {group.options.map(option => {
                                                const isSelected = (selectedOptions[group.id] || []).includes(option.name);

                                                return (
                                                    <label 
                                                        key={option.name} 
                                                        className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-400 text-orange-950 font-bold' 
                                                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <input 
                                                                type={group.maxSelections === 1 ? "radio" : "checkbox"}
                                                                name={`group-${group.id}`}
                                                                checked={isSelected}
                                                                onChange={() => handleOptionToggle(group.id, option.name, group.maxSelections)}
                                                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                            />
                                                            <span className="text-sm">{option.name}</span>
                                                        </div>
                                                        {option.price > 0 && (
                                                            <span className="text-xs font-bold text-gray-600">
                                                                + R$ {Number(option.price).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Observações */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Observações para o Pedido (Opcional)
                        </label>
                        <input 
                            type="text" 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ex: Pouco gelo, caprichar no recheio..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-4 flex-shrink-0">
                    <div>
                        <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Total</span>
                        <span className="text-xl font-black text-gray-900">R$ {finalPrice.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleAddToCart}
                        disabled={!isAllValid()}
                        className={`font-bold px-6 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 ${
                            isAllValid()
                                ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-xl active:scale-95'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {isAllValid() ? 'Adicionar ao Carrinho' : 'Selecione as opções'}
                    </button>
                </div>
            </div>
        </div>
    );
};
