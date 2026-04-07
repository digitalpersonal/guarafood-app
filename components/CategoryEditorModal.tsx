import React, { useState, useEffect } from 'react';
import { createRestaurantCategory, updateRestaurantCategory } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import { getErrorMessage } from '../services/api';
import type { RestaurantCategory } from '../types';
import Spinner from './Spinner';
import ImageUploadField from './ImageUploadField';

interface CategoryEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    existingCategory: RestaurantCategory | null;
}

const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({ isOpen, onClose, onSaveSuccess, existingCategory }) => {
    const [name, setName] = useState('');
    const [iconUrl, setIconUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useNotification();

    useEffect(() => {
        if (existingCategory) {
            setName(existingCategory.name);
            setIconUrl(existingCategory.iconUrl || '');
        } else {
            setName('');
            setIconUrl('');
        }
    }, [existingCategory, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            addToast({ message: 'Nome da categoria é obrigatório', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            if (existingCategory) {
                await updateRestaurantCategory(existingCategory.id, name, iconUrl); 
                addToast({ message: 'Categoria atualizada com sucesso!', type: 'success' });
            } else {
                await createRestaurantCategory(name, iconUrl);
                addToast({ message: 'Categoria criada com sucesso!', type: 'success' });
            }
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            addToast({ message: `Erro ao salvar: ${getErrorMessage(error)}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">
                        {existingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="Ex: Lanches, Pizzas, Bebidas"
                            autoFocus
                        />
                    </div>

                    <ImageUploadField 
                        restaurantId={0} // Global categories use ID 0 for storage path
                        currentImageUrl={iconUrl}
                        onImageUploaded={(url) => setIconUrl(url)}
                        label="Ícone da Categoria"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ou cole a URL do Ícone</label>
                        <input
                            type="text"
                            value={iconUrl}
                            onChange={(e) => setIconUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-xs"
                            placeholder="https://exemplo.com/icone.png"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Recomendado: imagem quadrada (1:1) com fundo transparente.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <Spinner message="Carregando..." />}
                            {existingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryEditorModal;
