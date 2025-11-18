
import React, { useState, useEffect } from 'react';
import type { Banner } from '../types';
import { fetchActiveBanners } from '../services/databaseService';

interface HomePromotionalBannerProps {
    onBannerClick: (targetType: 'restaurant' | 'category', targetValue: string) => void;
}

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
);


const HomePromotionalBanner: React.FC<HomePromotionalBannerProps> = ({ onBannerClick }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    useEffect(() => {
        const loadBanners = async () => {
            try {
                const activeBanners = await fetchActiveBanners();
                setBanners(activeBanners);
            } catch (err) {
                setError('Não foi possível carregar as promoções.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadBanners();
    }, []);

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
        );
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    if (banners.length === 0) {
        return null;
    }

    const banner = banners[0];

    return (
        <div className="p-4">
            <div
                onClick={() => onBannerClick(banner.targetType, banner.targetValue)}
                className="relative rounded-xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-gray-100 min-h-[12rem]"
            >
                 {/* Skeleton for image */}
                 {!isImageLoaded && (
                    <div className="absolute inset-0 bg-gray-300 animate-pulse z-0" />
                )}

                <div className="absolute inset-0">
                    <img 
                        src={banner.imageUrl} 
                        alt={banner.title} 
                        loading="lazy" 
                        decoding="async"
                        onLoad={() => setIsImageLoaded(true)}
                        className={`w-full h-full object-cover transition-opacity duration-700 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
                </div>

                <div className="relative p-8 text-white min-h-[12rem] flex flex-col justify-end items-start z-10">
                    <h2 className="text-3xl font-extrabold drop-shadow-md">{banner.title}</h2>
                    <p className="mt-2 max-w-md text-gray-200 drop-shadow-sm">{banner.description}</p>
                    <div className="mt-4">
                        <span className="inline-flex items-center gap-2 bg-orange-600 text-white font-bold py-2 px-5 rounded-full group-hover:bg-orange-500 transition-colors">
                            {banner.ctaText}
                            <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePromotionalBanner;
