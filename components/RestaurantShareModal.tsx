import React, { useState } from 'react';
import type { Restaurant } from '../types';
import { useNotification } from '../hooks/useNotification';
import { formatRestaurantWelcomeMessage, getRestaurantMenuUrl, getRestaurantMenuPath } from '../utils/restaurantUtils';

interface RestaurantShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: Restaurant;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.184 1.564 5.946l-1.564 5.714 5.861-1.537c1.716.94 3.682 1.477 5.772 1.477 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.842A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.592m7.332 0c.055.194.084.4.084.608v1.05a2.25 2.25 0 01-2.25 2.25h-3a2.25 2.25 0 01-2.25-2.25V4.45c0-.208.03-.414.084-.608m7.332 0a2.25 2.25 0 011.834 2.208V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.05a2.25 2.25 0 011.834-2.208" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3v3h-3v-3zM16.5 16.5h3v3h-3v-3zM19.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75z" />
    </svg>
);

export const RestaurantShareModal: React.FC<RestaurantShareModalProps> = ({ isOpen, onClose, restaurant }) => {
    const { addToast } = useNotification();
    const [copiedMessage, setCopiedMessage] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);

    if (!isOpen) return null;

    // Obtém dados oficiais do banco de dados do Supabase
    const restaurantName = restaurant.name || 'Restaurante';
    const menuPath = getRestaurantMenuPath(restaurant.id);
    const officialMenuUrl = getRestaurantMenuUrl(restaurant.id);
    const welcomeMessage = formatRestaurantWelcomeMessage(restaurantName, restaurant.id);

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(welcomeMessage);
            setCopiedMessage(true);
            addToast({ 
                message: 'Mensagem oficial copiada para envio no WhatsApp!', 
                type: 'success' 
            });
            setTimeout(() => setCopiedMessage(false), 2500);
        } catch {
            addToast({ message: 'Não foi possível copiar automaticamente.', type: 'error' });
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(officialMenuUrl);
            setCopiedLink(true);
            addToast({ 
                message: 'Link oficial do cardápio copiado!', 
                type: 'success' 
            });
            setTimeout(() => setCopiedLink(false), 2500);
        } catch {
            addToast({ message: 'Não foi possível copiar o link.', type: 'error' });
        }
    };

    const handleOpenWhatsApp = () => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
        const url = `${baseUrl}?text=${encodeURIComponent(welcomeMessage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(officialMenuUrl)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-scaleUp">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-6 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all"
                        title="Fechar"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md shadow-inner">
                            💬
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full text-orange-100">
                                Cardápio Oficial
                            </span>
                            <h3 className="text-xl font-black mt-1 leading-tight">
                                Divulgação & WhatsApp
                            </h3>
                            <p className="text-xs text-orange-100 opacity-90">
                                {restaurantName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                    {/* Preview da Mensagem Oficial do Supabase */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                <span>📲</span> Mensagem Oficial para Clientes
                            </label>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                Pronta para WhatsApp
                            </span>
                        </div>
                        
                        <div className="bg-emerald-50/70 border-2 border-emerald-200/80 rounded-2xl p-4 text-sm text-gray-800 leading-relaxed font-sans shadow-inner whitespace-pre-wrap relative">
                            {welcomeMessage}
                        </div>
                    </div>

                    {/* Botões de Ação Rápida da Mensagem */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={handleOpenWhatsApp}
                            className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                        >
                            <WhatsAppIcon className="w-5 h-5 text-white" />
                            Enviar no WhatsApp
                        </button>

                        <button
                            onClick={handleCopyMessage}
                            className={`flex items-center justify-center gap-2 p-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 active:scale-95 cursor-pointer ${
                                copiedMessage 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-xs'
                            }`}
                        >
                            {copiedMessage ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ClipboardIcon className="w-4 h-4 text-gray-500" />}
                            {copiedMessage ? 'Mensagem Copiada!' : 'Copiar Mensagem'}
                        </button>
                    </div>

                    {/* Link direto do Cardápio */}
                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                                Link Oficial do Cardápio
                            </label>
                            <span className="text-[10px] text-gray-400 font-mono">
                                Rota: {menuPath}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                readOnly
                                value={officialMenuUrl}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 select-all outline-none focus:bg-white focus:border-orange-400"
                            />
                            <button
                                onClick={handleCopyLink}
                                className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 flex-shrink-0 cursor-pointer ${
                                    copiedLink 
                                        ? 'bg-orange-100 text-orange-800 border-orange-300' 
                                        : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500 shadow-sm'
                                }`}
                                title="Copiar link do cardápio"
                            >
                                {copiedLink ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* QR Code & Pré-Visualização */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => setShowQrCode(!showQrCode)}
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 transition-colors"
                        >
                            <QrCodeIcon className="w-4 h-4" />
                            <span>{showQrCode ? 'Ocultar QR Code' : 'Ver QR Code do Cardápio'}</span>
                        </button>

                        <a 
                            href={officialMenuUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                        >
                            <span>Abrir Cardápio</span>
                            <span>↗</span>
                        </a>
                    </div>

                    {showQrCode && (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center animate-fadeIn">
                            <p className="text-xs text-gray-600 font-bold mb-3">
                                Imprima ou exiba para seus clientes escanearem no balcão ou nas mesas:
                            </p>
                            <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-gray-200">
                                <img 
                                    src={qrCodeUrl} 
                                    alt={`QR Code ${restaurantName}`} 
                                    className="w-48 h-48 mx-auto"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2 font-mono break-all">
                                {officialMenuUrl}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer do Modal */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>

            </div>
        </div>
    );
};
