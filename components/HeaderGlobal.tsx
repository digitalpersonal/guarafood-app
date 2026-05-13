
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
    <header className="bg-orange-600 p-3 shadow-md fixed top-0 left-0 right-0 z-50 h-[64px] flex items-center">
      <div className="w-full max-w-7xl mx-auto px-4 grid grid-cols-3 items-center">
        
        {/* Lado Esquerdo */}
        <div className="flex justify-start">
          {onHomeClick && (
              <button 
                  onClick={onHomeClick}
                  className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1.5 -ml-2 group"
                  title="Página Inicial"
              >
                  <div className="p-1 rounded-full group-active:bg-orange-800 transition-colors">
                    <HomeIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-black hidden sm:inline uppercase tracking-tight">Início</span>
              </button>
          )}
        </div>

        {/* Centro - Logo */}
        <div className="flex justify-center">
          <button 
              onClick={onHomeClick} 
              className={`focus:outline-none transition-transform active:scale-95 ${onHomeClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
              disabled={!onHomeClick}
          >
              <Logo />
          </button>
        </div>
        
        {/* Lado Direito */}
        <div className="flex justify-end">
          {onOrdersClick && (
            <button 
              onClick={onOrdersClick}
              className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1.5 -mr-2 group"
              title="Meus Pedidos"
            >
              <span className="text-sm font-black hidden sm:inline uppercase tracking-tight">Pedidos</span>
              <div className="p-1 rounded-full group-active:bg-orange-800 transition-colors">
                <ClockIcon className="w-6 h-6" />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderGlobal;
