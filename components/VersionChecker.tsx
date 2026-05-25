import React, { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = "1.2.1"; // Versão atual incrementada para forçar atualização e limpeza de caches obsoletos

const VersionChecker: React.FC = () => {
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const [serverVersion, setServerVersion] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const checkVersion = useCallback(async () => {
        try {
            // Adicionamos um timestamp para evitar cache do próprio arquivo version.json
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            // SENIOR BUG PREVENTION: Só sinaliza se a versão do servidor for de fato uma string diferente e não vazia
            if (data && data.version && data.version !== APP_VERSION) {
                console.log(`[GuaraFood] Nova versão disponível: ${data.version}. Atual: ${APP_VERSION}`);
                setServerVersion(data.version);
                setNeedsUpdate(true);
            } else {
                localStorage.setItem('guarafood_app_version', APP_VERSION);
            }
        } catch (error) {
            console.warn("Falha silenciosa ao verificar versão:", error);
        }
    }, []);

    useEffect(() => {
        // Verifica ao carregar o sistema
        checkVersion();
        
        // Verifica a cada 10 minutos (600.000 ms) para atualizações em segundo plano
        const interval = setInterval(checkVersion, 600000);
        return () => clearInterval(interval);
    }, [checkVersion]);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            // 1. Limpar caches do Service Worker
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            
            // 2. Limpar Caches da API Cache Storage
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                } catch (e) {
                    console.error(e);
                }
            }
            
            // Grava a versão correspondente no localStorage
            localStorage.setItem('guarafood_app_version', serverVersion || APP_VERSION);
            
            // Força o reload completo ignorando cache do navegador
            setTimeout(() => {
                window.location.href = window.location.pathname + '?v=' + Date.now();
            }, 600);
        } catch (err) {
            console.error("Erro na atualização manual:", err);
            window.location.reload();
        }
    };

    if (!needsUpdate) return null;

    if (isUpdating) {
        return (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-8 text-center border border-gray-100 animate-pulse">
                    <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100">
                        <svg className="animate-spin h-10 w-10 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Instalando Melhorias</h3>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                        Pronto! O GuaraFood está reiniciando de forma limpa...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-orange-600 text-white py-3 px-4 font-sans text-center transition-all duration-300 shadow-lg relative z-50 flex flex-col sm:flex-row items-center justify-center gap-3 border-b border-orange-700">
            <div className="flex items-center gap-2">
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Novo</span>
                <p className="text-sm font-semibold">
                    Uma nova versão corrigida e melhorada do GuaraFood do seu restaurante está disponível ({serverVersion})!
                </p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleUpdate}
                    className="bg-white text-orange-700 hover:bg-orange-50 text-xs font-black py-1.5 px-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer uppercase"
                >
                    Atualizar Agora
                </button>
                <button 
                    onClick={() => setNeedsUpdate(false)}
                    className="bg-transparent hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition-colors cursor-pointer uppercase"
                >
                    Lembrar Mais Tarde
                </button>
            </div>
        </div>
    );
};

export default VersionChecker;
