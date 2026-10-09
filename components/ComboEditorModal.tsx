import React, { useState, useEffect } from 'react';
import type { Combo, MenuItem } from '../types';
import { DAYS_OF_WEEK, ALL_DAYS, MON_TO_THU, MON_TO_FRI, FRI_TO_SUN, formatPromoDays } from '../utils/promoUtils';

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
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
    const [availableDays, setAvailableDays] = useState<number[]>(ALL_DAYS);
    const [availableStartTime, setAvailableStartTime] = useState('');
    const [availableEndTime, setAvailableEndTime] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingCombo) {
            setName(existingCombo.name);
            setDescription(existingCombo.description);
            setPrice(existingCombo.price.toString());
            setImageUrl(existingCombo.imageUrl);
            setSelectedItemIds(new Set(existingCombo.menuItemIds));
            setAvailableDays(existingCombo.availableDays && existingCombo.availableDays.length > 0 ? existingCombo.availableDays : ALL_DAYS);
            setAvailableStartTime(existingCombo.availableStartTime || '');
            setAvailableEndTime(existingCombo.availableEndTime || '');
        } else {
            setName('');
            setDescription('');
            setPrice('');
            setImageUrl('');
            setSelectedItemIds(new Set());
            setAvailableDays(ALL_DAYS);
            setAvailableStartTime('');
            setAvailableEndTime('');
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

    const handleDayToggle = (dayIndex: number) => {
        setAvailableDays(prev => {
            if (prev.includes(dayIndex)) {
                if (prev.length === 1) return prev; // Pelo menos um dia deve permanecer
                return prev.filter(d => d !== dayIndex);
            } else {
                return [...prev, dayIndex].sort((a, b) => a - b);
            }
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
            availableDays: availableDays && availableDays.length > 0 ? availableDays : ALL_DAYS,
            availableStartTime: availableStartTime || undefined,
            availableEndTime: availableEndTime || undefined,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="combo-editor-modal-title">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="combo-editor-modal-title" className="text-2xl font-bold mb-4">{existingCombo ? 'Editar Combo' : 'Criar Novo Combo'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Combo</label>
                        <input
                            type="text"
                            placeholder="Nome do Combo (ex: Combo da Tarde, Combo Família)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border rounded-xl bg-gray-50 text-sm font-bold text-gray-800"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                        <textarea
                            placeholder="Descreva o que acompanha o combo (ex: 1 Pastel + 1 Bebida + 1 Açaí 330ml)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border rounded-xl bg-gray-50 text-sm"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Fechado (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Preço (ex: 39.99)"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full p-3 border rounded-xl bg-gray-50 font-mono font-bold text-lg text-orange-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Imagem</label>
                            <input
                                type="text"
                                placeholder="URL da foto do combo"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full p-3 border rounded-xl bg-gray-50 text-sm"
                            />
                        </div>
                    </div>

                    {/* HORÁRIO DE VENDA (EX: COMBO DA TARDE 13H ÀS 18H) */}
                    <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-orange-950 uppercase flex items-center gap-1.5">
                                <span>⏰</span>
                                <span>Faixa de Horário de Venda (Opcional)</span>
                            </label>
                            {(availableStartTime || availableEndTime) && (
                                <button
                                    type="button"
                                    onClick={() => { setAvailableStartTime(''); setAvailableEndTime(''); }}
                                    className="text-xs text-orange-600 font-bold hover:underline"
                                >
                                    Limpar Horário
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-600">
                            Ideal para <strong>Combo da Tarde</strong>, <strong>Combo Almoço</strong>, etc. Clientes só poderão pedir dentro desse horário.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Início:</span>
                                <input
                                    type="time"
                                    value={availableStartTime}
                                    onChange={(e) => setAvailableStartTime(e.target.value)}
                                    className="w-full p-2.5 border rounded-xl bg-white font-mono text-sm font-bold"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Término:</span>
                                <input
                                    type="time"
                                    value={availableEndTime}
                                    onChange={(e) => setAvailableEndTime(e.target.value)}
                                    className="w-full p-2.5 border rounded-xl bg-white font-mono text-sm font-bold"
                                />
                            </div>
                        </div>

                        {/* Atalhos Rápidos */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1 self-center">Atalhos:</span>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('13:00'); setAvailableEndTime('18:00'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-orange-300 text-orange-800 hover:bg-orange-100/50"
                            >
                                Combo da Tarde (13h - 18h) 🔥
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('11:00'); setAvailableEndTime('15:00'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Almoço (11h - 15h)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('18:00'); setAvailableEndTime('23:30'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Noite (18h - 23h30)
                            </button>
                        </div>
                    </div>

                    {/* DIAS DA SEMANA */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 uppercase">
                                🗓️ Dias da Semana Disponíveis
                            </label>
                            <span className="text-xs font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                                {formatPromoDays(availableDays)}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setAvailableDays(ALL_DAYS)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    JSON.stringify([...availableDays].sort((a,b)=>a-b)) === JSON.stringify(ALL_DAYS)
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Todos os dias
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvailableDays(MON_TO_THU)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    JSON.stringify([...availableDays].sort((a,b)=>a-b)) === JSON.stringify(MON_TO_THU)
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Seg a Qui
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvailableDays(FRI_TO_SUN)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    JSON.stringify([...availableDays].sort((a,b)=>a-b)) === JSON.stringify(FRI_TO_SUN)
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Sex a Dom 🔥
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 pt-1">
                            {DAYS_OF_WEEK.map(day => {
                                const isSelected = availableDays.includes(day.index);
                                return (
                                    <button
                                        key={day.index}
                                        type="button"
                                        onClick={() => handleDayToggle(day.index)}
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                            isSelected
                                                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day.short}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-sm text-gray-800 mb-2">Selecione os Itens que compõem o Combo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-xl max-h-48 overflow-y-auto bg-gray-50">
                            {menuItems.map(item => (
                                <label key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-300 border border-transparent">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIds.has(item.id)}
                                        onChange={() => handleItemToggle(item.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-xs font-bold mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 text-sm">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-md text-sm">Salvar Combo</button>
                </div>
            </div>
        </div>
    );
};

export default ComboEditorModal;