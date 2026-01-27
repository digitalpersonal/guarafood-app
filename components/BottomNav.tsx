
import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

const OrdersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-4 z-[90] sm:hidden pb-safe">
      <button 
        onClick={() => onTabChange('customer')}
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'customer' ? 'text-orange-600' : 'text-gray-400'}`}
      >
        <HomeIcon />
        <span className="text-[10px] font-bold">Início</span>
      </button>
      
      <button 
        onClick={() => onTabChange('history')}
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-orange-600' : 'text-gray-400'}`}
      >
        <OrdersIcon />
        <span className="text-[10px] font-bold">Pedidos</span>
      </button>
    </nav>
  );
};

export default BottomNav;
