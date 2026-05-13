import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAds } from '../services/databaseService';

interface Ad {
    id: string;
    image_url: string;
    link_url?: string;
    alt_text: string;
}

const AdRotator: React.FC = () => {
    const [ads, setAds] = useState<Ad[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAds = async () => {
            try {
                const data = await fetchAds(true);
                if (data && data.length > 0) {
                    setAds(data);
                    // Iniciar com um anúncio aleatório
                    setCurrentIndex(Math.floor(Math.random() * data.length));
                }
            } catch (error) {
                console.error("Failed to load ads:", error);
            } finally {
                setLoading(false);
            }
        };

        loadAds();
    }, []);

    useEffect(() => {
        if (ads.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, 5000); // Troca a cada 5 segundos

        return () => clearInterval(interval);
    }, [ads]);

    if (loading || ads.length === 0) return null;

    const currentAd = ads[currentIndex];

    return (
        <div className="w-full bg-gray-50 border-t border-gray-100 py-6 overflow-hidden">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Publicidade</span>
                    
                    <div className="relative w-full aspect-[21/9] sm:aspect-[4/1] rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white group">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentAd.id}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.8, ease: "circOut" }}
                                className="absolute inset-0"
                            >
                                {currentAd.link_url ? (
                                    <a href={currentAd.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                        <img 
                                            src={currentAd.image_url} 
                                            alt={currentAd.alt_text}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            referrerPolicy="no-referrer"
                                        />
                                    </a>
                                ) : (
                                    <img 
                                        src={currentAd.image_url} 
                                        alt={currentAd.alt_text}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdRotator;
