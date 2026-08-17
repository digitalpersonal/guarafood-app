import React from 'react';
import { Logo } from './Logo';

interface HeaderGlobalProps {
  onOrdersClick?: () => void;
  onHomeClick?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  backLabel?: string;
}

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HeaderGlobal: React.FC<HeaderGlobalProps> = ({ 
  onOrdersClick, 
  onHomeClick, 
  onBack, 
  canGoBack, 
  backLabel = "Voltar" 
}) => {
  return (
    <header className="bg-orange-600 shadow-md fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between">
        
        {/* Lado Esquerdo: Botão Voltar discreto quando aplicável */}
        <div className="w-10 sm:w-16 flex items-center justify-start flex-shrink-0">
          {canGoBack && onBack ? (
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-orange-700 active:bg-orange-800 active:scale-90 transition-all border border-orange-500/30 shadow-sm"
              title={backLabel}
              aria-label={backLabel}
            >
              <ChevronLeftIcon className="w-6 h-6 text-white" />
            </button>
          ) : null}
        </div>

        {/* Centro: Logo GuaraFood - Totalmente livre e sem obstruções */}
        <div className="flex-1 flex justify-center items-center px-2">
          <button 
            onClick={onHomeClick} 
            className={`focus:outline-none transition-transform active:scale-95 flex items-center ${onHomeClick ? 'cursor-pointer hover:opacity-95' : 'cursor-default'}`}
            disabled={!onHomeClick}
            title="GuaraFood - Início"
          >
            <Logo />
          </button>
        </div>
        
        {/* Lado Direito: Meus Pedidos (ícone limpo e circular) */}
        <div className="w-10 sm:w-16 flex items-center justify-end flex-shrink-0">
          {onOrdersClick ? (
            <button 
              onClick={onOrdersClick}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-orange-700 active:bg-orange-800 active:scale-90 transition-all border border-orange-500/30 shadow-sm"
              title="Meus Pedidos"
              aria-label="Meus Pedidos"
            >
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default HeaderGlobal;
