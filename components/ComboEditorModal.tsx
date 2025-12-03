import React, { useState, useEffect } from 'react';
import type { Combo, MenuItem } from '../types';

interface ComboEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (comboData: Omit<Combo, 'id' | 'restaurantId'>) => void;
    existingCombo: Combo | null;
    menuItems: MenuItem[];
}

const ComboEditorModal: React.FC<ComboEditorModalProps> = ({ isOpen, onClose, onSave, existingCombo, menuItems }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    // FIX: Corrected useState initialization for Set
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set<number>());
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingCombo) {
            setName(existingCombo.name);
            setDescription(existingCombo.description);
            // FIX: Use .toString() for converting number to string for input fields
            setPrice(existingCombo.price.toString());
            setImageUrl(existingCombo.imageUrl);
            setSelectedItemIds(new Set(existingCombo.menuItemIds));
        } else {
            // Reset form for new combo
            setName('');
            setDescription('');
            setPrice('');
            setImageUrl('');
            setSelectedItemIds(new Set());
        }
        setError('');
    }, [existingCombo, isOpen]);

    const handleItemToggle = (itemId: number) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        if (!name || !price || selectedItemIds.size === 0) {
            setError('Nome, Preço e pelo menos um item são obrigatórios.');
            return;
        }
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            setError('O preço deve ser um número válido e maior que zero.');
            return;
        }

        onSave({
            name,
            description,
            price: numericPrice,
            imageUrl,
            menuItemIds: Array.from(selectedItemIds),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="combo-editor-modal-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="combo-editor-modal-title" className="text-2xl font-bold mb-4">{existingCombo ? 'Editar Combo' : 'Criar Novo Combo'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <input
                        type="text"
                        placeholder="Nome do Combo (ex: Combo Casal)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50"
                    />
                    <textarea
                        placeholder="Descrição do Combo"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-gray-50"
                        rows={3}
                    />
                     <div className="flex gap-4">
                        <input
                            type="number"
                            placeholder="Preço (ex: 29.90)"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-1/2 p-3 border rounded-lg bg-gray-50"
                        />
                        <input
                            type="text"
                            placeholder="URL da Imagem"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-1/2 p-3 border rounded-lg bg-gray-50"
                        />
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Selecione os Itens do Combo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-lg max-h-48 overflow-y-auto bg-gray-50">
                            {menuItems.map(item => (
                                <label key={item.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer has-[:checked]:bg-orange-50">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIds.has(item.id)}
                                        onChange={() => handleItemToggle(item.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span>{item.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">Salvar Combo</button>
                </div>
            </div>
        </div>
    );
};

export default ComboEditorModal;