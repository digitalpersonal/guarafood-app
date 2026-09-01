import React, { useState, useEffect } from 'react';
import type { Banner, FeaturedPromo, Restaurant } from '../types';
import { fetchActiveBanners, fetchFeaturedPromos, fetchRestaurants } from '../services/databaseService';
import OptimizedImage from './OptimizedImage';
import { FeaturedPromoModal } from './FeaturedPromoModal';

interface HomePromotionalBannerProps {
    onBannerClick: (targetType: 'restaurant' | 'category', targetValue: string) => void;
}

const HomePromotionalBanner: React.FC<HomePromotionalBannerProps> = ({ onBannerClick }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [featuredPromos, setFeaturedPromos] = useState<FeaturedPromo[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal state for featured promo
    const [selectedPromo, setSelectedPromo] = useState<FeaturedPromo | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [activeBanners, promos, rests] = await Promise.all([
                    fetchActiveBanners(),
                    fetchFeaturedPromos(),
                    fetchRestaurants()
                ]);
                setBanners(activeBanners);
                setFeaturedPromos(promos);
                setRestaurants(rests);
            } catch (err) {
                console.error('Erro ao carregar banners e promoções:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    if (isLoading) {
        return <div className="w-full h-56 sm:h-64 bg-gray-200 animate-pulse"></div>;
    }

    const defaultBanner: Banner = {
        id: 0,
        title: "Sua fome pede,\nGuaraFood entrega.",
        description: "Uma praça de alimentação completa na palma de sua mão!",
        imageUrl: "https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        ctaText: "",
        targetType: 'category',
        targetValue: 'Todos'
    };

    const renderStyledTitle = (title: string) => {
        if (title.includes('GuaraFood')) {
            const parts = title.split('GuaraFood');
            return (
                <>
                    {parts[0]}
                    Guara<span className="text-orange-600">Food</span>
                    {parts[1]}
                </>
            );
        }
        return title;
    };

    const handlePromoClick = (promo: FeaturedPromo) => {
        const rest = restaurants.find(r => r.id === promo.restaurantId) || null;
        setSelectedPromo(promo);
        setSelectedRestaurant(rest);
        setIsPromoModalOpen(true);
    };

    return (
        <div className="w-full space-y-4 mb-4">
            {/* Featured Promos Banner Section (Destaques da Promoção) */}
            {featuredPromos.length > 0 && (
                <div className="w-full px-4 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            🔥 Destaques e Combos Especiais
                        </h3>
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Oferta Limitada</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featuredPromos.map(promo => {
                            const rest = restaurants.find(r => r.id === promo.restaurantId);
                            return (
                                <div 
                                    key={promo.id}
                                    onClick={() => handlePromoClick(promo)}
                                    className="relative bg-gradient-to-r from-orange-900 to-gray-900 rounded-2xl overflow-hidden shadow-lg cursor-pointer group hover:scale-[1.01] transition-all duration-300 border border-orange-500/30 flex flex-col sm:flex-row"
                                >
                                    <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden">
                                        <OptimizedImage 
                                            src={promo.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'} 
                                            alt={promo.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/20"></div>
                                    </div>
                                    <div className="sm:w-3/5 p-5 flex flex-col justify-between text-white space-y-2">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="bg-orange-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                                                    Combo Especial
                                                </span>
                                                {promo.includeFreeDelivery && (
                                                    <span className="text-[10px] text-green-300 font-bold flex items-center gap-1">
                                                        🛵 Frete Grátis
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-black leading-snug group-hover:text-orange-400 transition-colors">{promo.title}</h4>
                                            <p className="text-xs text-gray-300 line-clamp-2 mt-1">{promo.description}</p>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                            <div>
                                                <span className="text-[10px] text-gray-400 block">Por apenas</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-black text-orange-400">R$ {promo.fixedPrice.toFixed(2)}</span>
                                                    {promo.originalPrice && (
                                                        <span className="text-xs text-gray-400 line-through">R$ {promo.originalPrice.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {rest && (
                                                <span className="text-[11px] font-bold text-gray-300 bg-white/10 px-2.5 py-1 rounded-lg">
                                                    {rest.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Standard Main Banner */}
            <div className="w-full overflow-hidden border-b border-gray-100">
                <div
                    onClick={() => onBannerClick(defaultBanner.targetType, defaultBanner.targetValue)}
                    className="relative cursor-pointer group bg-gray-900 min-h-[16rem] sm:min-h-[20rem] flex items-center justify-center overflow-hidden"
                >
                    <div className="absolute inset-0">
                        <OptimizedImage 
                            src={defaultBanner.imageUrl} 
                            alt={defaultBanner.title} 
                            priority={true}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 z-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10"></div>
                    </div>

                    <div className="relative p-6 sm:p-12 text-white z-20 flex flex-col items-center text-center max-w-3xl">
                        <div className="transform transition-all duration-500">
                            <h2 className="text-4xl sm:text-6xl font-black leading-tight drop-shadow-2xl tracking-tighter whitespace-pre-line mb-4">
                                {renderStyledTitle(defaultBanner.title)}
                            </h2>
                            <div className="h-1 w-20 bg-orange-600 mb-6 rounded-full mx-auto"></div>
                            <p className="text-base sm:text-xl text-gray-100 font-bold drop-shadow-lg opacity-95 max-w-xl leading-relaxed">
                                {defaultBanner.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Promo Modal */}
            <FeaturedPromoModal 
                isOpen={isPromoModalOpen}
                onClose={() => setIsPromoModalOpen(false)}
                promo={selectedPromo}
                restaurant={selectedRestaurant}
            />
        </div>
    );
};

export default HomePromotionalBanner;
