
import React from 'react';
import { Logo } from './Logo';

interface HeaderGlobalProps {
  onOrdersClick?: () => void;
}

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HeaderGlobal: React.FC<HeaderGlobalProps> = ({ onOrdersClick }) => {
  return (
    <header className="bg-orange-600 p-3 shadow-md sticky top-0 z-50">
      <div className="relative flex justify-center items-center max-w-7xl mx-auto">
        {/* Logo Centralizada */}
        <Logo />
        
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
