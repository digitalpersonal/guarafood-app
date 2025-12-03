

import React, { useState, useEffect } from 'react';
import type { Promotion, MenuItem, Combo } from '../types';

interface PromotionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promoData: Omit<Promotion, 'id' | 'restaurantId'>) => void;
    existingPromotion: Promotion | null;
    menuItems: MenuItem[];
    combos: Combo[];
    categories: string[];
}

const PromotionEditorModal: React.FC<PromotionEditorModalProps> = ({ isOpen, onClose, onSave, existingPromotion, menuItems, combos, categories }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [targetType, setTargetType] = useState<'ITEM' | 'COMBO' | 'CATEGORY'>('ITEM');
    const [targetIds, setTargetIds] = useState<Set<string | number>>(new Set());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (existingPromotion) {
            setName(existingPromotion.name);
            setDescription(existingPromotion.description);
            setDiscountType(existingPromotion.discountType);
            // FIX: Use .toString() for converting number to string for input fields
            setDiscountValue(existingPromotion.discountValue.toString());
            setTargetType(existingPromotion.targetType);
            setTargetIds(new Set(existingPromotion.targetIds));
            setStartDate(existingPromotion.startDate.split('T')[0]);
            setEndDate(existingPromotion.endDate.split('T')[0]);
        } else {
            setName('');
            setDescription('');
            setDiscountType('PERCENTAGE');
            setDiscountValue('');
            setTargetType('ITEM');
            setTargetIds(new Set());
            setStartDate(today);
            setEndDate(today);
        }
        setError('');
    }, [existingPromotion, isOpen]);

    const getTargetOptions = () => {
        switch (targetType) {
            case 'ITEM': return menuItems;
            case 'COMBO': return combos;
            case 'CATEGORY': return categories.map((c, i) => ({ id: c, name: c }));
            default: return [];
        }
    };
    
    const handleTargetToggle = (id: string | number) => {
        setTargetIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        if (!name || !discountValue || !startDate || !endDate || targetIds.size === 0) {
            setError('Todos os campos, incluindo pelo menos um alvo, são obrigatórios.');
            return;
        }
        const numericDiscount = parseFloat(discountValue);
        if (isNaN(numericDiscount) || numericDiscount <= 0) {
            setError('O valor do desconto deve ser um número positivo.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('A data de início não pode ser posterior à data de término.');
            return;
        }

        onSave({
            name,
            description,
            discountType,
            discountValue: numericDiscount,
            targetType,
            targetIds: Array.from(targetIds),
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="promo-editor-modal-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="promo-editor-modal-title" className="text-2xl font-bold mb-4">{existingPromotion ? 'Editar Promoção' : 'Criar Nova Promoção'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <input type="text" placeholder="Nome da Promoção (ex: Happy Hour)" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    <textarea placeholder="Descrição da Promoção" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50" rows={2}/>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full p-3 border rounded-lg bg-gray-50">
                            <option value="PERCENTAGE">Porcentagem (%)</option>
                            <option value="FIXED">Valor Fixo (R$)</option>
                        </select>
                        <input type="number" placeholder="Valor do Desconto" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Aplicar promoção a:</h3>
                         <select value={targetType} onChange={e => { setTargetType(e.target.value as any); setTargetIds(new Set()); }} className="w-full p-3 border rounded-lg bg-gray-50 mb-2">
                            <option value="ITEM">Itens específicos</option>
                            <option value="COMBO">Combos específicos</option>
                            <option value="CATEGORY">Categorias inteiras</option>
                        </select>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-lg max-h-40 overflow-y-auto bg-gray-50">
                            {getTargetOptions().map(target => (
                                <label key={target.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer has-[:checked]:bg-orange-50">
                                    <input type="checkbox" checked={targetIds.has(target.id)} onChange={() => handleTargetToggle(target.id)} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                    <span>{target.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">Salvar Promoção</button>
                </div>
            </div>
        </div>
    );
};

export default PromotionEditorModal;