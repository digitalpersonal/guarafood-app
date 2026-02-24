
import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import RestaurantManagement from './RestaurantManagement';
import CategoryManagement from './CategoryManagement';
import MarketingManagement from './MarketingManagement';
import MenuManagement from './MenuManagement';
import GlobalCustomerList from './GlobalCustomerList';


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
const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);

import { fetchRestaurantsSecure, deleteRestaurant } from '../services/databaseService';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { logout } = useAuth();
    const { addToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'restaurants' | 'categories' | 'marketing' | 'customers' | 'settings'>('restaurants');
    const [editingMenuRestaurantId, setEditingMenuRestaurantId] = useState<number | null>(null);
    const [isCleaning, setIsCleaning] = useState(false);

    const handleCleanupDuGrill = async () => {
        try {
            setIsCleaning(true);
            const restaurants = await fetchRestaurantsSecure();
            const toDelete = restaurants.filter(r => 
                r.name.toLowerCase().includes('hambúrgueria du grill') || 
                r.name.toLowerCase().includes('du grill')
            );
            
            if (toDelete.length === 0) {
                addToast({ message: 'Nenhum restaurante "Du Grill" encontrado.', type: 'info' });
                return;
            }

            for (const r of toDelete) {
                await deleteRestaurant(r.id);
            }
            
            addToast({ message: `${toDelete.length} restaurante(s) "Du Grill" excluído(s).`, type: 'success' });
        } catch (err) {
            console.error(err);
            addToast({ message: 'Erro ao excluir restaurantes.', type: 'error' });
        } finally {
            setIsCleaning(false);
        }
    };

    // Se estiver editando um cardápio específico, mostra o componente de Menu
    if (editingMenuRestaurantId) {
        return (
            <MenuManagement 
                restaurantId={editingMenuRestaurantId} 
                onBack={() => setEditingMenuRestaurantId(null)} 
            />
        );
    }

    const handleDownloadIcons = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = `${window.location.origin}/vite.svg?t=${new Date().getTime()}`; 
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            const sizes = [192, 512];
            sizes.forEach(size => {
                canvas.width = size;
                canvas.height = size;
                if (ctx) {
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    try {
                        const link = document.createElement('a');
                        link.download = `icon-${size}.png`;
                        link.href = canvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } catch (e) {
                        console.error("Canvas Security Error:", e);
                        addToast({ message: 'Erro de segurança do navegador ao salvar imagem.', type: 'error' });
                    }
                }
            });
            addToast({ message: 'Ícones baixados! Verifique sua pasta de downloads.', type: 'success' });
        };
        img.onerror = (e) => {
             console.error("Image load error:", e);
             addToast({ message: 'Erro ao encontrar o arquivo vite.svg na raiz do site.', type: 'error' });
        };
    };

    const renderSettings = () => (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Configurações do Sistema</h2>
            <div className="border rounded-lg bg-gray-50 p-4 border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <img src="/vite.svg" alt="Icon" className="w-6 h-6" />
                    Ícones do App (PWA)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Para que o aplicativo possa ser instalado no Android e iOS, é necessário ter os ícones PNG (192px e 512px).
                </p>
                <button 
                    onClick={handleDownloadIcons} 
                    className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 shadow-sm transition-colors"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Gerar e Baixar Ícones (PNG)
                </button>
            </div>

            <div className="border rounded-lg bg-red-50 p-4 border-red-200 mt-6">
                <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
                    <TrashIcon className="w-6 h-6" />
                    Limpeza de Dados
                </h3>
                <p className="text-sm text-red-600 mb-4">
                    Excluir todos os restaurantes "Hambúrgueria Du Grill" do sistema. Esta ação é irreversível.
                </p>
                <button 
                    onClick={handleCleanupDuGrill} 
                    disabled={isCleaning}
                    className="bg-red-600 text-white font-bold px-4 py-2.5 rounded-lg hover:bg-red-700 text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                    {isCleaning ? 'Excluindo...' : 'Excluir Todos "Du Grill"'}
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'restaurants':
                return <RestaurantManagement onEditMenu={(restaurant) => setEditingMenuRestaurantId(restaurant.id)} />;
            case 'categories':
                if (!editingMenuRestaurantId) {
                    return (
                        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto text-center">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Selecione um Restaurante</h2>
                            <p className="text-gray-600 mb-6">Por favor, selecione um restaurante na aba "Restaurantes" para gerenciar suas categorias de estabelecimento.</p>
                            <button
                                onClick={() => setActiveTab('restaurants')}
                                className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Ir para Restaurantes
                            </button>
                        </div>
                    );
                }
                return <CategoryManagement restaurantId={editingMenuRestaurantId} />;
            case 'marketing':
                return <MarketingManagement />;
            case 'customers':
                return <GlobalCustomerList />;
            case 'settings':
                return renderSettings();
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
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Administração GuaraFood</h1>
                    </div>
                     <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors font-semibold" title="Sair">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>
            
            <nav className="p-4 border-b bg-gray-50 sticky top-[89px] z-10">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('restaurants')} className={`flex-1 min-w-[100px] text-center font-bold text-xs uppercase p-3 rounded-md transition-all ${activeTab === 'restaurants' ? 'bg-white shadow text-orange-600 scale-105' : 'text-gray-500'}`}>Restaurantes</button>
                    <button onClick={() => setActiveTab('categories')} className={`flex-1 min-w-[100px] text-center font-bold text-xs uppercase p-3 rounded-md transition-all ${activeTab === 'categories' ? 'bg-white shadow text-orange-600 scale-105' : 'text-gray-500'}`}>Categorias</button>
                    <button onClick={() => setActiveTab('marketing')} className={`flex-1 min-w-[100px] text-center font-bold text-xs uppercase p-3 rounded-md transition-all ${activeTab === 'marketing' ? 'bg-white shadow text-orange-600 scale-105' : 'text-gray-500'}`}>Marketing</button>
                    <button onClick={() => setActiveTab('customers')} className={`flex-1 min-w-[100px] text-center font-bold text-xs uppercase p-3 rounded-md transition-all ${activeTab === 'customers' ? 'bg-white shadow text-orange-600 scale-105' : 'text-gray-500'}`}>Clientes</button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[100px] text-center font-bold text-xs uppercase p-3 rounded-md transition-all ${activeTab === 'settings' ? 'bg-white shadow text-orange-600 scale-105' : 'text-gray-500'}`}>Config</button>
                </div>
            </nav>
            
            <main className="p-4">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminDashboard;
