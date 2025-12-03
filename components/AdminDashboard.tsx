import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import RestaurantManagement from './RestaurantManagement';
import CategoryManagement from './CategoryManagement';
import MarketingManagement from './MarketingManagement';
import MenuManagement from './MenuManagement';


// Re-usable Icons
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'restaurants' | 'categories' | 'marketing'>('restaurants');
    const [editingMenuRestaurantId, setEditingMenuRestaurantId] = useState<number | null>(null);

    // Se estiver editando um cardápio específico, mostra o componente de Menu
    if (editingMenuRestaurantId) {
        return (
            <MenuManagement 
                restaurantId={editingMenuRestaurantId} 
                onBack={() => setEditingMenuRestaurantId(null)} 
            />
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'restaurants':
                return <RestaurantManagement onEditMenu={(restaurant) => setEditingMenuRestaurantId(restaurant.id)} />;
            case 'categories':
                return <CategoryManagement />;
            case 'marketing':
                return <MarketingManagement />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
             <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                            <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Painel do Administrador</h1>
                    </div>
                     <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors font-semibold" title="Sair">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>
            
            <nav className="p-4 border-b bg-gray-50 sticky top-[89px] z-10">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('restaurants')}
                        className={`flex-1 min-w-[100px] text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'restaurants' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Restaurantes
                    </button>
                     <button 
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 min-w-[100px] text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'categories' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Categorias
                    </button>
                    <button 
                        onClick={() => setActiveTab('marketing')}
                        className={`flex-1 min-w-[100px] text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'marketing' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Marketing
                    </button>
                </div>
            </nav>
            
            <main className="p-4">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminDashboard;