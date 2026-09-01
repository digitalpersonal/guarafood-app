import React, { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';

interface SuggestionItem {
    name: string;
    description: string;
    price: number;
    category: string;
}

interface ProductSuggestionsProps {
    itemName: string;
    itemDescription?: string;
    restaurantId?: number;
}

export const ProductSuggestions: React.FC<ProductSuggestionsProps> = ({ itemName, itemDescription, restaurantId }) => {
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [addedIds, setAddedIds] = useState<{ [key: string]: boolean }>({});
    const { addToCart } = useCart();
    const { addToast } = useNotification();

    useEffect(() => {
        let isMounted = true;
        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/product-suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemName, itemDescription })
                });
                if (!res.ok) throw new Error('Falha ao carregar sugestões');
                const data = await res.json();
                if (isMounted && data.suggestions) {
                    setSuggestions(data.suggestions);
                }
            } catch (err) {
                console.error("Error fetching AI suggestions:", err);
                if (isMounted) {
                    setSuggestions([
                        { name: "Coca-Cola 2L", description: "Refrigerante gelado 2 litros", price: 14.00, category: "Bebidas" },
                        { name: "Pudim de Leite", description: "Fatia generosa de pudim caseiro", price: 10.00, category: "Sobremesas" }
                    ]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (itemName) {
            fetchSuggestions();
        }

        return () => {
            isMounted = false;
        };
    }, [itemName, itemDescription]);

    const handleAddSuggestion = (sug: SuggestionItem, index: number) => {
        const cartItemPayload = {
            id: `sug-${Date.now()}-${index}`,
            restaurantId,
            name: sug.name,
            price: sug.price,
            basePrice: sug.price,
            quantity: 1,
            description: sug.description
        };

        const success = addToCart(cartItemPayload as any);
        if (success) {
            setAddedIds(prev => ({ ...prev, [index]: true }));
            addToast({ message: `"${sug.name}" adicionado ao carrinho!`, type: 'success' });
            setTimeout(() => {
                setAddedIds(prev => ({ ...prev, [index]: false }));
            }, 2000);
        }
    };

    if (loading) {
        return (
            <div className="py-4 border-t border-gray-100 mt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    ✨ Sugestões Inteligentes com IA
                </h4>
                <div className="flex justify-center py-4"><Spinner /></div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="py-4 border-t border-gray-100 mt-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    ✨ Quem pediu <span className="text-orange-600 font-extrabold">{itemName}</span> também pediu:
                </h4>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black">Combinam Perfeitamente</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((sug, idx) => {
                    const isAdded = addedIds[idx];
                    return (
                        <div key={idx} className="p-3 bg-orange-50/60 rounded-xl border border-orange-100/80 flex items-center justify-between gap-3 transition-all hover:bg-orange-50">
                            <div className="min-w-0 flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] bg-orange-200 text-orange-800 font-black px-1.5 py-0.5 rounded uppercase">{sug.category}</span>
                                    <h5 className="text-xs font-bold text-gray-900 truncate">{sug.name}</h5>
                                </div>
                                <p className="text-[11px] text-gray-500 truncate mt-0.5">{sug.description}</p>
                                <span className="text-xs font-black text-orange-600 mt-1 block">R$ {Number(sug.price).toFixed(2)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAddSuggestion(sug, idx)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1 ${
                                    isAdded 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                                }`}
                            >
                                {isAdded ? '✓ Adicionado' : '+ Adicionar'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
