
import React, { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = "1.0.3"; // Versão atual hardcoded no bundle

const VersionChecker: React.FC = () => {
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const [isForceMajorUpdate, setIsForceMajorUpdate] = useState(false);

    const checkVersion = useCallback(async () => {
        // 1. Verificamos o localStorage para forçar a tela de atualização aos usuários do sistema antigo
        const localVersion = localStorage.getItem('guarafood_app_version');
        if (localVersion !== APP_VERSION) {
            setNeedsUpdate(true);
            setIsForceMajorUpdate(true);
            return;
        }

        try {
            // Adicionamos um timestamp para evitar cache do próprio arquivo version.json
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data.version !== APP_VERSION) {
                console.log(`Nova versão detectada: ${data.version}. Atual: ${APP_VERSION}`);
                setNeedsUpdate(true);
                
                // Limpar caches do Service Worker para forçar atualização
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        registration.update();
                    }
                }
            }
        } catch (error) {
            console.error("Falha ao verificar versão:", error);
        }
    }, []);

    useEffect(() => {
        // Verifica apenas ao carregar o sistema (ligar)
        checkVersion();
    }, [checkVersion]);

    if (!needsUpdate) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-6 text-center animate-bounce-in border border-gray-100">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-orange-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-orange-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Nova Atualização</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    Você está usando uma versão antiga. Clique no botão abaixo para receber as novidades (KDS de Cozinha, Mensalistas, Controle de Mesas etc).
                </p>
                <button 
                    onClick={() => {
                        if (isForceMajorUpdate) {
                            localStorage.setItem('guarafood_app_version', APP_VERSION);
                            setNeedsUpdate(false);
                        } else {
                            if ('serviceWorker' in navigator) {
                                navigator.serviceWorker.getRegistrations().then(registrations => {
                                    for(let registration of registrations) {
                                        registration.unregister();
                                    }
                                    window.location.reload();
                                }).catch(() => {
                                    window.location.reload();
                                });
                            } else {
                                window.location.reload();
                            }
                        }
                    }}
                    className="w-full bg-orange-600 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg hover:bg-orange-700 hover:shadow-xl active:scale-95 transition-all text-sm"
                >
                    Atualizar o GuaraFood
                </button>
            </div>
        </div>
    );
};

export default VersionChecker;
