
import React, { useState, useEffect } from 'react';
import type { Promotion, MenuItem, Combo, MenuCategory } from '../types';

interface PromotionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promoData: Omit<Promotion, 'id' | 'restaurantId'>) => void;
    existingPromotion: Promotion | null;
    menuItems: MenuItem[];
    combos: Combo[];
    categories: MenuCategory[];
}

const PromotionEditorModal: React.FC<PromotionEditorModalProps> = ({ isOpen, onClose, onSave, existingPromotion, menuItems, combos, categories }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    
    // Multi-select states
    const [itemIds, setItemIds] = useState<Set<number>>(new Set());
    const [comboIds, setComboIds] = useState<Set<number>>(new Set());
    const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'ITEMS' | 'COMBOS' | 'CATEGORIES'>('ITEMS');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (existingPromotion) {
            setName(existingPromotion.name);
            setDescription(existingPromotion.description);
            setDiscountType(existingPromotion.discountType);
            setDiscountValue(existingPromotion.discountValue.toString());
            setItemIds(new Set(existingPromotion.itemIds || []));
            setComboIds(new Set(existingPromotion.comboIds || []));
            setCategoryIds(new Set(existingPromotion.categoryIds || []));
            setStartDate(existingPromotion.startDate.split('T')[0]);
            setEndDate(existingPromotion.endDate.split('T')[0]);
        } else {
            setName('');
            setDescription('');
            setDiscountType('PERCENTAGE');
            setDiscountValue('');
            setItemIds(new Set());
            setComboIds(new Set());
            setCategoryIds(new Set());
            setStartDate(today);
            setEndDate(today);
        }
        setError('');
    }, [existingPromotion, isOpen]);

    const toggleSelection = (id: number, type: 'ITEMS' | 'COMBOS' | 'CATEGORIES') => {
        const setter = type === 'ITEMS' ? setItemIds : type === 'COMBOS' ? setComboIds : setCategoryIds;
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSubmit = () => {
        if (!name || !discountValue || !startDate || !endDate) {
            setError('Campos obrigatórios: Nome, Valor e Datas.');
            return;
        }

        if (itemIds.size === 0 && comboIds.size === 0 && categoryIds.size === 0) {
            setError('Selecione pelo menos um item, combo ou categoria.');
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
            itemIds: Array.from(itemIds),
            comboIds: Array.from(comboIds),
            categoryIds: Array.from(categoryIds),
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{existingPromotion ? 'Editar Promoção' : 'Criar Nova Promoção'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Promoção</label>
                            <input type="text" placeholder="Ex: Happy Hour" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Curta</label>
                            <input type="text" placeholder="Ex: Todos os pastéis com 10% OFF" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Início</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Término</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Desconto</label>
                            <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full p-2 border rounded-lg bg-gray-50">
                                <option value="PERCENTAGE">Porcentagem (%)</option>
                                <option value="FIXED">Valor Fixo (R$)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor do Desconto</label>
                            <input type="number" placeholder="0.00" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden mt-4">
                        <div className="flex bg-gray-100 p-1">
                            <button onClick={() => setActiveTab('ITEMS')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ITEMS' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-200'}`}>ITENS ({itemIds.size})</button>
                            <button onClick={() => setActiveTab('COMBOS')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'COMBOS' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-200'}`}>COMBOS ({comboIds.size})</button>
                            <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'CATEGORIES' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-200'}`}>CATEGORIAS ({categoryIds.size})</button>
                        </div>
                        
                        <div className="p-4 bg-gray-50 h-48 overflow-y-auto">
                            {activeTab === 'ITEMS' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {menuItems.map(item => (
                                        <label key={item.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-orange-50 has-[:checked]:border-orange-300">
                                            <input type="checkbox" checked={itemIds.has(item.id)} onChange={() => toggleSelection(item.id, 'ITEMS')} className="h-4 w-4 rounded text-orange-600"/>
                                            <span className="text-sm truncate">{item.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'COMBOS' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {combos.map(combo => (
                                        <label key={combo.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-orange-50 has-[:checked]:border-orange-300">
                                            <input type="checkbox" checked={comboIds.has(combo.id)} onChange={() => toggleSelection(combo.id, 'COMBOS')} className="h-4 w-4 rounded text-orange-600"/>
                                            <span className="text-sm truncate">{combo.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'CATEGORIES' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-orange-50 has-[:checked]:border-orange-300">
                                            <input type="checkbox" checked={categoryIds.has(cat.id)} onChange={() => toggleSelection(cat.id, 'CATEGORIES')} className="h-4 w-4 rounded text-orange-600"/>
                                            <span className="text-sm truncate">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {(activeTab === 'ITEMS' && menuItems.length === 0) && <p className="text-center text-gray-400 py-10">Nenhum item disponível.</p>}
                            {(activeTab === 'COMBOS' && combos.length === 0) && <p className="text-center text-gray-400 py-10">Nenhum combo disponível.</p>}
                            {(activeTab === 'CATEGORIES' && categories.length === 0) && <p className="text-center text-gray-400 py-10">Nenhuma categoria disponível.</p>}
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 font-bold">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">Salvar Promoção</button>
                </div>
            </div>
        </div>
    );
};

export default PromotionEditorModal;
