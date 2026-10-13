import React, { useState, useEffect, useMemo } from 'react';
import type { FeaturedPromo, MenuItem, MenuCategory, Restaurant, CartItem, OptionGroup, SizeOption, Addon } from '../types';
import { fetchMenuForRestaurant, fetchAddonsForRestaurant } from '../services/databaseService';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import { formatPromoDays } from '../utils/promoUtils';
import OptimizedImage from './OptimizedImage';

interface FeaturedPromoModalProps {
    isOpen: boolean;
    onClose: () => void;
    promo: FeaturedPromo | null;
    restaurant: Restaurant | null;
}

export const FeaturedPromoModal: React.FC<FeaturedPromoModalProps> = ({ isOpen, onClose, promo, restaurant }) => {
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [allAddons, setAllAddons] = useState<Addon[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
    const [selectedOptions, setSelectedOptions] = useState<{ [groupId: string]: string[] | { [optName: string]: number } }>({});
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToCart } = useCart();
    const { addToast } = useNotification();

    useEffect(() => {
        if (isOpen && promo && restaurant) {
            setIsLoading(true);
            setNotes('');
            setSelectedAddonIds(new Set());
            Promise.all([
                fetchMenuForRestaurant(restaurant.id),
                fetchAddonsForRestaurant(restaurant.id)
            ])
                .then(([cats, addons]) => {
                    setMenuCategories(cats);
                    setAllAddons(addons || []);
                    const max = promo.maxItemSelections || 1;
                    if (promo.itemIds && promo.itemIds.length > 0) {
                        const numericIds = promo.itemIds.map(Number);
                        setSelectedItemIds(numericIds.slice(0, max));
                    } else {
                        setSelectedItemIds([]);
                    }
                })
                .catch(err => console.error("Error loading menu/addons for promo modal:", err))
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

    const maxSelections = promo?.maxItemSelections || 1;
    const requiredCount = Math.min(maxSelections, participatingItems.length);

    const handleItemToggle = (itemId: number) => {
        setSelectedItemIds(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                if (maxSelections === 1) {
                    return [itemId];
                }
                if (prev.length >= maxSelections) {
                    return [...prev.slice(1), itemId];
                }
                return [...prev, itemId];
            }
        });
    };

    const isItemsValid = participatingItems.length === 0 || maxSelections > 1 || selectedItemIds.length === requiredCount;

    const selectedItems = useMemo(() => {
        return participatingItems.filter(i => selectedItemIds.includes(i.id));
    }, [participatingItems, selectedItemIds]);

    // Current selected item (first selected item or first participating item for option groups / sizes)
    const selectedItem: MenuItem | null = useMemo(() => {
        if (selectedItems.length > 0) return selectedItems[0];
        if (participatingItems.length === 0) return null;
        return participatingItems[0];
    }, [selectedItems, participatingItems]);

    // Parse option groups safely (supports promo.optionGroups, item optionGroups, and snake_case)
    const currentOptionGroups: OptionGroup[] = useMemo(() => {
        let groups: OptionGroup[] = [];
        if (promo && promo.optionGroups && Array.isArray(promo.optionGroups) && promo.optionGroups.length > 0) {
            groups = JSON.parse(JSON.stringify(promo.optionGroups));
        }

        // Se houver itens participantes e maxSelections > 1 (ex: 6 Esfihas), os sabores devem seguir os itens participantes
        if (participatingItems.length > 0 && maxSelections > 1) {
            groups = groups.map(g => {
                const titleLower = g.title.toLowerCase();
                if (titleLower.includes('sabor') || titleLower.includes('sabores') || titleLower.includes('esfiha') || titleLower.includes('6')) {
                    return {
                        ...g,
                        minSelections: maxSelections,
                        maxSelections: maxSelections,
                        allowQuantityPerOption: true,
                        options: participatingItems.map(pi => ({
                            name: pi.name,
                            price: Number(pi.price || 0)
                        }))
                    };
                }
                return g;
            });

            if (!groups.some(g => {
                const tl = g.title.toLowerCase();
                return tl.includes('sabor') || tl.includes('sabores') || tl.includes('esfiha');
            })) {
                groups.push({
                    id: 'group_participating_flavors',
                    title: `Escolha os ${maxSelections} Sabores (Quantidade livre por sabor)`,
                    minSelections: maxSelections,
                    maxSelections: maxSelections,
                    allowQuantityPerOption: true,
                    options: participatingItems.map(pi => ({
                        name: pi.name,
                        price: Number(pi.price || 0)
                    }))
                });
            }
        }

        // Se a promoção já tem option_groups próprios explicitamente configurados, usamos a configuração da promoção
        // e NÃO duplicamos com optionGroups dos itens originais (a menos que a promoção não tenha nenhum grupo configurado).
        if (groups.length === 0 && selectedItem) {
            const raw = (selectedItem as any).optionGroups || (selectedItem as any).option_groups;
            if (raw) {
                try {
                    const itemGroups = Array.isArray(raw)
                        ? raw
                        : (typeof raw === 'string' ? JSON.parse(raw) : []);
                    groups = [...itemGroups];
                } catch (e) {
                    console.error("Error parsing optionGroups in promo modal:", e);
                }
            }

            // Se o item tiver marmitaOptions/sabores simples mas sem optionGroups formal
            const marmitaRaw = (selectedItem as any).marmitaOptions || (selectedItem as any).marmita_options;
            if (groups.length === 0 && marmitaRaw) {
                try {
                    const marmitaList: string[] = Array.isArray(marmitaRaw)
                        ? marmitaRaw
                        : (typeof marmitaRaw === 'string' ? JSON.parse(marmitaRaw) : []);
                    if (marmitaList.length > 0) {
                        groups.push({
                            id: 'marmita-sabor-options',
                            title: 'Opção / Sabor',
                            minSelections: 1,
                            maxSelections: 1,
                            options: marmitaList.map(opt => ({ name: opt, price: 0 }))
                        });
                    }
                } catch {}
            }
        }

        // Se a promoção for de apenas 1 pizza (maxSelections === 1), garanta que nunca apareça "Borda da 2ª Pizza"
        if (maxSelections === 1) {
            groups = groups.filter(g => !g.title.toLowerCase().includes('2ª pizza') && !g.title.toLowerCase().includes('segunda pizza'));
            // E se houver apenas 1 borda restante chamada "Borda da 1ª Pizza", renomear para "Borda da Pizza"
            groups = groups.map(g => {
                if (g.title.toLowerCase().includes('borda da 1ª pizza') || g.title.toLowerCase().includes('borda da 1a pizza')) {
                    return { ...g, title: 'Borda Recheada da Pizza' };
                }
                return g;
            });
        }

        return groups;
    }, [promo, selectedItem, participatingItems, maxSelections]);

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

        const initialOpts: { [groupId: string]: any } = {};
        currentOptionGroups.forEach(group => {
            const isQty = group.allowQuantityPerOption || (group.maxSelections > 1 && !group.title.toLowerCase().includes('borda'));
            if (isQty) {
                const counts: { [name: string]: number } = {};
                group.options.forEach(o => { counts[o.name] = o.default ? 1 : 0; });
                initialOpts[group.id] = counts;
            } else {
                const defaults = group.options.filter(o => o.default).map(o => o.name);
                if (defaults.length > 0) {
                    initialOpts[group.id] = defaults;
                } else if (group.minSelections === 1 && group.maxSelections === 1 && group.options.length === 1) {
                    initialOpts[group.id] = [group.options[0].name];
                } else {
                    initialOpts[group.id] = [];
                }
            }
        });
        setSelectedOptions(initialOpts);

        if (currentSizes.length > 0) {
            setSelectedSize(currentSizes[0]);
        } else {
            setSelectedSize(null);
        }
    }, [selectedItemIds, selectedItem?.id, currentOptionGroups, currentSizes]);

    // Available Addons for sandwiches/burgers/selected items
    const availableAddons = useMemo(() => {
        if (!selectedItem || !promo) return [];
        const itemAddonIds = selectedItem.availableAddonIds || (selectedItem as any).available_addon_ids || [];
        if (Array.isArray(itemAddonIds) && itemAddonIds.length > 0) {
            return allAddons.filter(a => itemAddonIds.includes(Number(a.id)));
        }
        // Se o item for da categoria Lanche/Sanduíche/Hambúrguer ou se o restaurante tiver adicionais cadastrados
        const promoTitleLower = promo.title ? promo.title.toLowerCase() : '';
        const isSandwichOrBurger = selectedItem.name?.toLowerCase().includes('x-') ||
            selectedItem.name?.toLowerCase().includes('lanche') ||
            selectedItem.name?.toLowerCase().includes('sanduíche') ||
            selectedItem.name?.toLowerCase().includes('sanduiche') ||
            selectedItem.name?.toLowerCase().includes('hambúrguer') ||
            selectedItem.name?.toLowerCase().includes('hamburguer') ||
            selectedItem.name?.toLowerCase().includes('burger') ||
            promoTitleLower.includes('x-') ||
            promoTitleLower.includes('lanche') ||
            promoTitleLower.includes('sanduíche') ||
            promoTitleLower.includes('burger');

        if (isSandwichOrBurger) {
            return allAddons;
        }
        return [];
    }, [selectedItem, allAddons, promo?.title]);

    const handleAddonToggle = (addonId: number) => {
        setSelectedAddonIds(prev => {
            const next = new Set(prev);
            if (next.has(addonId)) {
                next.delete(addonId);
            } else {
                next.add(addonId);
            }
            return next;
        });
    };

    const addonsExtraPrice = useMemo(() => {
        return availableAddons
            .filter(a => selectedAddonIds.has(Number(a.id)))
            .reduce((total, addon) => total + Number(addon.price || 0), 0);
    }, [availableAddons, selectedAddonIds]);

    // Calculate additional price from options (hook must be called unconditionally before early returns)
    const optionsExtraPrice = useMemo(() => {
        let total = 0;
        currentOptionGroups.forEach(group => {
            const isQty = group.allowQuantityPerOption || (group.maxSelections > 1 && !group.title.toLowerCase().includes('borda'));
            if (isQty) {
                const groupCounts = (selectedOptions[group.id] || {}) as { [name: string]: number };
                Object.entries(groupCounts).forEach(([optName, count]) => {
                    if (count > 0) {
                        const opt = group.options.find(o => o.name === optName);
                        if (opt && opt.price > 0) {
                            total += Number(opt.price) * count;
                        }
                    }
                });
            } else {
                const selectedInGroup = (selectedOptions[group.id] || []) as string[];
                selectedInGroup.forEach(optName => {
                    const opt = group.options.find(o => o.name === optName);
                    if (opt && opt.price > 0) {
                        total += Number(opt.price);
                    }
                });
            }
        });
        return total + addonsExtraPrice;
    }, [currentOptionGroups, selectedOptions, addonsExtraPrice]);

    if (!isOpen || !promo) return null;

    // Toggle option selection with radio/checkbox logic
    const handleOptionToggle = (groupId: string, optionName: string, maxSelections: number) => {
        setSelectedOptions(prev => {
            const current = (prev[groupId] || []) as string[];
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

    const handleOptionQuantityChange = (groupId: string, optionName: string, delta: number, maxSelections: number) => {
        setSelectedOptions(prev => {
            const groupCounts = (prev[groupId] || {}) as { [name: string]: number };
            const currentCount = groupCounts[optionName] || 0;
            const currentTotal = Object.values(groupCounts).reduce((a, b) => a + b, 0);

            if (delta > 0 && currentTotal >= maxSelections) {
                return prev;
            }
            const newCount = Math.max(0, currentCount + delta);
            return { ...prev, [groupId]: { ...groupCounts, [optionName]: newCount } };
        });
    };

    const isGroupValid = (group: OptionGroup) => {
        const isQty = group.allowQuantityPerOption || (group.maxSelections > 1 && !group.title.toLowerCase().includes('borda'));
        if (isQty) {
            const groupCounts = (selectedOptions[group.id] || {}) as { [name: string]: number };
            const totalCount = Object.values(groupCounts).reduce((a, b) => a + b, 0);
            return totalCount >= group.minSelections && totalCount <= group.maxSelections;
        } else {
            const selectedCount = ((selectedOptions[group.id] || []) as string[]).length;
            return selectedCount >= group.minSelections && selectedCount <= group.maxSelections;
        }
    };

    const isAllValid = () => {
        return currentOptionGroups.every(isGroupValid);
    };

    const missingRequiredGroups = currentOptionGroups.filter(g => !isGroupValid(g));

    const finalPrice = Number(promo.fixedPrice) + optionsExtraPrice;

    const handleAddToCart = () => {
        if (!restaurant) return;

        if (!isItemsValid) {
            addToast({ message: `Por favor, selecione exatamente ${requiredCount} opções participantes.`, type: 'warning' });
            return;
        }

        if (!isAllValid()) {
            const missingNames = missingRequiredGroups.map(g => g.title).join(', ');
            addToast({ message: `Por favor, selecione: ${missingNames}`, type: 'warning' });
            return;
        }

        const cartSelectedOptions: { groupTitle: string; optionName: string; price: number }[] = [];
        currentOptionGroups.forEach(group => {
            const isQty = group.allowQuantityPerOption || (group.maxSelections > 1 && !group.title.toLowerCase().includes('borda'));
            if (isQty) {
                const groupCounts = (selectedOptions[group.id] || {}) as { [name: string]: number };
                Object.entries(groupCounts).forEach(([optName, count]) => {
                    if (count > 0) {
                        const opt = group.options.find(o => o.name === optName);
                        if (opt) {
                            cartSelectedOptions.push({
                                groupTitle: group.title,
                                optionName: count > 1 ? `${count}x ${optName}` : optName,
                                price: Number(opt.price || 0) * count
                            });
                        }
                    }
                });
            } else {
                const selectedInGroup = (selectedOptions[group.id] || []) as string[];
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
            }
        });

        // Add selected addons to cart options / details
        const selectedAddonsList = availableAddons.filter(a => selectedAddonIds.has(Number(a.id)));
        selectedAddonsList.forEach(addon => {
            cartSelectedOptions.push({
                groupTitle: 'Adicionais',
                optionName: addon.name,
                price: Number(addon.price || 0)
            });
        });

        const optionsSummary = cartSelectedOptions.map(o => `${o.groupTitle}: ${o.optionName}`).join(' | ');
        const optionKey = cartSelectedOptions.map(o => `${o.groupTitle}:${o.optionName}`).sort().join('-');

        const itemNameSuffix = selectedItems.length > 0
            ? ` (${selectedItems.map(i => i.name).join(', ')})`
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
            id: `featured-promo-${promo.id}-${selectedItemIds.join('-') || 'gen'}${optionKey ? `-${optionKey}` : ''}`,
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
            selectedAddons: selectedAddonsList.length > 0 ? selectedAddonsList : undefined,
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
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                                Destaque Promocional
                            </span>
                            <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                                <span>🗓️</span>
                                <span>{formatPromoDays(promo.availableDays)}</span>
                            </span>
                        </div>
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

                    {/* Step 1: Escolha dos itens participantes (Apenas se maxSelections === 1) */}
                    {participatingItems.length > 0 && maxSelections === 1 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-bold text-gray-800">
                                    {maxSelections > 1 
                                        ? `1. Escolha até ${maxSelections} opções (${selectedItemIds.length}/${maxSelections}):`
                                        : '1. Escolha a opção participante:'
                                    }
                                </label>
                                {maxSelections > 1 && (
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                        selectedItemIds.length === requiredCount ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200 font-black'
                                    }`}>
                                        {selectedItemIds.length} / {requiredCount} selecionados
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {participatingItems.map(item => {
                                    const isSelected = selectedItemIds.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemToggle(item.id)}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                                                isSelected 
                                                    ? 'border-orange-600 bg-orange-50/70 ring-2 ring-orange-500/20 shadow-sm font-bold' 
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
                                            <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                                                maxSelections === 1 ? 'rounded-full border' : 'rounded border'
                                            } ${isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                {isSelected && <span className="text-xs font-black">✓</span>}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                const isQty = group.allowQuantityPerOption || (group.maxSelections > 1 && !group.title.toLowerCase().includes('borda'));
                                const groupCounts = isQty ? ((selectedOptions[group.id] || {}) as { [name: string]: number }) : {};
                                const selectedCount = isQty 
                                    ? Object.values(groupCounts).reduce((a, b) => a + b, 0)
                                    : ((selectedOptions[group.id] || []) as string[]).length;
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
                                                const count = isQty ? (groupCounts[option.name] || 0) : (((selectedOptions[group.id] || []) as string[]).includes(option.name) ? 1 : 0);

                                                if (isQty) {
                                                    return (
                                                        <div 
                                                            key={option.name} 
                                                            className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                                                                count > 0 
                                                                    ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-400 text-orange-950 font-bold' 
                                                                    : 'border-gray-200 bg-white text-gray-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm">{option.name}</span>
                                                                {option.price > 0 && (
                                                                    <span className="text-xs font-bold text-gray-500">
                                                                        + R$ {Number(option.price).toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOptionQuantityChange(group.id, option.name, -1, group.maxSelections)}
                                                                    disabled={count === 0}
                                                                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer transition-all"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-6 text-center text-sm font-black">{count}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOptionQuantityChange(group.id, option.name, 1, group.maxSelections)}
                                                                    disabled={selectedCount >= group.maxSelections}
                                                                    className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer transition-all"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    const isSelected = count > 0;
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
                                                }
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* SEÇÃO DE ADICIONAIS (Para sanduíches, hambúrgueres e itens com adicionais) */}
                    {availableAddons.length > 0 && (
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                    <span>🥓 Adicionais e Extras (Opcional)</span>
                                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                        Personalize seu sanduíche / pedido
                                    </span>
                                </h3>
                                {selectedAddonIds.size > 0 && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                                        {selectedAddonIds.size} selecionado{selectedAddonIds.size > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {availableAddons.map(addon => {
                                    const isChecked = selectedAddonIds.has(Number(addon.id));
                                    return (
                                        <label
                                            key={addon.id}
                                            className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                                                isChecked
                                                    ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-400 text-orange-950 font-bold'
                                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleAddonToggle(Number(addon.id))}
                                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm">{addon.name}</span>
                                            </div>
                                            {Number(addon.price) > 0 ? (
                                                <span className="text-xs font-bold text-gray-600">
                                                    + R$ {Number(addon.price).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-green-600">
                                                    Grátis
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
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
                            placeholder="Ex: Sem cebola, caprichar no molho..."
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
                        disabled={!isItemsValid || !isAllValid()}
                        className={`font-bold px-6 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 ${
                            isItemsValid && isAllValid()
                                ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-xl active:scale-95'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {isItemsValid && isAllValid() ? 'Adicionar ao Carrinho' : 'Selecione as opções'}
                    </button>
                </div>
            </div>
        </div>
    );
};
