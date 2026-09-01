import React, { useState, useEffect } from 'react';
import type { FeaturedPromo, MenuItem, MenuCategory, Restaurant } from '../types';
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
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToCart } = useCart();
    const { addToast } = useNotification();

    useEffect(() => {
        if (isOpen && promo && restaurant) {
            setIsLoading(true);
            fetchMenuForRestaurant(restaurant.id)
                .then(cats => {
                    setMenuCategories(cats);
                    if (promo.itemIds && promo.itemIds.length > 0) {
                        setSelectedItemId(promo.itemIds[0]);
                    }
                })
                .catch(err => console.error("Error loading menu for promo modal:", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, promo, restaurant]);

    if (!isOpen || !promo) return null;

    // Flatten all items across categories to find participating items
    const allItems: MenuItem[] = menuCategories.flatMap(cat => cat.items || []);
    const participatingItems = allItems.filter(item => promo.itemIds.includes(item.id));

    const handleAddToCart = () => {
        if (!restaurant) return;
        const selectedItem = participatingItems.find(i => i.id === selectedItemId);
        const itemNameSuffix = selectedItem ? ` (${selectedItem.name})` : '';

        const cartItemPayload = {
            id: `featured-promo-${promo.id}-${selectedItemId || 'gen'}`,
            restaurantId: restaurant.id,
            name: `${promo.title}${itemNameSuffix}`,
            price: promo.fixedPrice,
            basePrice: promo.fixedPrice,
            imageUrl: promo.imageUrl || (selectedItem ? selectedItem.imageUrl : ''),
            quantity: 1,
            description: promo.description,
            originalPrice: promo.originalPrice,
            promotionName: promo.title,
            notes: notes ? `Opção escolhida: ${selectedItem?.name || 'Padrão'} | Obs: ${notes}` : (selectedItem ? `Opção escolhida: ${selectedItem.name}` : undefined)
        };

        const success = addToCart(cartItemPayload as any);
        if (success) {
            addToast({ message: 'Combo promocional adicionado ao carrinho!', type: 'success' });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header Image */}
                <div className="relative h-56 bg-orange-100">
                    <OptimizedImage 
                        src={promo.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'} 
                        alt={promo.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                        <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-max mb-2 shadow-sm">
                            Destaque Promocional
                        </span>
                        <h2 className="text-2xl font-black">{promo.title}</h2>
                        {promo.includeFreeDelivery && (
                            <span className="text-xs text-green-300 font-bold mt-1 flex items-center gap-1">
                                🛵 Entrega Grátis inclusa!
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-grow">
                    <p className="text-gray-600 text-sm leading-relaxed">{promo.description}</p>

                    <div className="flex items-baseline gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <span className="text-xs text-gray-500 font-medium">Preço Promocional:</span>
                        <span className="text-3xl font-black text-orange-600">R$ {promo.fixedPrice.toFixed(2)}</span>
                        {promo.originalPrice && promo.originalPrice > promo.fixedPrice && (
                            <span className="text-sm text-gray-400 line-through">R$ {promo.originalPrice.toFixed(2)}</span>
                        )}
                    </div>

                    {/* Participating items selection */}
                    {participatingItems.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                Escolha 1 opção participante:
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

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Observações para o Combo (Opcional)
                        </label>
                        <input 
                            type="text" 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ex: Sem cebola, caprichar na borda..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-4">
                    <div>
                        <span className="text-xs text-gray-500 block">Total do Combo</span>
                        <span className="text-xl font-black text-gray-900">R$ {promo.fixedPrice.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleAddToCart}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center gap-2"
                    >
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    );
};
