import React, { useState, useEffect } from 'react';
import type { Banner } from '../types';
import { fetchActiveBanners } from '../services/databaseService';
import OptimizedImage from './OptimizedImage';

interface HomePromotionalBannerProps {
    onBannerClick: (targetType: 'restaurant' | 'category', targetValue: string) => void;
}

const HomePromotionalBanner: React.FC<HomePromotionalBannerProps> = ({ onBannerClick }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const activeBanners = await fetchActiveBanners();
                setBanners(activeBanners);
            } catch (err) {
                console.error('Erro ao carregar banners:', err);
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

    const displayBanners = banners.length > 0 ? banners : [defaultBanner];

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

    return (
        <div className="w-full mb-4">
            {/* Standard Main Banner */}
            <div className="w-full overflow-hidden border-b border-gray-100">
                {displayBanners.map(banner => (
                    <div
                        key={banner.id}
                        onClick={() => onBannerClick(banner.targetType, banner.targetValue)}
                        className="relative cursor-pointer group bg-gray-900 min-h-[16rem] sm:min-h-[20rem] flex items-center justify-center overflow-hidden"
                    >
                        <div className="absolute inset-0">
                            <OptimizedImage 
                                src={banner.imageUrl} 
                                alt={banner.title} 
                                priority={true}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 z-10"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10"></div>
                        </div>

                        <div className="relative p-6 sm:p-12 text-white z-20 flex flex-col items-center text-center max-w-3xl">
                            <div className="transform transition-all duration-500">
                                <h2 className="text-4xl sm:text-6xl font-black leading-tight drop-shadow-2xl tracking-tighter whitespace-pre-line mb-4">
                                    {renderStyledTitle(banner.title)}
                                </h2>
                                <div className="h-1 w-20 bg-orange-600 mb-6 rounded-full mx-auto"></div>
                                <p className="text-base sm:text-xl text-gray-100 font-bold drop-shadow-lg opacity-95 max-w-xl leading-relaxed">
                                    {banner.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomePromotionalBanner;
