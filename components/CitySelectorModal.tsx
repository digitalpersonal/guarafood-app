import React, { useState } from 'react';
import type { Restaurant } from '../types';
import { KNOWN_CITIES, getDistinctCities, normalizeCityName, getCurrentUserCity, saveSelectedCity, setGpsPromptDismissed } from '../utils/locationService';
import { useNotification } from '../hooks/useNotification';

interface CitySelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCity: string;
    onCityChange: (newCity: string) => void;
    restaurants: Restaurant[];
}

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
    isOpen,
    onClose,
    currentCity,
    onCityChange,
    restaurants
}) => {
    const { addToast } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLocating, setIsLocating] = useState(false);

    if (!isOpen) return null;

    // Constrói lista única de cidades disponíveis dos restaurantes e da base regional
    const allCities = getDistinctCities(restaurants);
    KNOWN_CITIES.forEach(kc => {
        if (!allCities.some(c => normalizeCityName(c) === normalizeCityName(kc.name))) {
            allCities.push(kc.name);
        }
    });

    // Contagem de restaurantes ativos por cidade
    const cityRestaurantCounts: Record<string, number> = {};
    restaurants.forEach(r => {
        if (r.active !== false) {
            const city = (r.city || 'Guaranésia').trim();
            const normalized = normalizeCityName(city);
            cityRestaurantCounts[normalized] = (cityRestaurantCounts[normalized] || 0) + 1;
        }
    });

    const filteredCities = allCities.filter(city => 
        normalizeCityName(city).includes(normalizeCityName(searchTerm))
    );

    const handleSelectCity = (city: string) => {
        saveSelectedCity(city);
        setGpsPromptDismissed();
        onCityChange(city);
        onClose();
        addToast({
            message: `Você está visualizando restaurantes em ${city}`,
            type: 'info'
        });
    };

    const handleUseGps = async () => {
        setIsLocating(true);
        try {
            const result = await getCurrentUserCity();
            if (result.success) {
                saveSelectedCity(result.city);
                setGpsPromptDismissed();
                onCityChange(result.city);
                onClose();
                addToast({
                    message: `Localização detectada via GPS: ${result.city}`,
                    type: 'success'
                });
            } else {
                addToast({
                    message: result.error || 'Não foi possível detectar sua localização por GPS. Escolha sua cidade na lista.',
                    type: 'warning'
                });
            }
        } catch (e) {
            console.error("GPS detection error:", e);
            addToast({
                message: 'Erro ao buscar localização via GPS. Por favor, selecione sua cidade manualmente.',
                type: 'error'
            });
        } finally {
            setIsLocating(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                            <MapPinIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black leading-tight">Escolha sua Cidade</h3>
                            <p className="text-xs text-orange-100 font-medium">Veja restaurantes com entrega na sua região</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Botão de Localização Automática GPS */}
                <div className="p-4 bg-orange-50 border-b border-orange-100">
                    <button
                        onClick={handleUseGps}
                        disabled={isLocating}
                        className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition-all disabled:opacity-75"
                    >
                        {isLocating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Detectando sua localização...</span>
                            </>
                        ) : (
                            <>
                                <MapPinIcon className="w-5 h-5 animate-pulse" />
                                <span>Usar minha localização atual (GPS)</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Campo de Busca de Cidades */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar cidade (ex: Guaranésia, Guaxupé...)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm font-bold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* Lista de Cidades */}
                <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[360px]">
                    {filteredCities.map(city => {
                        const isSelected = normalizeCityName(currentCity) === normalizeCityName(city);
                        const count = cityRestaurantCounts[normalizeCityName(city)] || 0;

                        return (
                            <button
                                key={city}
                                onClick={() => handleSelectCity(city)}
                                className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all text-left ${
                                    isSelected 
                                        ? 'bg-orange-500 text-white font-black shadow-md shadow-orange-500/20' 
                                        : 'bg-gray-50 hover:bg-orange-50 text-gray-800 hover:text-orange-950 font-bold border border-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <MapPinIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-orange-600'}`} />
                                    <div>
                                        <span className="block text-sm leading-tight">{city}</span>
                                        <span className={`text-[11px] ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                                            {count > 0 ? `${count} ${count === 1 ? 'restaurante disponível' : 'restaurantes disponíveis'}` : 'Nenhum restaurante no momento'}
                                        </span>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                                        <CheckIcon className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {filteredCities.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm font-bold">Nenhuma cidade encontrada com esse nome.</p>
                            <button
                                onClick={() => handleSelectCity(searchTerm.trim())}
                                className="mt-3 text-xs text-orange-600 font-black underline"
                            >
                                Selecionar "{searchTerm.trim()}" mesmo assim
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer do Modal com opção de ver todas as cidades */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold">
                    <span>Cidade atual: <strong className="text-gray-800">{currentCity}</strong></span>
                    <button 
                        onClick={() => handleSelectCity('Todas')}
                        className="text-orange-600 hover:text-orange-700 font-black hover:underline"
                    >
                        Ver todas as cidades
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CitySelectorModal;
