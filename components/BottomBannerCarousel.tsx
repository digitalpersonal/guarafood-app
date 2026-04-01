import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchActiveBanners } from '../services/databaseService';
import type { Banner } from '../types';

interface BottomBannerCarouselProps {
    isVisible: boolean;
}

const BottomBannerCarousel: React.FC<BottomBannerCarouselProps> = ({ isVisible }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const loadBanners = async () => {
            try {
                const allBanners = await fetchActiveBanners();
                // Filter for bottom banners and shuffle them
                const bottomBanners = allBanners
                    .filter(b => b.type === 'bottom')
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 6); // Limit to 6 as requested

                setBanners(bottomBanners);
            } catch (err) {
                console.error('Error loading bottom banners:', err);
            }
        };

        if (isVisible) {
            loadBanners();
        }
    }, [isVisible]);

    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000); // Rotate every 5 seconds

        return () => clearInterval(interval);
    }, [banners]);

    useEffect(() => {
        if (isVisible && banners.length > 0) {
            document.documentElement.style.setProperty('--bottom-banner-height', '50px');
        } else {
            document.documentElement.style.setProperty('--bottom-banner-height', '0px');
        }
        return () => {
            document.documentElement.style.setProperty('--bottom-banner-height', '0px');
        };
    }, [isVisible, banners.length]);

    if (!isVisible || banners.length === 0) return null;

    const currentBanner = banners[currentIndex];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[90] pointer-events-none">
            <div className="max-w-7xl mx-auto w-full pointer-events-auto bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-hidden h-[50px] safe-bottom">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentBanner.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full flex items-center justify-center cursor-pointer"
                        onClick={() => {
                            if (currentBanner.targetValue) {
                                // Handle navigation if needed, but for now just a professional display
                                window.location.href = currentBanner.targetType === 'restaurant' 
                                    ? `#/restaurant/${encodeURIComponent(currentBanner.targetValue)}`
                                    : `#/category/${encodeURIComponent(currentBanner.targetValue)}`;
                            }
                        }}
                    >
                        <img 
                            src={currentBanner.imageUrl} 
                            alt={currentBanner.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BottomBannerCarousel;
