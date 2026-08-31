import React, { useState, useEffect } from 'react';
import { getCurrentUserCity, saveSelectedCity, isGpsPromptDismissed, setGpsPromptDismissed } from '../utils/locationService';
import { useNotification } from '../hooks/useNotification';

interface GpsBannerProps {
    currentCity: string;
    onCityChange: (newCity: string) => void;
    onOpenCityModal: () => void;
}

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const GpsBanner: React.FC<GpsBannerProps> = ({ currentCity, onCityChange, onOpenCityModal }) => {
    const { addToast } = useNotification();
    const [isLocating, setIsLocating] = useState(false);
    const [isDismissed, setIsDismissed] = useState(true);

    useEffect(() => {
        // Verifica se o usuário já respondeu ou dispensou o convite de localização
        const dismissed = isGpsPromptDismissed();
        setIsDismissed(dismissed);
    }, []);

    const handleAutoDetect = async () => {
        setIsLocating(true);
        try {
            const result = await getCurrentUserCity();
            if (result.success) {
                saveSelectedCity(result.city);
                setGpsPromptDismissed();
                setIsDismissed(true);
                onCityChange(result.city);
                addToast({
                    message: `Localização detectada com sucesso: ${result.city}`,
                    type: 'success'
                });
            } else {
                addToast({
                    message: result.error || 'Não foi possível obter sua localização por GPS. Escolha sua cidade na lista.',
                    type: 'warning'
                });
                onOpenCityModal();
            }
        } catch (e) {
            console.error("Erro ao detectar GPS:", e);
            onOpenCityModal();
        } finally {
            setIsLocating(false);
        }
    };

    const handleDismiss = () => {
        setGpsPromptDismissed();
        setIsDismissed(true);
    };

    return (
        <div className="w-full">
            {/* Mensagem em Português solicitando o acesso à localização quando ainda não respondido */}
            {!isDismissed && (
                <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-b-2 border-orange-200 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-600/20">
                                <MapPinIcon className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 leading-tight flex items-center gap-1.5">
                                    <span>Permitir acesso à sua localização?</span>
                                </h4>
                                <p className="text-xs text-gray-600 font-medium mt-0.5 leading-relaxed">
                                    Estamos chegando em mais cidades... O GuaraFood solicitará somente uma vez a sua localização para exibir os restaurantes abertos na sua cidade.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-1 md:pt-0">
                            <button
                                onClick={handleAutoDetect}
                                disabled={isLocating}
                                className="flex-1 md:flex-initial bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
                            >
                                {isLocating ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        <span>Detectando localização...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📍</span>
                                        <span>Permitir Localização</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={onOpenCityModal}
                                className="bg-white hover:bg-orange-50 active:scale-95 text-gray-700 hover:text-orange-900 border border-gray-200 hover:border-orange-300 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                            >
                                Escolher Cidade
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-gray-600 p-2 text-xs font-bold hover:bg-gray-100 rounded-lg transition-colors"
                                title="Fechar aviso de localização"
                                aria-label="Fechar aviso de localização"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Cidade Atual Selecionada */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-orange-200/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <MapPinIcon className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                        <span className="text-gray-500 font-medium">Entregas em: </span>
                        <strong className="text-gray-900 font-black text-sm">{currentCity}</strong>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoDetect}
                        disabled={isLocating}
                        title="Detectar automaticamente minha cidade via GPS"
                        className="bg-orange-100 hover:bg-orange-200 active:scale-95 text-orange-800 text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 transition-all disabled:opacity-75"
                    >
                        {isLocating ? (
                            <>
                                <span className="w-3 h-3 border-2 border-orange-800 border-t-transparent rounded-full animate-spin"></span>
                                <span>Localizando...</span>
                            </>
                        ) : (
                            <>
                                <span>📡</span>
                                <span>Usar GPS</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onOpenCityModal}
                        className="bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-black px-3 py-1.5 rounded-full shadow-sm transition-all hover:border-orange-300 active:scale-95"
                    >
                        Trocar Cidade
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GpsBanner;
