import React, { useEffect, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { fetchPopularItems, fetchAddonsForRestaurant, fetchMenuForRestaurant } from '../services/databaseService';
import type { MenuItem, Addon, CartItem, MenuCategory } from '../types';
import OptimizedImage from './OptimizedImage';
import PizzaCustomizationModal from './PizzaCustomizationModal';
import AcaiCustomizationModal from './AcaiCustomizationModal';
import GenericCustomizationModal from './GenericCustomizationModal';

const DRINK_KEYWORDS = ['suco', 'refrigerante', 'coca', 'fanta', 'água', 'cerveja', 'guaraná', 'mate', 'chá'];

const isDrink = (item: { name: string; description: string }) => {
    const text = `${item.name} ${item.description}`.toLowerCase();
    return DRINK_KEYWORDS.some(keyword => text.includes(keyword));
};

export const CartUpsellSuggestions: React.FC<{ restaurantId: number }> = ({ restaurantId }) => {
    const { addToCart, cartItems } = useCart();
    const [suggestions, setSuggestions] = useState<MenuItem[]>([]);
    const [allAddons, setAllAddons] = useState<Addon[]>([]);
    const [allPizzas, setAllPizzas] = useState<MenuItem[]>([]);
    
    const [isPizzaModalOpen, setIsPizzaModalOpen] = useState(false);
    const [isAcaiModalOpen, setIsAcaiModalOpen] = useState(false);
    const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [allItems, addons, menu] = await Promise.all([
                fetchPopularItems(restaurantId, 50),
                fetchAddonsForRestaurant(restaurantId),
                fetchMenuForRestaurant(restaurantId)
            ]);
            
            setAllAddons(addons);
            
            // Extract pizzas
            const pizzas: MenuItem[] = [];
            menu.forEach(cat => pizzas.push(...cat.items.filter(item => item.isPizza)));
            setAllPizzas(pizzas);

            const cartHasFood = cartItems.some(item => !isDrink(item));
            
            let candidates = allItems.filter(item => {
                const itemIsDrink = isDrink(item);
                return cartHasFood ? itemIsDrink : !itemIsDrink;
            });

            candidates = candidates.filter(item => 
                !cartItems.some(cartItem => cartItem.name === item.name)
            );

            candidates.sort(() => 0.5 - Math.random());
            setSuggestions(candidates.slice(0, 3));
        };
        fetchData();
    }, [restaurantId, cartItems]);

    const handleAddToCartClick = (item: MenuItem) => {
        setSelectedItem(item);
        if (item.isPizza) {
            setIsPizzaModalOpen(true);
        } else if (item.isAcai) {
            setIsAcaiModalOpen(true);
        } else if ((item.optionGroups && item.optionGroups.length > 0) || 
                   (item.availableAddonIds && item.availableAddonIds.length > 0) || 
                   (item.sizes && item.sizes.length > 0)) {
            setIsGenericModalOpen(true);
        } else {
            addToCart(item);
        }
    };

    const handleCustomizedItemAddToCart = (customizedItem: CartItem) => {
        addToCart(customizedItem);
        setIsPizzaModalOpen(false);
        setIsAcaiModalOpen(false);
        setIsGenericModalOpen(false);
        setSelectedItem(null);
    };

    if (suggestions.length === 0) return null;

    return (
        <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Sugestões para acompanhar:</h3>
            <div className="space-y-3">
                {suggestions.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <OptimizedImage src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md" />
                            <div>
                                <p className="text-xs font-semibold">{item.name}</p>
                                <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleAddToCartClick(item)}
                            className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded hover:bg-orange-200"
                        >
                            Adicionar
                        </button>
                    </div>
                ))}
            </div>

            {selectedItem && isPizzaModalOpen && (
                <PizzaCustomizationModal
                    isOpen={isPizzaModalOpen}
                    onClose={() => setIsPizzaModalOpen(false)}
                    onAddToCart={handleCustomizedItemAddToCart}
                    initialPizza={selectedItem}
                    allPizzas={allPizzas}
                    allAddons={allAddons}
                />
            )}
            {selectedItem && isAcaiModalOpen && (
                <AcaiCustomizationModal
                    isOpen={isAcaiModalOpen}
                    onClose={() => setIsAcaiModalOpen(false)}
                    onAddToCart={handleCustomizedItemAddToCart}
                    initialItem={selectedItem}
                    allAddons={allAddons}
                />
            )}
            {selectedItem && isGenericModalOpen && (
                <GenericCustomizationModal
                    isOpen={isGenericModalOpen}
                    onClose={() => setIsGenericModalOpen(false)}
                    onAddToCart={handleCustomizedItemAddToCart}
                    initialItem={selectedItem}
                    allAddons={allAddons}
                />
            )}
        </div>
    );
};
