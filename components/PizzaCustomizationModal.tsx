
import React, { useState, useMemo, useEffect } from 'react';
import type { MenuItem, Addon, CartItem, SizeOption } from '../types';

interface PizzaCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (customizedPizza: CartItem) => void;
    initialPizza: MenuItem;
    allPizzas: MenuItem[];
    allAddons: Addon[];
}

const PizzaCustomizationModal: React.FC<PizzaCustomizationModalProps> = ({
    isOpen,
    onClose,
    onAddToCart,
    initialPizza,
    allPizzas,
    allAddons,
}) => {
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [firstHalf, setFirstHalf] = useState<MenuItem>(initialPizza);
    const [secondHalf, setSecondHalf] = useState<MenuItem | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
    const [showSecondHalfSelector, setShowSecondHalfSelector] = useState(false);

    useEffect(() => {
        setFirstHalf(initialPizza);
        // Set default size if available
        if (initialPizza.sizes && initialPizza.sizes.length > 0) {
            setSelectedSize(initialPizza.sizes[0]);
        } else {
            setSelectedSize({ name: 'Único', price: initialPizza.price });
        }
        setSecondHalf(null);
        setSelectedAddonIds(new Set());
        setShowSecondHalfSelector(false);
    }, [initialPizza, isOpen]);

    const availableAddons = useMemo(() => {
        return allAddons.filter(addon => firstHalf.availableAddonIds?.includes(addon.id));
    }, [allAddons, firstHalf]);

    const { totalPrice, basePrice } = useMemo(() => {
        if (!selectedSize) return { basePrice: 0, totalPrice: 0 };
        
        const getPriceForSize = (pizza: MenuItem, sizeName: string): number => {
            const sizeOption = pizza.sizes?.find(s => s.name === sizeName);
            return sizeOption ? sizeOption.price : pizza.price;
        };

        const firstHalfPrice = getPriceForSize(firstHalf, selectedSize.name);
        const secondHalfPrice = secondHalf ? getPriceForSize(secondHalf, selectedSize.name) : 0;
        
        const pizzaPrice = secondHalf ? Math.max(firstHalfPrice, secondHalfPrice) : firstHalfPrice;
        
        // FIX: The original reduce implementation had a potential type inference issue.
        // This was refactored to filter addons first, creating a cleaner and safer calculation
        // that prevents the 'Operator '+' cannot be applied to types 'number' and 'unknown'' error.
        const addonsPrice = allAddons
            .filter(addon => selectedAddonIds.has(addon.id))
            .reduce((total, addon) => total + addon.price, 0);

        return { basePrice: pizzaPrice, totalPrice: pizzaPrice + addonsPrice };
    }, [firstHalf, secondHalf, selectedAddonIds, allAddons, selectedSize]);
    
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

    const handleSelectSecondHalf = (pizza: MenuItem) => {
        setSecondHalf(pizza);
        setShowSecondHalfSelector(false);
    };
    
    const handleAddToCartClick = () => {
        if (!selectedSize) {
            alert("Por favor, selecione um tamanho.");
            return;
        }

        const halves = secondHalf ? [
            { name: firstHalf.name, price: firstHalf.price },
            { name: secondHalf.name, price: secondHalf.price }
        ] : [{ name: firstHalf.name, price: firstHalf.price }];

        const selectedAddons = allAddons.filter(a => selectedAddonIds.has(a.id));
        
        const name = secondHalf
            ? `Pizza Meia ${firstHalf.name} / Meia ${secondHalf.name}`
            : `Pizza ${firstHalf.name}`;

        const sortedHalfIds = secondHalf ? [firstHalf.id, secondHalf.id].sort() : [firstHalf.id];
        const sortedAddonIds = Array.from(selectedAddonIds).sort();
        const cartId = `pizza-${sortedHalfIds.join('-')}_size-${selectedSize.name}_addons-${sortedAddonIds.join('-')}`;
        
        const customizedPizza: CartItem = {
            id: cartId,
            name,
            price: totalPrice,
            basePrice,
            imageUrl: firstHalf.imageUrl,
            quantity: 1,
            description: secondHalf ? 'Pizza com dois sabores' : firstHalf.description,
            halves,
            selectedAddons,
            sizeName: selectedSize.name,
        };
        
        onAddToCart(customizedPizza);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Monte sua Pizza</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4">
                     {/* --- SIZE SELECTOR --- */}
                    {initialPizza.sizes && initialPizza.sizes.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2">1. Escolha o Tamanho</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {initialPizza.sizes.map(size => (
                                    <label key={size.name} className="flex flex-col items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                        <input
                                            type="radio"
                                            name="pizza-size"
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
                    
                    {/* --- FLAVORS --- */}
                     <div>
                        <h3 className="font-bold mb-2">2. Escolha o(s) Sabor(es)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Half */}
                            <div className="border rounded-lg p-3">
                                <h3 className="font-bold text-center text-gray-600 text-sm mb-2">1ª Metade</h3>
                                <div className="flex items-center space-x-3">
                                    <img src={firstHalf.imageUrl} alt={firstHalf.name} className="w-14 h-14 rounded-md object-cover"/>
                                    <div>
                                        <p className="font-semibold">{firstHalf.name}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Second Half */}
                            <div className="border rounded-lg p-3 flex flex-col justify-center items-center">
                                <h3 className="font-bold text-center text-gray-600 text-sm mb-2">2ª Metade</h3>
                                {secondHalf ? (
                                    <div className="w-full">
                                        <div className="flex items-center space-x-3">
                                            <img src={secondHalf.imageUrl} alt={secondHalf.name} className="w-14 h-14 rounded-md object-cover"/>
                                            <div className="flex-grow">
                                                <p className="font-semibold">{secondHalf.name}</p>
                                            </div>
                                            <button onClick={() => setSecondHalf(null)} className="text-red-500 hover:text-red-700 text-xl font-bold p-1">&times;</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSecondHalfSelector(true)} className="w-full text-center text-orange-600 font-semibold border-2 border-dashed border-gray-300 rounded-lg py-4 hover:bg-orange-50">
                                        + Escolher outro sabor
                                    </button>
                                )}
                            </div>
                        </div>
                     </div>
                    
                    {/* --- SECOND HALF SELECTOR --- */}
                    {showSecondHalfSelector && (
                        <div>
                            <h3 className="font-bold mb-2">Escolha o segundo sabor:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                                {allPizzas.filter(p => p.id !== firstHalf.id).map(pizza => (
                                    <div key={pizza.id} onClick={() => handleSelectSecondHalf(pizza)} className="p-2 flex items-center space-x-3 rounded-md hover:bg-gray-200 cursor-pointer">
                                        <img src={pizza.imageUrl} alt={pizza.name} className="w-10 h-10 rounded-md object-cover"/>
                                        <span className="font-semibold text-sm">{pizza.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* --- ADDONS --- */}
                    {availableAddons.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2">3. Adicionais (Opcional)</h3>
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
                                        {addon.price > 0 && <span className="font-semibold text-gray-600">+ R$ {addon.price.toFixed(2)}</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- FOOTER --- */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
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

export default PizzaCustomizationModal;