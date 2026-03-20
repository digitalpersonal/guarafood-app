
import React from 'react';
import { Logo } from './Logo';

interface HeaderGlobalProps {
  onOrdersClick?: () => void;
  onHomeClick?: () => void;
}

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

const HeaderGlobal: React.FC<HeaderGlobalProps> = ({ onOrdersClick, onHomeClick }) => {
  return (
    <header className="bg-orange-600 p-3 shadow-md sticky top-0 z-50">
      <div className="relative flex justify-center items-center max-w-7xl mx-auto">
        
        {/* Botão Home à Esquerda (Absoluto) */}
        {onHomeClick && (
            <button 
                onClick={onHomeClick}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1"
                title="Página Inicial"
            >
                <HomeIcon className="w-6 h-6" />
                <span className="text-sm font-bold hidden sm:inline">Início</span>
            </button>
        )}

        {/* Logo Centralizada (Clicável para Home) */}
        <button 
            onClick={onHomeClick} 
            className={`focus:outline-none transition-transform active:scale-95 ${onHomeClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
            disabled={!onHomeClick}
        >
            <Logo />
        </button>
        
        {/* Botão de Pedidos à Direita (Absoluto) */}
        {onOrdersClick && (
          <button 
            onClick={onOrdersClick}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1"
            title="Meus Pedidos"
          >
            <ClockIcon className="w-6 h-6" />
            <span className="text-sm font-bold hidden sm:inline">Pedidos</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default HeaderGlobal;
