
import React from 'react';
import { Logo } from './Logo';

interface HeaderGlobalProps {
  onOrdersClick?: () => void;
  onHomeClick?: () => void;
  onDashboardClick?: () => void;
  onLogoutClick?: () => void;
  userRole?: string;
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

const HeaderGlobal: React.FC<HeaderGlobalProps> = ({ onOrdersClick, onHomeClick, onDashboardClick, onLogoutClick, userRole }) => {
  return (
    <header className="bg-orange-600 p-3 shadow-md sticky top-0 z-50">
      <div className="relative flex justify-center items-center max-w-7xl mx-auto">
        
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            {/* Botão Dashboard (se for admin/merchant) */}
            {onDashboardClick && (['admin', 'merchant', 'waiter', 'manager'].includes(userRole || '')) && (
                <button 
                    onClick={onDashboardClick}
                    className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1"
                    title="Voltar ao Painel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-bold hidden sm:inline">Painel</span>
                </button>
            )}

            {/* Botão Home - Apenas se não houver Dashboard ou se for mobile e couber */}
            {onHomeClick && (!onDashboardClick || !['admin', 'merchant', 'waiter', 'manager'].includes(userRole || '')) && (
                <button 
                    onClick={onHomeClick}
                    className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1"
                    title="Página Inicial"
                >
                    <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-xs sm:text-sm font-bold hidden sm:inline">Início</span>
                </button>
            )}
        </div>

        {/* Logo Centralizada (Clicável para Home) */}
        <button 
            onClick={onHomeClick} 
            className={`focus:outline-none transition-transform active:scale-95 ${onHomeClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
            disabled={!onHomeClick}
        >
            <Logo />
        </button>
        
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            {/* Botão de Pedidos */}
            {onOrdersClick && (
              <button 
                onClick={onOrdersClick}
                className="text-white hover:bg-orange-700 p-2 rounded-lg transition-colors flex items-center gap-1"
                title="Meus Pedidos"
              >
                <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-bold hidden sm:inline">Pedidos</span>
              </button>
            )}

            {/* Botão Sair (se logado) */}
            {onLogoutClick && userRole && (
                <button 
                    onClick={onLogoutClick}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-md"
                    title="Sair da Conta"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span className="text-xs font-black uppercase tracking-tight">Sair</span>
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default HeaderGlobal;
