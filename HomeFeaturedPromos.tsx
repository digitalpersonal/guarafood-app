import React, { useState, useEffect } from 'react';
import type { FeaturedPromo, Restaurant } from '../types';
import { fetchFeaturedPromos } from '../services/databaseService';
import { isPromoActiveToday, formatPromoDays, DAYS_OF_WEEK } from '../utils/promoUtils';
import OptimizedImage from './OptimizedImage';

interface HomeFeaturedPromosProps {
    restaurants: Restaurant[];
    onSelectRestaurant: (restaurant: Restaurant) => void;
}

export const HomeFeaturedPromos: React.FC<HomeFeaturedPromosProps> = ({
    restaurants,
    onSelectRestaurant
}) => {
    const [promos, setPromos] = useState<FeaturedPromo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadPromos = async () => {
            try {
                // Busca todas as promoções ativas cadastradas pelos estabelecimentos
                const allActive = await fetchFeaturedPromos(undefined, true);
                
                // Filtra apenas as promoções que estão ativas no dia da semana de HOJE
                const activeToday = allActive.filter(p => isPromoActiveToday(p));
                
                // Embaralha sempre em ordem aleatória (Fisher-Yates) para exibição dinâmica e justa na tela inicial
                const shuffled = [...activeToday];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                
                if (isMounted) {
                    setPromos(shuffled);
                }
            } catch (err) {
                console.warn('Erro ao carregar promoções ativas na tela inicial:', err);
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
    }, []);

    if (isLoading || promos.length === 0) {
        return null;
    }

    // Vincula a promoção ao restaurante cadastrado
    const validPromosWithRestaurant = promos
        .map(promo => {
            const restaurant = restaurants.find(r => r.id === promo.restaurantId && r.active !== false);
            return { promo, restaurant };
        })
        .filter((item): item is { promo: FeaturedPromo; restaurant: Restaurant } => item.restaurant !== undefined);

    if (validPromosWithRestaurant.length === 0) {
        return null;
    }

    const currentDayIndex = new Date().getDay();
    const currentDayName = DAYS_OF_WEEK[currentDayIndex]?.name || 'Hoje';

    return (
        <section className="w-full px-4 pt-2 pb-6 border-b border-gray-100 bg-gradient-to-b from-orange-50/40 via-white to-white">
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                            Super Promoções de Hoje
                        </h2>
                        <p className="text-[11px] text-gray-500 font-medium">
                            Ofertas especiais válidas para {currentDayName}
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-full border border-orange-200">
                    Hoje Ativo
                </span>
            </div>

            {/* Carrossel horizontal de promoções do dia */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 scroll-smooth">
                {validPromosWithRestaurant.map(({ promo, restaurant }) => {
                    const discountPercent = promo.originalPrice && promo.originalPrice > promo.fixedPrice
                        ? Math.round(((promo.originalPrice - promo.fixedPrice) / promo.originalPrice) * 100)
                        : null;

                    return (
                        <div
                            key={promo.id}
                            onClick={() => onSelectRestaurant(restaurant)}
                            className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col group relative"
                        >
                            {/* Imagem do Produto Promocional */}
                            <div className="relative h-36 bg-gray-900 overflow-hidden">
                                <OptimizedImage
                                    src={promo.imageUrl || restaurant.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'}
                                    alt={promo.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                {/* Tag Dias de Validade (ex: Segunda a Quinta) */}
                                <div className="absolute top-2.5 left-2.5 bg-gray-950/85 backdrop-blur-sm text-orange-300 border border-orange-500/30 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                    <span>🗓️</span>
                                    <span>{formatPromoDays(promo.availableDays)}</span>
                                </div>

                                {discountPercent && (
                                    <div className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                                        -{discountPercent}%
                                    </div>
                                )}

                                {promo.includeFreeDelivery && (
                                    <div className="absolute bottom-2.5 left-2.5 bg-emerald-600/95 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                        🛵 Frete Grátis
                                    </div>
                                )}
                            </div>

                            {/* Conteúdo do Card */}
                            <div className="p-3.5 flex flex-col justify-between flex-grow space-y-2">
                                <div>
                                    {/* Nome do Restaurante com Logo */}
                                    <div className="flex items-center gap-1.5 mb-1 text-gray-500 text-xs">
                                        <OptimizedImage
                                            src={restaurant.imageUrl}
                                            alt={restaurant.name}
                                            className="w-4 h-4 rounded-full object-cover border border-gray-200"
                                        />
                                        <span className="font-bold text-gray-700 truncate">{restaurant.name}</span>
                                    </div>

                                    <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-orange-600 transition-colors">
                                        {promo.title}
                                    </h3>

                                    {promo.description && (
                                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                                            {promo.description}
                                        </p>
                                    )}
                                </div>

                                {/* Preço e Botão */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block font-medium">Preço Especial</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-base font-black text-orange-600">
                                                R$ {promo.fixedPrice.toFixed(2)}
                                            </span>
                                            {promo.originalPrice && promo.originalPrice > promo.fixedPrice && (
                                                <span className="text-[11px] text-gray-400 line-through">
                                                    R$ {promo.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="bg-orange-600 group-hover:bg-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1"
                                    >
                                        <span>Pedir</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
