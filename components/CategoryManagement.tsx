
import React, { useState, useEffect } from 'react';
import { fetchRestaurantCategories, createRestaurantCategory, deleteRestaurantCategory } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import type { RestaurantCategory } from '../types';
import Spinner from './Spinner';

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast, confirm, prompt } = useNotification();

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await fetchRestaurantCategories();
            setCategories(data);
        } catch (error) {
            console.error("Failed to load categories", error);
            addToast({ message: 'Erro ao carregar categorias.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleAddCategory = async () => {
        const name = await prompt({
            title: "Nova Categoria",
            message: "Digite o nome da nova categoria de restaurante (ex: Mexicana):",
            placeholder: "Nome da categoria"
        });

        if (name && name.trim()) {
            try {
                await createRestaurantCategory(name.trim());
                addToast({ message: 'Categoria criada com sucesso!', type: 'success' });
                loadCategories();
            } catch (error: any) {
                addToast({ message: `Erro ao criar: ${error.message}`, type: 'error' });
            }
        }
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
                addToast({ message: `Erro ao excluir: ${error.message}`, type: 'error' });
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
                    <div key={cat.id} className="flex justify-between items-center p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="font-semibold text-gray-700">{cat.name}</span>
                        <button 
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-white"
                            title="Excluir"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
            
            {categories.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma categoria cadastrada.</p>
            )}
        </div>
    );
};

export default CategoryManagement;
