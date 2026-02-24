import React, { useState, useEffect } from 'react';
import type { RestaurantCategory } from '../types';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/api';
import { createRestaurantCategory, updateRestaurantCategory } from '../services/databaseService';

interface CategoryEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    existingCategory: RestaurantCategory | null;
}

const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({ isOpen, onClose, onSaveSuccess, existingCategory }) => {
    const { addToast } = useNotification();
    const [name, setName] = useState('');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (existingCategory) {
            setName(existingCategory.name);
            setIconPreview(existingCategory.iconUrl || null);
        } else {
            setName('');
            setIconPreview(null);
        }
        setIconFile(null);
        setError('');
    }, [existingCategory, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIconFile(file);
            setIconPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('O nome da categoria é obrigatório.');
            return;
        }

        setIsSaving(true);
        let finalIconUrl = existingCategory?.iconUrl || '';

        if (iconFile) {
            try {
                const fileName = `${crypto.randomUUID()}-${iconFile.name}`;
                const { error: uploadError } = await supabase.storage.from('category-icons').upload(`public/${fileName}`, iconFile);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('category-icons').getPublicUrl(`public/${fileName}`);
                finalIconUrl = data.publicUrl;
            } catch (err: any) {
                setError(`Erro ao fazer upload do ícone: ${err.message}`);
                setIsSaving(false);
                return;
            }
        }

        try {
            if (existingCategory) {
                await updateRestaurantCategory(existingCategory.id, name.trim(), finalIconUrl);
                addToast({ message: 'Categoria atualizada com sucesso!', type: 'success' });
            } else {
                await createRestaurantCategory(name.trim(), finalIconUrl);
                addToast({ message: 'Categoria criada com sucesso!', type: 'success' });
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            setError(`Erro ao salvar categoria: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{existingCategory ? 'Editar' : 'Nova'} Categoria</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Pizzaria"
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ícone da Categoria</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                        />
                        {iconPreview && (
                            <div className="mt-2 flex items-center gap-2">
                                <img src={iconPreview} alt="Icon Preview" className="w-10 h-10 object-cover rounded-full border" />
                                <span className="text-xs text-gray-500">Pré-visualização do ícone</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className="text-red-500 text-xs mt-4">{error}</div>}

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Salvar Categoria'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryEditorModal;
