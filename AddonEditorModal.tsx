

import React, { useState, useEffect } from 'react';
import type { Addon } from '../types';

interface AddonEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (addonData: Omit<Addon, 'id' | 'restaurantId'>) => void;
    existingAddon: Addon | null;
}

const AddonEditorModal: React.FC<AddonEditorModalProps> = ({ isOpen, onClose, onSave, existingAddon }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingAddon) {
            setName(existingAddon.name);
            // FIX: Use .toString() for converting number to string for input fields
            setPrice(existingAddon.price.toString());
        } else {
            setName('');
            setPrice('');
        }
        setError('');
    }, [existingAddon, isOpen]);

    const handleSubmit = () => {
        if (!name || !price) {
            setError('Nome e Preço são obrigatórios.');
            return;
        }
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            setError('O preço deve ser um número válido.');
            return;
        }

        onSave({
            name,
            price: numericPrice,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{existingAddon ? 'Editar Adicional' : 'Novo Adicional'}</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome (ex: Bacon Extra)</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-gray-50 mt-1"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                        <input 
                            type="number" 
                            value={price} 
                            onChange={(e) => setPrice(e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-gray-50 mt-1"
                            placeholder="0.00"
                            step="0.50"
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default AddonEditorModal;