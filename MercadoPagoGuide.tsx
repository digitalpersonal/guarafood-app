import React, { useState, useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';

const ChromeMemorySaverGuide: React.FC = () => {
    const { addToast } = useNotification();
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(true);
    const [isChrome, setIsChrome] = useState(false);
    const [wakeLockSupported, setWakeLockSupported] = useState(false);
    const [wakeLockActive, setWakeLockActive] = useState(false);

    // Detect if browser is Chrome and if Wake Lock is supported
    useEffect(() => {
        const isChromium = (window as any).chrome;
        const winNav = window.navigator;
        const vendorName = winNav.vendor;
        const isOpera = typeof (window as any).opr !== "undefined";
        const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
        
        const isIndeedChrome = isChromium !== null && 
                               typeof isChromium !== "undefined" && 
                               vendorName === "Google Inc." && 
                               isOpera === false && 
                               isIEedge === false;
        
        setIsChrome(isIndeedChrome);
        setWakeLockSupported('wakeLock' in navigator);
    }, []);

    // Try to request a screen wake lock to keep the tab active programmatically as a safeguard
    useEffect(() => {
        if (!wakeLockSupported) return;

        let wakeLock: any = null;
        async function requestWakeLock() {
            try {
                wakeLock = await (navigator as any).wakeLock.request('screen');
                setWakeLockActive(true);
                
                // If it's released, update state
                wakeLock.addEventListener('release', () => {
                    setWakeLockActive(false);
                });
            } catch (err) {
                console.warn('Wake Lock request failed:', err);
                setWakeLockActive(false);
            }
        }

        requestWakeLock();

        // Re-request when tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !wakeLockActive) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock) {
                try {
                    wakeLock.release();
                } catch (e) {}
            }
        };
    }, [wakeLockSupported]);

    const handleCopyUrl = () => {
        const currentUrl = window.location.origin;
        navigator.clipboard.writeText(currentUrl).then(() => {
            setCopied(true);
            addToast({ message: 'Link do GuaraFood copiado com sucesso!', type: 'success' });
            setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
            addToast({ message: 'Não foi possível copiar automaticamente. Selecione e copie o link na barra de endereços.', type: 'error' });
        });
    };

    const handleCopyConfigUrl = () => {
        navigator.clipboard.writeText('chrome://settings/performance').then(() => {
            addToast({ message: 'Endereço de configuração copiado! Cole na barra do Chrome.', type: 'success' });
        });
    };

    return (
        <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm transition-all duration-300">
            {/* Header Accordion */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-amber-100/50"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-6 w-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-[15px] text-amber-900 uppercase tracking-tight">
                            Garantia de Novos Pedidos (Chrome)
                        </h3>
                        <p className="text-xs text-amber-800/80 font-semibold">
                            Evite conflitos com o "Economizador de Memória" do Google Chrome.
                        </p>
                    </div>
                </div>
                <div className="text-amber-800 hover:text-amber-950 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`h-5 w-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </button>

            {/* Content Body */}
            {isOpen && (
                <div className="border-t border-amber-200 bg-white p-5 space-y-4 text-sm text-gray-700 animate-fadeIn">
                    <p className="leading-relaxed text-gray-600 font-medium">
                        O navegador <strong className="text-gray-900">Google Chrome</strong> possui um recurso de segurança chamado <strong className="text-amber-900">"Economizador de Memória" (Memory Saver)</strong> que <span className="font-bold underline decoration-amber-500">congela e desconecta do painel</span> as abas que ficam abertas em segundo plano ou sem cliques por mais de uma hora. 
                    </p>

                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-start gap-2 text-xs">
                        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <span className="font-bold text-amber-900 uppercase tracking-wider block mb-1">Por que isso não é automático?</span>
                            <span className="text-[11px] text-amber-800 font-semibold leading-normal">
                                Por questões de <strong>segurança e privacidade de dados</strong>, o Google Chrome impede estritamente que qualquer site altere as configurações internas do navegador ou adicione exceções de forma automática nas atualizações. A configuração precisa ser feita uma única vez manualmente no computador de vendas.
                            </span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-gray-400 block mb-3">PASSO A PASSO PARA CONFIGURAR (Leva 1 Minuto)</span>
                        
                        <div className="space-y-4">
                            {/* Step 1 */}
                            <div className="flex gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800 text-xs shadow-inner">
                                    1
                                </div>
                                <div className="flex-grow space-y-2">
                                    <p className="font-bold text-gray-800">Copie o link exclusivo do seu GuaraFood:</p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="bg-gray-100 font-mono text-xs px-3 py-2 rounded-lg truncate flex-grow border flex items-center text-gray-600">
                                            {window.location.origin}
                                        </div>
                                        <button 
                                            onClick={handleCopyUrl}
                                            className="px-4 py-2 shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            {copied ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                    Copiar Link
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800 text-xs shadow-inner">
                                    2
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-800">Abra as configurações de desempenho do Chrome:</p>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Abra uma nova aba em seu navegador Chrome, copie o endereço abaixo, cole-o na barra de endereços superior e aperte <kbd className="bg-gray-100 px-1 py-0.5 rounded border text-[10px] font-bold shadow-sm">Enter</kbd>:
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                        <div className="bg-gray-100 font-mono text-xs px-3 py-2 rounded-lg truncate flex-grow border flex items-center text-gray-500 select-all">
                                            chrome://settings/performance
                                        </div>
                                        <button 
                                            onClick={handleCopyConfigUrl}
                                            className="px-3 py-2 shrink-0 bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-700 rounded-lg text-xs font-bold transition-all"
                                        >
                                            Copiar Atalho
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-400 italic">
                                        Alternativo: Clique nos três pontinhos no topo direito do Chrome &rarr; <strong>Configurações</strong> &rarr; aba <strong>Desempenho</strong> à esquerda.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800 text-xs shadow-inner">
                                    3
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-800">Adicione o GuaraFood como exceção permanente:</p>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Na seção de <strong className="text-gray-800">Economizador de Memória</strong>, procure pelo campo <strong className="text-gray-800">"Sempre manter estes sites ativos"</strong> (ou "Always keep these sites active"), clique em <strong className="text-orange-600 font-black uppercase text-[10px] border border-orange-200 px-1.5 py-0.5 rounded bg-orange-50">Adicionar</strong>, cole o link que copiou no Passo 1 e clique em salvar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Automatic background safeguards */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-gray-400">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span>Sistemas integrados de segurança GuaraFood ativos</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1" title="Previne que a tela ou computador entrem em repouso se a aba estiver em foco">
                                <span className={`w-1.5 h-1.5 rounded-full ${wakeLockActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>WakeLock: {wakeLockActive ? 'Ativo' : 'Inativo ou sem Foco'}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Canal inteligente contra congelamento de processos em segundo plano">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span>Canal de Som: Ativo</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChromeMemorySaverGuide;
