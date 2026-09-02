import React, { useEffect, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { fetchPopularItems } from '../services/databaseService';
import type { MenuItem } from '../types';
import OptimizedImage from './OptimizedImage';

const DRINK_KEYWORDS = ['suco', 'refrigerante', 'coca', 'fanta', 'água', 'cerveja', 'guaraná', 'mate', 'chá'];

const isDrink = (item: { name: string; description: string }) => {
    const text = `${item.name} ${item.description}`.toLowerCase();
    return DRINK_KEYWORDS.some(keyword => text.includes(keyword));
};

export const CartUpsellSuggestions: React.FC<{ restaurantId: number }> = ({ restaurantId }) => {
    const { addToCart, cartItems } = useCart();
    const [suggestions, setSuggestions] = useState<MenuItem[]>([]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            // Fetch a larger pool to allow for better filtering and randomness
            const allItems = await fetchPopularItems(restaurantId, 50);
            
            const cartHasFood = cartItems.some(item => !isDrink(item));
            
            // Filter candidates based on whether the cart has food (suggest drinks) or not (suggest food)
            let candidates = allItems.filter(item => {
                const itemIsDrink = isDrink(item);
                return cartHasFood ? itemIsDrink : !itemIsDrink;
            });

            // Filter out items already in cart
            candidates = candidates.filter(item => 
                !cartItems.some(cartItem => cartItem.name === item.name)
            );

            // Randomize candidates
            candidates.sort(() => 0.5 - Math.random());

            setSuggestions(candidates.slice(0, 3));
        };
        fetchSuggestions();
    }, [restaurantId, cartItems]);

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
                            onClick={() => addToCart(item)}
                            className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded hover:bg-orange-200"
                        >
                            Adicionar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
