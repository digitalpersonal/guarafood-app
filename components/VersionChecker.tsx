
import React, { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = "1.1.2"; // Versão atual incrementada para forçar atualização

const VersionChecker: React.FC = () => {
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const checkVersion = useCallback(async () => {
        try {
            // Adicionamos um timestamp para evitar cache do próprio arquivo version.json
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data.version !== APP_VERSION) {
                console.log(`Nova versão detectada: ${data.version}. Atual: ${APP_VERSION}`);
                
                // Ativa a tela de atualização automática (sem intervenção do usuário)
                setNeedsUpdate(true);
                setIsUpdating(true);
                
                // 1. Limpar caches do Service Worker de forma assíncrona agressiva
                if ('serviceWorker' in navigator) {
                    try {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                        }
                    } catch (swError) {
                        console.error("Erro ao desregistrar Service Worker:", swError);
                    }
                }
                
                // 2. Limpar Caches da API Cache Storage
                if ('caches' in window) {
                    try {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                    } catch (cacheError) {
                        console.error("Erro ao limpar Cache Storage:", cacheError);
                    }
                }
                
                // Grava a nova versão localmente para evitar loops de atualização
                localStorage.setItem('guarafood_app_version', data.version);
                
                // 3. Recarrega a página automaticamente após 1.5 segundos (tempo para o usuário entender o que está ocorrendo)
                setTimeout(() => {
                    window.location.href = window.location.pathname + '?v=' + new Date().getTime();
                }, 1500);
            } else {
                localStorage.setItem('guarafood_app_version', APP_VERSION);
            }
        } catch (error) {
            console.error("Falha ao verificar versão:", error);
        }
    }, []);

    useEffect(() => {
        // Verifica apenas ao carregar o sistema inicial (quando abre o GuaraFood no início do dia)
        checkVersion();
    }, [checkVersion]);

    if (!needsUpdate) return null;

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100 animate-pulse">
                    <svg className="animate-spin h-10 w-10 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Atualizando Sistema</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Instalando novas melhorias do GuaraFood de forma 100% automática...
                </p>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full w-1/2 animate-[pulse_1s_infinite] rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

export default VersionChecker;
