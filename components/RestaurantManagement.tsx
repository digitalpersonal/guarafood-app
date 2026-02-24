import React, { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '../types';
// Import fetchRestaurantsSecure instead of fetchRestaurants
import { fetchRestaurantsSecure, deleteRestaurant, updateRestaurant } from '../services/databaseService';
import { importDuGrillRestaurant } from '../utils/importDuGrill';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import { supabase, getErrorMessage } from '../services/api';
// FIX: Add missing import for RestaurantEditorModal
import RestaurantEditorModal from './RestaurantEditorModal';

const MenuBookIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
);


interface RestaurantManagementProps {
    onEditMenu: (restaurant: Restaurant) => void;
}

const RestaurantManagement: React.FC<RestaurantManagementProps> = ({ onEditMenu }) => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
    const { addToast, confirm } = useNotification();

    const loadRestaurants = useCallback(async () => {
        try {
            setIsLoading(true);
            // Use the secure fetch to ensure admin can see credentials if needed for editing
            const data = await fetchRestaurantsSecure();
            setRestaurants(data);
            setError(null); // Clear previous errors on successful load
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

    const generateDeleteSQL = (restaurantId: number, restaurantName: string) => {
        const sql = `
-- SQL para excluir o restaurante "${restaurantName}" (ID: ${restaurantId}) e seus dados
BEGIN;
  DELETE FROM combos WHERE restaurant_id = ${restaurantId};
  DELETE FROM menu_items WHERE restaurant_id = ${restaurantId};
  DELETE FROM menu_categories WHERE restaurant_id = ${restaurantId};
  DELETE FROM addons WHERE restaurant_id = ${restaurantId};
  DELETE FROM promotions WHERE restaurant_id = ${restaurantId};
  DELETE FROM coupons WHERE restaurant_id = ${restaurantId};
  DELETE FROM expenses WHERE restaurant_id = ${restaurantId};
  DELETE FROM orders WHERE restaurant_id = ${restaurantId};
  DELETE FROM restaurants WHERE id = ${restaurantId};
COMMIT;
`;
        navigator.clipboard.writeText(sql);
        addToast({ message: 'SQL de exclusão copiado para a área de transferência!', type: 'info' });
    };

    const handleDeleteRestaurant = async (restaurant: Restaurant) => {
        const confirmed = await confirm({
            title: 'Excluir Restaurante',
            message: `Tem certeza que deseja excluir "${restaurant.name}"? Esta ação é irreversível.`,
            confirmText: 'Excluir',
            isDestructive: true,
        });

        if (confirmed) {
            try {
                await deleteRestaurant(restaurant.id);
                addToast({ message: 'Restaurante excluído.', type: 'info' });
                await loadRestaurants();
            } catch (err: any) {
                console.error("Failed to delete restaurant", err);
                const errorMsg = getErrorMessage(err);
                addToast({ message: `Erro ao excluir: ${errorMsg}`, type: 'error' });
                
                // Offer SQL workaround
                const useSql = await confirm({
                    title: 'Falha na Exclusão Automática',
                    message: 'O sistema não conseguiu excluir automaticamente (provavelmente devido a restrições de segurança ou dados vinculados). Deseja copiar o SQL para excluir manualmente no Supabase?',
                    confirmText: 'Copiar SQL',
                    cancelText: 'Cancelar'
                });
                
                if (useSql) {
                    generateDeleteSQL(restaurant.id, restaurant.name);
                }
            }
        }
    };
    
    const handleCopyLink = (restaurantId: number) => {
        const url = `${window.location.origin}?r=${restaurantId}`; // Reverted to query param for restaurant link
        navigator.clipboard.writeText(url);
        addToast({ message: 'Link copiado para a área de transferência!', type: 'success' });
    };

    const handleImportDuGrill = async () => {
        setIsLoading(true);
        const result = await importDuGrillRestaurant();
        if (result.success) {
            addToast({ message: 'Restaurante Du Grill importado com sucesso!', type: 'success' });
            await loadRestaurants();
        } else {
            addToast({ message: `Erro ao importar: ${getErrorMessage(result.error)}`, type: 'error' });
        }
        setIsLoading(false);
    };

    if (isLoading) return <Spinner message="Carregando restaurantes..." />;
    if (error) return <p className="text-center text-red-500 p-8 bg-red-50 rounded-lg">{error}</p>;

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Gerenciar Restaurantes</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleImportDuGrill}
                        className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-black transition-colors text-xs uppercase tracking-wider"
                    >
                        Importar Du Grill (PDF)
                    </button>
                    <button
                        onClick={() => handleOpenEditor(null)}
                        className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        Adicionar Novo Restaurante
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Nome</th>
                            <th scope="col" className="px-6 py-3">Categoria</th>
                            <th scope="col" className="px-6 py-3">Telefone</th>
                            <th scope="col" className="px-6 py-3 min-w-[250px]">Link da Loja</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {restaurants.map(restaurant => (
                            <tr key={restaurant.id} className={`bg-white border-b hover:bg-gray-50 ${!restaurant.active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${restaurant.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                        {restaurant.active ? 'Ativo' : 'Suspenso'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-900">{restaurant.name}</td>
                                <td className="px-6 py-4">{restaurant.category}</td>
                                <td className="px-6 py-4">{restaurant.phone}</td>
                                <td className="px-6 py-4 min-w-[250px]">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={`${window.location.origin}?r=${restaurant.id}`} 
                                            className="flex-grow p-1 border rounded bg-gray-50 text-xs truncate"
                                            onClick={(e) => (e.target as HTMLInputElement).select()} 
                                            aria-label={`Link da loja ${restaurant.name}`}
                                        />
                                        <button 
                                            onClick={() => handleCopyLink(restaurant.id)} 
                                            className="p-1.5 text-gray-500 hover:text-orange-600" 
                                            title="Copiar Link"
                                        >
                                            <ClipboardIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleToggleActive(restaurant)} 
                                            className={`p-2 hover:text-white rounded transition-colors ${restaurant.active ? 'text-green-600 hover:bg-green-600' : 'text-red-500 hover:bg-red-500'}`} 
                                            title={restaurant.active ? "Bloquear Restaurante" : "Ativar Restaurante"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                                            </svg>
                                        </button>
                                        <button onClick={() => onEditMenu(restaurant)} className="p-2 text-gray-500 hover:text-green-600" title="Gerenciar Cardápio">
                                            <MenuBookIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => handleOpenEditor(restaurant)} className="p-2 text-gray-500 hover:text-blue-600" title="Editar Restaurante"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteRestaurant(restaurant)} className="p-2 text-gray-500 hover:text-red-600" title="Excluir Restaurante"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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