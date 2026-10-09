
import React, { useState, useEffect } from 'react';
import type { Promotion, MenuItem, Combo, MenuCategory } from '../types';
import { DAYS_OF_WEEK, ALL_DAYS, MON_TO_THU, MON_TO_FRI, FRI_TO_SUN, WEEKEND_DAYS, formatPromoDays } from '../utils/promoUtils';

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
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | 'UPSELL'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [availableDays, setAvailableDays] = useState<number[]>(ALL_DAYS);
    const [availableStartTime, setAvailableStartTime] = useState('');
    const [availableEndTime, setAvailableEndTime] = useState('');
    
    // Upsell Promo states (ex: Na compra de qualquer Pizza leve Pizza Broto por +R$ 14,99)
    const [upsellTitle, setUpsellTitle] = useState('');
    const [upsellDescription, setUpsellDescription] = useState('');
    const [upsellPrice, setUpsellPrice] = useState('');
    const [upsellOptionsStr, setUpsellOptionsStr] = useState('');
    
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
            setDiscountType(existingPromotion.discountType || 'PERCENTAGE');
            setDiscountValue(existingPromotion.discountValue != null ? existingPromotion.discountValue.toString() : '');
            setAvailableDays(existingPromotion.availableDays && existingPromotion.availableDays.length > 0 ? existingPromotion.availableDays : ALL_DAYS);
            setAvailableStartTime(existingPromotion.availableStartTime || '');
            setAvailableEndTime(existingPromotion.availableEndTime || '');
            setUpsellTitle(existingPromotion.upsellTitle || '');
            setUpsellDescription(existingPromotion.upsellDescription || '');
            setUpsellPrice(existingPromotion.upsellPrice != null ? existingPromotion.upsellPrice.toString() : '');
            setUpsellOptionsStr((existingPromotion.upsellOptions || []).join(', '));
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
            setAvailableDays(ALL_DAYS);
            setAvailableStartTime('');
            setAvailableEndTime('');
            setUpsellTitle('');
            setUpsellDescription('');
            setUpsellPrice('');
            setUpsellOptionsStr('');
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
        if (!name || !startDate || !endDate) {
            setError('Campos obrigatórios: Nome e Datas de Validade.');
            return;
        }

        if (discountType === 'UPSELL') {
            if (!upsellTitle || !upsellPrice) {
                setError('Para promoções Compre e Leve, informe o Nome do Item Ofertado e o Preço Promocional.');
                return;
            }
        } else {
            if (!discountValue) {
                setError('Informe o valor do desconto.');
                return;
            }
        }

        if (itemIds.size === 0 && comboIds.size === 0 && categoryIds.size === 0) {
            setError('Selecione pelo menos uma categoria ou produto participante da promoção.');
            return;
        }

        const numericDiscount = discountType === 'UPSELL' ? (parseFloat(upsellPrice) || 0) : parseFloat(discountValue);
        if (isNaN(numericDiscount) || numericDiscount <= 0) {
            setError('O valor deve ser um número positivo maior que zero.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('A data de início não pode ser posterior à data de término.');
            return;
        }

        const parsedOptions = upsellOptionsStr
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

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
            availableDays: availableDays && availableDays.length > 0 ? availableDays : ALL_DAYS,
            availableStartTime: availableStartTime || undefined,
            availableEndTime: availableEndTime || undefined,
            upsellTitle: discountType === 'UPSELL' ? upsellTitle : undefined,
            upsellDescription: discountType === 'UPSELL' ? upsellDescription : undefined,
            upsellPrice: discountType === 'UPSELL' ? numericDiscount : undefined,
            upsellOptions: discountType === 'UPSELL' && parsedOptions.length > 0 ? parsedOptions : undefined
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

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
                        <label className="block text-xs font-bold text-gray-700 uppercase">
                            Mecânica / Tipo da Promoção
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setDiscountType('PERCENTAGE')}
                                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                                    discountType === 'PERCENTAGE'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : 'bg-white text-gray-800 border-gray-200 hover:bg-orange-50'
                                }`}
                            >
                                <span>% Desconto Porcentagem</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: 10% OFF nos produtos</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('FIXED')}
                                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                                    discountType === 'FIXED'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : 'bg-white text-gray-800 border-gray-200 hover:bg-orange-50'
                                }`}
                            >
                                <span>R$ Desconto Fixo</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: R$ 5,00 OFF no item</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('UPSELL')}
                                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                                    discountType === 'UPSELL'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                        : 'bg-white text-gray-800 border-orange-300 hover:bg-orange-50'
                                }`}
                            >
                                <span>🎁 Compre e Leve por +R$</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: Leve Pizza Broto por +R$ 14,99</span>
                            </button>
                        </div>

                        {discountType !== 'UPSELL' ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {discountType === 'PERCENTAGE' ? 'Porcentagem de Desconto (%)' : 'Valor do Desconto (R$)'}
                                </label>
                                <input 
                                    type="number" 
                                    placeholder={discountType === 'PERCENTAGE' ? 'Ex: 10' : 'Ex: 5.00'} 
                                    value={discountValue} 
                                    onChange={e => setDiscountValue(e.target.value)} 
                                    className="w-full p-2.5 border rounded-lg bg-white font-mono font-bold"
                                />
                            </div>
                        ) : (
                            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3 mt-2">
                                <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
                                    <span className="text-xl">🎁</span>
                                    <div>
                                        <h4 className="text-xs font-black text-amber-900 uppercase">Configuração da Oferta Compre e Leve</h4>
                                        <p className="text-[11px] text-amber-700">Ao comprar qualquer item participante, o cliente poderá adicionar esta oferta especial.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Item Ofertado</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Pizza Broto Doce ou Copo de Açaí 300ml" 
                                            value={upsellTitle} 
                                            onChange={e => setUpsellTitle(e.target.value)} 
                                            className="w-full p-2.5 border border-amber-300 rounded-lg bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preço Especial Adicional (+ R$)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="Ex: 14.99 ou 9.99" 
                                            value={upsellPrice} 
                                            onChange={e => setUpsellPrice(e.target.value)} 
                                            className="w-full p-2.5 border border-amber-300 rounded-lg bg-white font-mono font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Sabores / Opções Disponíveis (opcional, separados por vírgula)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Prestígio, Brigadeiro (ou deixe vazio se não houver escolha)" 
                                        value={upsellOptionsStr} 
                                        onChange={e => setUpsellOptionsStr(e.target.value)} 
                                        className="w-full p-2.5 border border-amber-300 rounded-lg bg-white text-sm"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">O cliente poderá escolher entre esses sabores ao aceitar a promoção.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frase Chamativa no Modal (opcional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Com mais R$ 14,99 leve uma Pizza Broto para adoçar seu dia!" 
                                        value={upsellDescription} 
                                        onChange={e => setUpsellDescription(e.target.value)} 
                                        className="w-full p-2.5 border border-amber-300 rounded-lg bg-white text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Faixa de Horário Opcional (Ex: 13:00 às 18:00) */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 uppercase">
                                ⏰ Faixa de Horário Válida (Opcional)
                            </label>
                            {(availableStartTime || availableEndTime) && (
                                <button
                                    type="button"
                                    onClick={() => { setAvailableStartTime(''); setAvailableEndTime(''); }}
                                    className="text-[11px] text-orange-600 font-bold hover:underline"
                                >
                                    Limpar Horário
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Deixe em branco para valer o dia todo, ou defina horários específicos (ex: das 13:00 às 18:00):
                        </p>
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div>
                                <span className="text-[10px] text-gray-500 block mb-0.5">Horário Inicial:</span>
                                <input
                                    type="time"
                                    value={availableStartTime}
                                    onChange={e => setAvailableStartTime(e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-white font-mono text-sm"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 block mb-0.5">Horário Final:</span>
                                <input
                                    type="time"
                                    value={availableEndTime}
                                    onChange={e => setAvailableEndTime(e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-white font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('13:00'); setAvailableEndTime('18:00'); }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg border bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                                Tarde (13:00 - 18:00)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('11:00'); setAvailableEndTime('15:00'); }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Almoço (11:00 - 15:00)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('18:00'); setAvailableEndTime('23:30'); }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Noite (18:00 - 23:30)
                            </button>
                        </div>
                    </div>

                    {/* Dias da Semana Ativos */}
                    <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 uppercase">
                                🗓️ Dias da Semana da Promoção
                            </label>
                            <span className="text-xs font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                                {formatPromoDays(availableDays)}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            A promoção só concederá desconto nos dias da semana definidos (ex: somente de segunda a quinta):
                        </p>
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
                                        : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-100/50'
                                }`}
                            >
                                Segunda a Quinta 🔥
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvailableDays(MON_TO_FRI)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    JSON.stringify([...availableDays].sort((a,b)=>a-b)) === JSON.stringify(MON_TO_FRI)
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Segunda a Sexta
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvailableDays(FRI_TO_SUN)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                    JSON.stringify([...availableDays].sort((a,b)=>a-b)) === JSON.stringify([0, 5, 6])
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                Sexta a Domingo
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 pt-1">
                            {DAYS_OF_WEEK.map(d => {
                                const isSelected = availableDays.includes(d.index);
                                return (
                                    <button
                                        key={d.index}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                const updated = availableDays.filter(x => x !== d.index);
                                                setAvailableDays(updated.length > 0 ? updated : [d.index]);
                                            } else {
                                                setAvailableDays([...availableDays, d.index].sort((a,b)=>a-b));
                                            }
                                        }}
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                            isSelected 
                                                ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {d.abbr}
                                    </button>
                                );
                            })}
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
