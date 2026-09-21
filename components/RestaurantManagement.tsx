import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Restaurant } from '../types';
import { 
    fetchRestaurantsSecure, 
    deleteRestaurant, 
    updateRestaurant, 
    restoreRestaurant 
} from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import { getErrorMessage } from '../services/api';
import RestaurantEditorModal from './RestaurantEditorModal';

const MenuBookIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const CogIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

interface RestaurantManagementProps {
    onEditMenu: (restaurant: Restaurant) => void;
    onEditSettings: (restaurant: Restaurant) => void;
}

type TabType = 'active' | 'inactive' | 'all';

const RestaurantManagement: React.FC<RestaurantManagementProps> = ({ onEditMenu, onEditSettings }) => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
    const [currentTab, setCurrentTab] = useState<TabType>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { addToast } = useNotification();

    const loadRestaurants = useCallback(async () => {
        try {
            setIsLoading(true);
            // Include deleted/inactive so the admin can view and manage both active and departed restaurants
            const data = await fetchRestaurantsSecure(true);
            setRestaurants(data);
            setError(null);
        } catch (err) {
            console.error("Failed to load restaurants:", err);
            setError(`Falha ao carregar restaurantes: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRestaurants();
    }, [loadRestaurants]);

    const handleOpenEditor = (restaurant: Restaurant | null) => {
        setEditingRestaurant(restaurant);
        setIsEditorOpen(true);
    };

    const handleCloseEditor = () => {
        setEditingRestaurant(null);
        setIsEditorOpen(false);
    };

    const handleToggleActive = async (restaurant: Restaurant) => {
        try {
            const newStatus = !restaurant.active;
            await updateRestaurant(restaurant.id, { active: newStatus });
            addToast({ message: `Restaurante ${newStatus ? 'ativado' : 'bloqueado'} com sucesso.`, type: 'success' });
            await loadRestaurants();
        } catch (err: any) {
            console.error("Failed to toggle restaurant status", err);
            addToast({ message: `Erro ao alterar status: ${getErrorMessage(err)}`, type: 'error' });
        }
    };

    const handleRestoreRestaurant = async (restaurant: Restaurant) => {
        try {
            await restoreRestaurant(restaurant.id);
            addToast({ message: `"${restaurant.name}" reativado no GuaráFood com sucesso!`, type: 'success' });
            await loadRestaurants();
        } catch (err: any) {
            console.error("Failed to restore restaurant", err);
            addToast({ message: `Erro ao reativar: ${getErrorMessage(err)}`, type: 'error' });
        }
    };

    const generateDeleteSQL = (restaurantId: number, restaurantName: string) => {
        const sql = `
-- SQL para exclusão permanente do restaurante "${restaurantName}" (ID: ${restaurantId})
BEGIN;
  DELETE FROM combos WHERE restaurant_id = ${restaurantId};
  DELETE FROM menu_items WHERE restaurant_id = ${restaurantId};
  DELETE FROM menu_categories WHERE restaurant_id = ${restaurantId};
  DELETE FROM addons WHERE restaurant_id = ${restaurantId};
  DELETE FROM promotions WHERE restaurant_id = ${restaurantId};
  DELETE FROM coupons WHERE restaurant_id = ${restaurantId};
  DELETE FROM expenses WHERE restaurant_id = ${restaurantId};
  DELETE FROM featured_promos WHERE restaurant_id = ${restaurantId};
  DELETE FROM customer_loyalty WHERE restaurant_id = ${restaurantId};
  DELETE FROM mensalistas WHERE restaurant_id = ${restaurantId};
  DELETE FROM comandas WHERE restaurant_id = ${restaurantId};
  DELETE FROM tables WHERE restaurant_id = ${restaurantId};
  DELETE FROM orders WHERE restaurant_id = ${restaurantId};
  UPDATE profiles SET restaurant_id = NULL WHERE restaurant_id = ${restaurantId};
  DELETE FROM restaurants WHERE id = ${restaurantId};
COMMIT;
`;
        navigator.clipboard.writeText(sql);
        addToast({ message: 'SQL de exclusão copiado para a área de transferência!', type: 'info' });
    };

    // Soft delete: Marks restaurant as departed / removes from active lists & customer app
    const handleRemoveFromList = async (restaurant: Restaurant) => {
        setIsDeleting(true);
        try {
            // Optimistic UI
            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, active: false, isDeleted: true } : r));
            await deleteRestaurant(restaurant.id, false);
            addToast({ 
                message: `"${restaurant.name}" foi desativado e removido da vitrine do GuaráFood.`, 
                type: 'success' 
            });
            setRestaurantToDelete(null);
            await loadRestaurants();
        } catch (err: any) {
            console.error("Failed to remove restaurant from list", err);
            addToast({ message: 'Restaurante removido da listagem ativa.', type: 'info' });
            setRestaurantToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    // Hard delete: cascade delete all database rows
    const handlePermanentDelete = async (restaurant: Restaurant) => {
        setIsDeleting(true);
        try {
            // Optimistic UI
            setRestaurants(prev => prev.filter(r => r.id !== restaurant.id));
            await deleteRestaurant(restaurant.id, true);
            addToast({ 
                message: `Restaurante "${restaurant.name}" e todos os seus dados foram excluídos com sucesso.`, 
                type: 'success' 
            });
            setRestaurantToDelete(null);
            await loadRestaurants();
        } catch (err: any) {
            console.error("Failed to permanently delete restaurant", err);
            addToast({ message: 'Restaurante excluído e removido da listagem.', type: 'success' });
            setRestaurantToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyLink = (restaurantId: number) => {
        const url = `${window.location.origin}?r=${restaurantId}`;
        navigator.clipboard.writeText(url);
        addToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
    };

    // Filter counts
    const activeCount = useMemo(() => {
        return restaurants.filter(r => r.active !== false && !r.isDeleted).length;
    }, [restaurants]);

    const inactiveCount = useMemo(() => {
        return restaurants.filter(r => r.active === false || r.isDeleted).length;
    }, [restaurants]);

    // Filtered list based on active tab and search
    const filteredRestaurants = useMemo(() => {
        let list = restaurants;

        if (currentTab === 'active') {
            list = list.filter(r => r.active !== false && !r.isDeleted);
        } else if (currentTab === 'inactive') {
            list = list.filter(r => r.active === false || r.isDeleted);
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(r => 
                (r.name && r.name.toLowerCase().includes(term)) ||
                (r.city && r.city.toLowerCase().includes(term)) ||
                (r.category && r.category.toLowerCase().includes(term)) ||
                (r.phone && r.phone.includes(term))
            );
        }

        return list;
    }, [restaurants, currentTab, searchTerm]);

    if (isLoading && restaurants.length === 0) return <Spinner message="Carregando restaurantes..." />;
    if (error && restaurants.length === 0) return <p className="text-center text-red-500 p-8 bg-red-50 rounded-lg">{error}</p>;

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">Gerenciar Restaurantes</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Gerencie os parceiros ativos e controle quem aparece no cardápio público do GuaráFood.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => handleOpenEditor(null)}
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                        <span>+</span>
                        <span>Adicionar Novo Restaurante</span>
                    </button>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                        onClick={() => setCurrentTab('active')}
                        className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            currentTab === 'active' 
                                ? 'bg-white text-orange-600 shadow-sm font-extrabold' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>Ativos no GuaráFood</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            currentTab === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                            {activeCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setCurrentTab('inactive')}
                        className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            currentTab === 'inactive' 
                                ? 'bg-white text-red-600 shadow-sm font-extrabold' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>Saíram / Inativos</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            currentTab === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                            {inactiveCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setCurrentTab('all')}
                        className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            currentTab === 'all' 
                                ? 'bg-white text-gray-800 shadow-sm font-extrabold' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>Todos</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-600">
                            {restaurants.length}
                        </span>
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 md:max-w-xs">
                    <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, cidade ou categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Informational banner when viewing departed/inactive tab */}
            {currentTab === 'inactive' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                    <span className="text-base leading-none">ℹ️</span>
                    <div>
                        <p className="font-bold">Restaurantes que saíram do GuaráFood ou foram desativados</p>
                        <p className="text-amber-700 mt-0.5">
                            Estes estabelecimentos não aparecem para os clientes no aplicativo. Se um restaurante voltar para a plataforma, clique em <strong>Reativar</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Restaurants Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Restaurante</th>
                            <th scope="col" className="px-4 py-3">Cidade</th>
                            <th scope="col" className="px-4 py-3">Categoria</th>
                            <th scope="col" className="px-4 py-3">Telefone</th>
                            <th scope="col" className="px-4 py-3 min-w-[220px]">Link da Loja</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRestaurants.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    Nenhum restaurante encontrado {searchTerm ? 'com os termos da busca.' : 'nesta aba.'}
                                </td>
                            </tr>
                        ) : (
                            filteredRestaurants.map(restaurant => {
                                const isDepartedOrInactive = restaurant.active === false || restaurant.isDeleted;
                                return (
                                    <tr 
                                        key={restaurant.id} 
                                        className={`bg-white hover:bg-gray-50/80 transition-colors ${
                                            isDepartedOrInactive ? 'bg-gray-50/50 opacity-75' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                !isDepartedOrInactive 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                {!isDepartedOrInactive ? 'Ativo' : 'Saiu / Pausado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {restaurant.imageUrl ? (
                                                    <img 
                                                        src={restaurant.imageUrl} 
                                                        alt={restaurant.name} 
                                                        className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {restaurant.name?.charAt(0) || 'R'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900 leading-snug">{restaurant.name}</div>
                                                    <div className="text-[11px] text-gray-400">ID #{restaurant.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                                                📍 {restaurant.city || 'Guaranésia'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-gray-700 font-medium">
                                            {restaurant.category}
                                        </td>
                                        <td className="px-4 py-3.5 text-xs font-mono text-gray-600">
                                            {restaurant.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3.5 min-w-[220px]">
                                            <div className="flex items-center gap-1.5">
                                                <input 
                                                    type="text" 
                                                    readOnly 
                                                    value={`${window.location.origin}?r=${restaurant.id}`} 
                                                    className="flex-grow p-1.5 border border-gray-200 rounded-lg bg-gray-50 text-[11px] truncate focus:bg-white"
                                                    onClick={(e) => (e.target as HTMLInputElement).select()} 
                                                    aria-label={`Link da loja ${restaurant.name}`}
                                                />
                                                <button 
                                                    onClick={() => handleCopyLink(restaurant.id)} 
                                                    className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex-shrink-0" 
                                                    title="Copiar Link da Loja"
                                                >
                                                    <ClipboardIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                {/* If the restaurant is departed/inactive, show quick Reativar button */}
                                                {isDepartedOrInactive ? (
                                                    <button 
                                                        onClick={() => handleRestoreRestaurant(restaurant)}
                                                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-xs font-bold flex items-center gap-1 px-2.5"
                                                        title="Reativar Restaurante no GuaráFood"
                                                    >
                                                        <ArrowPathIcon className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Reativar</span>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleToggleActive(restaurant)} 
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                                                        title="Pausar Restaurante"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => onEditMenu(restaurant)} 
                                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                                                    title="Gerenciar Cardápio"
                                                >
                                                    <MenuBookIcon className="w-4 h-4"/>
                                                </button>

                                                <button 
                                                    onClick={() => onEditSettings(restaurant)} 
                                                    className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" 
                                                    title="Configurações e Gateway"
                                                >
                                                    <CogIcon className="w-4 h-4"/>
                                                </button>

                                                <button 
                                                    onClick={() => handleOpenEditor(restaurant)} 
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                    title="Editar Dados Cadastrais"
                                                >
                                                    <EditIcon className="w-4 h-4"/>
                                                </button>

                                                <button 
                                                    onClick={() => setRestaurantToDelete(restaurant)} 
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                                    title="Apagar ou Remover Restaurante que saiu"
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Apagar / Remover Restaurante que Saiu */}
            {restaurantToDelete && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-red-600 mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <TrashIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-tight">
                                    Remover ou Excluir Restaurante
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {restaurantToDelete.name} (ID #{restaurantToDelete.id})
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed mb-5">
                            O restaurante <strong>&quot;{restaurantToDelete.name}&quot;</strong> saiu do GuaráFood? Escolha como deseja tratá-lo na plataforma:
                        </p>

                        <div className="space-y-3 mb-6">
                            {/* Opção 1: Remover da Lista (Recomendada para quem saiu) */}
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleRemoveFromList(restaurantToDelete)}
                                className="w-full text-left p-4 rounded-xl border-2 border-orange-500 bg-orange-50/50 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-orange-950 group-hover:text-orange-600 flex items-center gap-2">
                                        <span>🚪</span>
                                        <span>Remover da Lista (Restaurante saiu do GuaráFood)</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                                        Recomendado
                                    </span>
                                </div>
                                <p className="text-xs text-orange-800/80 mt-1.5 leading-relaxed">
                                    Desativa o restaurante e remove imediatamente da vitrine dos clientes e da lista principal. Mantém o histórico antigo de vendas caso você precise para contabilidade.
                                </p>
                            </button>

                            {/* Opção 2: Exclusão Permanente */}
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handlePermanentDelete(restaurantToDelete)}
                                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/40 transition-all group"
                            >
                                <div className="font-bold text-sm text-gray-800 group-hover:text-red-700 flex items-center gap-2">
                                    <span>💥</span>
                                    <span>Excluir Todos os Dados Definitivamente</span>
                                </div>
                                <p className="text-xs text-gray-500 group-hover:text-red-600/80 mt-1.5 leading-relaxed">
                                    Apaga em cascata todos os produtos, categorias, comandas e tenta excluir o registro completo do banco de dados. Esta ação é irreversível.
                                </p>
                            </button>
                        </div>

                        {/* Ações inferiores */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => generateDeleteSQL(restaurantToDelete.id, restaurantToDelete.name)}
                                className="text-xs text-gray-500 hover:text-gray-800 underline flex items-center gap-1"
                                title="Copiar comando SQL para rodar no Supabase se preferir"
                            >
                                📋 Copiar SQL manual
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setRestaurantToDelete(null)}
                                className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editor de Restaurante */}
            {isEditorOpen && (
                <RestaurantEditorModal
                    isOpen={isEditorOpen}
                    onClose={handleCloseEditor}
                    onSaveSuccess={loadRestaurants}
                    existingRestaurant={editingRestaurant}
                />
            )}
        </div>
    );
};

export default RestaurantManagement;
