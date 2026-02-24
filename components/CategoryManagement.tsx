

import React, { useState, useEffect } from 'react';
import { fetchRestaurantCategories, createRestaurantCategory, deleteRestaurantCategory } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import type { RestaurantCategory } from '../types';
import Spinner from './Spinner';
import { getErrorMessage, supabase } from '../services/api';
import CategoryEditorModal from './CategoryEditorModal';

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<RestaurantCategory | null>(null);
    const { addToast, confirm, prompt } = useNotification();

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await fetchRestaurantCategories();
            setCategories(data);
        } catch (error) {
            console.error("Failed to load categories", error);
            addToast({ message: `Erro ao carregar categorias: ${getErrorMessage(error)}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleOpenModal = (category: RestaurantCategory | null) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleDeleteCategory = async (id: number, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Categoria',
            message: `Tem certeza que deseja excluir a categoria "${name}"?`,
            confirmText: 'Excluir',
            isDestructive: true
        });

        if (confirmed) {
            try {
                await deleteRestaurantCategory(id);
                addToast({ message: 'Categoria excluída.', type: 'info' });
                loadCategories();
            } catch (error: any) {
                addToast({ message: `Erro ao excluir: ${getErrorMessage(error)}`, type: 'error' });
            }
        }
    };

    if (isLoading) return <Spinner message="Carregando categorias..." />;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Categorias de Estabelecimentos</h2>
                <button 
                    onClick={handleAddCategory}
                    className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                >
                    + Nova Categoria
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                            {cat.iconUrl && <img src={cat.iconUrl} alt={cat.name} className="w-8 h-8 object-cover rounded-full" />}
                            <span className="font-semibold text-gray-700">{cat.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleOpenModal(cat)}
                                className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-white"
                                title="Editar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                            </button>
                            <button 
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-white"
                                title="Excluir"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {categories.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma categoria cadastrada.</p>
            )}

            <CategoryEditorModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSaveSuccess={loadCategories}
                existingCategory={editingCategory}
            />
        </div>
    );
};

export default CategoryManagement;