import React, { useState, useEffect } from 'react';
import type { FeaturedPromo, Restaurant } from '../types';
import { fetchFeaturedPromos } from '../services/databaseService';
import OptimizedImage from './OptimizedImage';
import { FeaturedPromoModal } from './FeaturedPromoModal';

interface RestaurantPromotionalBannerProps {
    restaurant: Restaurant;
    isOpen?: boolean;
}

export const RestaurantPromotionalBanner: React.FC<RestaurantPromotionalBannerProps> = ({ 
    restaurant,
    isOpen = true
}) => {
    const [promos, setPromos] = useState<FeaturedPromo[]>([]);
    const [selectedPromo, setSelectedPromo] = useState<FeaturedPromo | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadPromos = async () => {
            try {
                // Fetch only active promos for this specific restaurant
                const activePromos = await fetchFeaturedPromos(restaurant.id, true);
                if (isMounted) {
                    setPromos(activePromos);
                }
            } catch (err) {
                console.error("Erro ao buscar promoções do restaurante:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadPromos();

        return () => {
            isMounted = false;
        };
    }, [restaurant.id]);

    if (isLoading || promos.length === 0) {
        return null;
    }

    const handleOpenPromo = (promo: FeaturedPromo) => {
        setSelectedPromo(promo);
        setIsModalOpen(true);
    };

    return (
        <div className="w-full px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">
                        Promoções em Destaque
                    </h3>
                </div>
                <span className="text-[11px] font-black text-orange-600 uppercase bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                    Oferta Especial
                </span>
            </div>

            <div className={`grid gap-4 ${promos.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {promos.map(promo => (
                    <div 
                        key={promo.id}
                        onClick={() => handleOpenPromo(promo)}
                        className="relative bg-gradient-to-r from-orange-950 via-gray-900 to-gray-950 rounded-2xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer group transition-all duration-300 border border-orange-500/30 flex flex-col sm:flex-row hover:border-orange-500"
                    >
                        {/* Imagem */}
                        <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden flex-shrink-0 bg-gray-800">
                            <OptimizedImage 
                                src={promo.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'} 
                                alt={promo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/25"></div>
                            <div className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                                Destaque
                            </div>
                            {promo.includeFreeDelivery && (
                                <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
                                    🛵 Frete Grátis
                                </div>
                            )}
                        </div>

                        {/* Detalhes */}
                        <div className="sm:w-3/5 p-4 sm:p-5 flex flex-col justify-between text-white space-y-3">
                            <div>
                                <h4 className="text-base sm:text-lg font-black leading-snug group-hover:text-orange-400 transition-colors">
                                    {promo.title}
                                </h4>
                                {promo.description && (
                                    <p className="text-xs text-gray-300 line-clamp-2 mt-1.5 leading-relaxed">
                                        {promo.description}
                                    </p>
                                )}
                                {promo.itemIds && promo.itemIds.length > 0 && (
                                    <p className="text-[11px] font-semibold text-orange-300/90 mt-2">
                                        ✨ {promo.itemIds.length} {promo.itemIds.length === 1 ? 'item participante' : 'itens participantes para escolher'}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                                <div>
                                    <span className="text-[10px] text-gray-400 block font-medium">Preço do Combo</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-orange-400">
                                            R$ {promo.fixedPrice.toFixed(2)}
                                        </span>
                                        {promo.originalPrice && promo.originalPrice > promo.fixedPrice && (
                                            <span className="text-xs text-gray-400 line-through">
                                                R$ {promo.originalPrice.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-md shadow-orange-600/30 group-hover:scale-105 transition-all flex items-center gap-1"
                                >
                                    <span>Pedir</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Escolha e Adição ao Carrinho */}
            <FeaturedPromoModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedPromo(null);
                }}
                promo={selectedPromo}
                restaurant={restaurant}
            />
        </div>
    );
};
