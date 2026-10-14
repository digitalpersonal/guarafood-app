import React, { useState, useEffect, useMemo } from 'react';
import type { Promotion, MenuItem, Combo, MenuCategory, OptionGroup, CustomizationOption } from '../types';
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

export const PromotionEditorModal: React.FC<PromotionEditorModalProps> = ({ isOpen, onClose, onSave, existingPromotion, menuItems, combos, categories }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | 'UPSELL'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [availableDays, setAvailableDays] = useState<number[]>(ALL_DAYS);
    const [availableStartTime, setAvailableStartTime] = useState('');
    const [availableEndTime, setAvailableEndTime] = useState('');
    
    // Upsell Promo states
    const [upsellTitle, setUpsellTitle] = useState('');
    const [upsellDescription, setUpsellDescription] = useState('');
    const [upsellPrice, setUpsellPrice] = useState('');
    const [upsellOptionsStr, setUpsellOptionsStr] = useState('');
    const [upsellMaxSelections, setUpsellMaxSelections] = useState('1');
    
    // Option Groups for turbocharging promotion configuration (just like product items)
    const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
    
    // --- CATEGORY IMPORT MODAL STATES ---
    const [isCategoryImportModalOpen, setIsCategoryImportModalOpen] = useState(false);
    const [categoryImportTargetGroupId, setCategoryImportTargetGroupId] = useState<string | null>(null);
    const [selectedImportCategory, setSelectedImportCategory] = useState<string>('');
    const [categoryImportItemSelection, setCategoryImportItemSelection] = useState<Set<number>>(new Set());
    const [categoryImportPriceMode, setCategoryImportPriceMode] = useState<'FREE' | 'ORIGINAL'>('FREE');
    const [categoryImportMode, setCategoryImportMode] = useState<'REPLACE' | 'APPEND'>('APPEND');
    const [categoryImportGroupTitle, setCategoryImportGroupTitle] = useState('');
    const [categoryImportMin, setCategoryImportMin] = useState(1);
    const [categoryImportMax, setCategoryImportMax] = useState(1);

    // Multi-select states
    const [itemIds, setItemIds] = useState<Set<number>>(new Set());
    const [comboIds, setComboIds] = useState<Set<number>>(new Set());
    const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'ITEMS' | 'COMBOS' | 'CATEGORIES'>('ITEMS');

    const availableCategoryList = useMemo(() => {
        if (categories && categories.length > 0) {
            return categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                items: cat.items || []
            }));
        }
        return [];
    }, [categories]);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
            setUpsellMaxSelections(existingPromotion.upsellMaxSelections != null ? existingPromotion.upsellMaxSelections.toString() : '1');
            setOptionGroups(existingPromotion.optionGroups || []);
            setItemIds(new Set(existingPromotion.itemIds || []));
            setComboIds(new Set(existingPromotion.comboIds || []));
            setCategoryIds(new Set(existingPromotion.categoryIds || []));
            setStartDate(existingPromotion.startDate ? existingPromotion.startDate.split('T')[0] : today);
            setEndDate(existingPromotion.endDate ? existingPromotion.endDate.split('T')[0] : nextYear);
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
            setUpsellMaxSelections('1');
            setOptionGroups([]);
            setItemIds(new Set());
            setComboIds(new Set());
            setCategoryIds(new Set());
            setStartDate(today);
            setEndDate(nextYear);
        }
        setError('');
    }, [existingPromotion, isOpen]);

    // Apply Intelligent Preset Templates
    const applyPreset = (preset: 'ESFIHA_6' | 'HAPPY_HOUR' | 'UPSELL_PIZZA' | 'WEEKEND_COMBO' | 'FIXED_PIZZA') => {
        if (preset === 'ESFIHA_6') {
            setName('Caixa com 6 Esfihas Selecionadas');
            setDescription('Escolha 6 deliciosos sabores de esfiha para sua caixa promocional!');
            setDiscountType('UPSELL');
            setUpsellTitle('Caixa de Esfihas (6 unidades)');
            setUpsellPrice('39.90');
            setUpsellMaxSelections('6');
            setUpsellOptionsStr('Carne, Frango com Catupiry, Queijo, Calabresa, Margherita, Palmito');
            setAvailableDays(ALL_DAYS);
        } else if (preset === 'HAPPY_HOUR') {
            setName('Happy Hour de Bebidas e Porções');
            setDescription('Desconto especial válido de segunda a quinta no horário das 18h às 20h.');
            setDiscountType('PERCENTAGE');
            setDiscountValue('15');
            setAvailableDays(MON_TO_THU);
            setAvailableStartTime('18:00');
            setAvailableEndTime('20:00');
        } else if (preset === 'UPSELL_PIZZA') {
            setName('Na Compra de uma Pizza, Leve Pizza Broto Doce');
            setDescription('Adicione uma Pizza Broto Doce por apenas mais R$ 14,99!');
            setDiscountType('UPSELL');
            setUpsellTitle('Pizza Broto Doce');
            setUpsellPrice('14.99');
            setUpsellMaxSelections('1');
            setUpsellOptionsStr('Prestígio, Brigadeiro, Doce de Leite com Confete');
            setAvailableDays(ALL_DAYS);
        } else if (preset === 'WEEKEND_COMBO') {
            setName('Super Desconto de Fim de Semana');
            setDescription('Desconto fixo de R$ 10,00 nos melhores combos de sexta a domingo.');
            setDiscountType('FIXED');
            setDiscountValue('10.00');
            setAvailableDays(FRI_TO_SUN);
            setAvailableStartTime('');
            setAvailableEndTime('');
        } else if (preset === 'FIXED_PIZZA') {
            setName('Festival de Pizzas (Preço Único)');
            setDescription('Qualquer sabor de pizza participante por valor fixo promocional.');
            setDiscountType('PERCENTAGE');
            setDiscountValue('20');
            setAvailableDays(ALL_DAYS);
        }
    };

    const toggleSelection = (id: number, type: 'ITEMS' | 'COMBOS' | 'CATEGORIES') => {
        const setter = type === 'ITEMS' ? setItemIds : type === 'COMBOS' ? setComboIds : setCategoryIds;
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Option Group Management Handlers
    const addOptionGroup = () => {
        const newGroup: OptionGroup = {
            id: crypto.randomUUID(),
            title: '',
            minSelections: 0,
            maxSelections: 1,
            options: [{ name: '', price: 0 }],
            allowQuantityPerOption: false
        };
        setOptionGroups([...optionGroups, newGroup]);
    };

    const removeOptionGroup = (groupId: string) => {
        setOptionGroups(optionGroups.filter(g => g.id !== groupId));
    };

    const updateOptionGroup = (groupId: string, field: keyof OptionGroup, value: any) => {
        setOptionGroups(optionGroups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
    };

    const addOptionToGroup = (groupId: string) => {
        setOptionGroups(optionGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, options: [...g.options, { name: '', price: 0 }] };
            }
            return g;
        }));
    };

    const removeOptionFromGroup = (groupId: string, optionIndex: number) => {
        setOptionGroups(optionGroups.map(g => {
            if (g.id === groupId) {
                return { ...g, options: g.options.filter((_, i) => i !== optionIndex) };
            }
            return g;
        }));
    };

    const updateOptionInGroup = (groupId: string, optionIndex: number, field: keyof CustomizationOption, value: any) => {
        setOptionGroups(optionGroups.map(g => {
            if (g.id === groupId) {
                const newOptions = [...g.options];
                newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
                return { ...g, options: newOptions };
            }
            return g;
        }));
    };

    // Category Import Handlers ("Puxar de Categoria")
    const handleOpenCategoryImport = (groupId: string | null = null, defaultCategory: string = '') => {
        setCategoryImportTargetGroupId(groupId);
        const existingGroup = groupId ? optionGroups.find(g => g.id === groupId) : null;
        
        const initialCat = defaultCategory || (availableCategoryList.length > 0 ? availableCategoryList[0].name : '');
        setSelectedImportCategory(initialCat);
        
        const catData = availableCategoryList.find(c => c.name === initialCat);
        const allIds = new Set<number>((catData?.items || []).map(i => i.id));
        setCategoryImportItemSelection(allIds);
        
        setCategoryImportPriceMode('FREE');
        setCategoryImportMode(existingGroup ? 'REPLACE' : 'APPEND');
        setCategoryImportGroupTitle(existingGroup?.title || (initialCat ? `Escolha seu(sua) ${initialCat}` : 'Escolha a Opção'));
        setCategoryImportMin(existingGroup?.minSelections !== undefined ? existingGroup.minSelections : 1);
        setCategoryImportMax(existingGroup?.maxSelections !== undefined ? existingGroup.maxSelections : 1);
        
        setIsCategoryImportModalOpen(true);
    };

    const handleSelectCategoryForImport = (catName: string) => {
        setSelectedImportCategory(catName);
        const catData = availableCategoryList.find(c => c.name === catName);
        const allIds = new Set<number>((catData?.items || []).map(i => i.id));
        setCategoryImportItemSelection(allIds);
        
        if (!categoryImportGroupTitle || categoryImportGroupTitle.startsWith('Escolha seu') || categoryImportGroupTitle === 'Opções') {
            setCategoryImportGroupTitle(`Escolha seu(sua) ${catName}`);
        }
    };

    const handleConfirmCategoryImport = () => {
        const catData = availableCategoryList.find(c => c.name === selectedImportCategory);
        if (!catData || catData.items.length === 0) {
            alert('Nenhum produto encontrado nesta categoria.');
            return;
        }

        const selectedItems = catData.items.filter(i => categoryImportItemSelection.has(i.id));
        if (selectedItems.length === 0) {
            alert('Selecione pelo menos um produto para importar.');
            return;
        }

        const newOptions: CustomizationOption[] = selectedItems.map(item => ({
            name: item.name,
            price: categoryImportPriceMode === 'FREE' ? 0 : (Number(item.price) || 0)
        }));

        if (categoryImportTargetGroupId) {
            setOptionGroups(prev => prev.map(group => {
                if (group.id !== categoryImportTargetGroupId) return group;
                return {
                    ...group,
                    title: categoryImportGroupTitle.trim() || group.title,
                    minSelections: categoryImportMin,
                    maxSelections: categoryImportMax,
                    options: categoryImportMode === 'REPLACE' ? newOptions : [...group.options, ...newOptions]
                };
            }));
        } else {
            const newGroup: OptionGroup = {
                id: crypto.randomUUID(),
                title: categoryImportGroupTitle.trim() || `Escolha seu(sua) ${selectedImportCategory}`,
                minSelections: categoryImportMin,
                maxSelections: categoryImportMax,
                options: newOptions,
                allowQuantityPerOption: true
            };
            setOptionGroups(prev => [...prev, newGroup]);
        }

        setIsCategoryImportModalOpen(false);
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
            setError('Selecione pelo menos uma categoria, produto ou combo participante da promoção.');
            return;
        }

        const numericDiscount = discountType === 'UPSELL' ? (parseFloat(upsellPrice) || 0) : parseFloat(discountValue);
        if (isNaN(numericDiscount) || numericDiscount < 0) {
            setError('O valor deve ser um número válido.');
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
            upsellOptions: discountType === 'UPSELL' && parsedOptions.length > 0 ? parsedOptions : undefined,
            upsellMaxSelections: discountType === 'UPSELL' ? (parseInt(upsellMaxSelections) || 1) : undefined,
            optionGroups: optionGroups.length > 0 ? optionGroups : null
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">⚙️ Central de Configuração Avançada de Promoções</h2>
                        <p className="text-xs text-slate-300">Liberdade total, grupos de opcionais, quantidade por sabor e flexibilidade inteligente.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1">×</button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Presets Inteligentes */}
                    {!existingPromotion && (
                        <div className="bg-orange-50/85 border border-orange-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
                            <span className="text-xs font-black text-orange-900 uppercase tracking-wide block">⚡ Modelos de Promoção Prontos (Presets Inteligentes):</span>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => applyPreset('ESFIHA_6')} className="px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-orange-900 hover:bg-orange-100 shadow-xs cursor-pointer">
                                    📦 Caixa 6 Esfihas
                                </button>
                                <button type="button" onClick={() => applyPreset('HAPPY_HOUR')} className="px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-orange-900 hover:bg-orange-100 shadow-xs cursor-pointer">
                                    ⏰ Happy Hour (Seg-Qui 18h-20h)
                                </button>
                                <button type="button" onClick={() => applyPreset('UPSELL_PIZZA')} className="px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-orange-900 hover:bg-orange-100 shadow-xs cursor-pointer">
                                    🎁 Compre Pizza + Broto Doce
                                </button>
                                <button type="button" onClick={() => applyPreset('WEEKEND_COMBO')} className="px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-orange-900 hover:bg-orange-100 shadow-xs cursor-pointer">
                                    🎉 Desconto Fixo Fim de Semana
                                </button>
                                <button type="button" onClick={() => applyPreset('FIXED_PIZZA')} className="px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-bold text-orange-900 hover:bg-orange-100 shadow-xs cursor-pointer">
                                    🍕 Festival de Pizzas
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Promoção *</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Terça Maluca ou Happy Hour" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-medium focus:bg-white focus:border-orange-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição Curta (Vitrine)</label>
                            <input 
                                type="text" 
                                placeholder="Ex: 15% OFF em todos os itens selecionados" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-2.5 border rounded-xl bg-slate-50 text-sm font-medium focus:bg-white focus:border-orange-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Vigência / Datas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">📅 Data de Início *</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm font-medium"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">📅 Data de Término *</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm font-medium"/>
                        </div>
                    </div>

                    {/* Mecânica / Tipo da Promoção */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                            🎯 Mecânica / Tipo de Promoção
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDiscountType('PERCENTAGE')}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                                    discountType === 'PERCENTAGE'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                        : 'bg-white text-slate-800 border-slate-200 hover:bg-orange-50'
                                }`}
                            >
                                <span className="text-sm font-black">% Desconto Porcentagem</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: 10% ou 20% OFF</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('FIXED')}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                                    discountType === 'FIXED'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                        : 'bg-white text-slate-800 border-slate-200 hover:bg-orange-50'
                                }`}
                            >
                                <span className="text-sm font-black">R$ Desconto Fixo</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: R$ 5,00 ou R$ 10,00 OFF</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('UPSELL')}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                                    discountType === 'UPSELL'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                        : 'bg-white text-slate-800 border-orange-300 hover:bg-orange-50'
                                }`}
                            >
                                <span className="text-sm font-black">🎁 Compre e Leve / Combo</span>
                                <span className="text-[10px] opacity-80 mt-1">Ex: 6 Esfihas ou Pizza por +R$ 14,99</span>
                            </button>
                        </div>

                        {discountType !== 'UPSELL' ? (
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                    {discountType === 'PERCENTAGE' ? 'Porcentagem de Desconto (%)' : 'Valor do Desconto (R$)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    placeholder={discountType === 'PERCENTAGE' ? 'Ex: 15' : 'Ex: 10.00'} 
                                    value={discountValue} 
                                    onChange={e => setDiscountValue(e.target.value)} 
                                    className="w-full p-3 border rounded-xl bg-white font-mono font-bold text-sm shadow-xs"
                                />
                            </div>
                        ) : (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3.5 mt-2">
                                <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                                    <span className="text-xl">🎁</span>
                                    <div>
                                        <h4 className="text-xs font-black text-amber-900 uppercase">Configuração Avançada Compre e Leve / Combos</h4>
                                        <p className="text-[11px] text-amber-700">Configure itens adicionais, caixas com múltiplos sabores ou produtos acoplados.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Item Ofertado *</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Caixa de 6 Esfihas ou Pizza Broto" 
                                            value={upsellTitle} 
                                            onChange={e => setUpsellTitle(e.target.value)} 
                                            className="w-full p-2.5 border border-amber-300 rounded-xl bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Preço Promocional Adicional (+ R$) *</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="Ex: 39.90 ou 14.99" 
                                            value={upsellPrice} 
                                            onChange={e => setUpsellPrice(e.target.value)} 
                                            className="w-full p-2.5 border border-amber-300 rounded-xl bg-white font-mono font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Sabores / Opções Disponíveis (separados por vírgula)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Carne, Frango, Queijo, Calabresa, Margherita" 
                                        value={upsellOptionsStr} 
                                        onChange={e => setUpsellOptionsStr(e.target.value)} 
                                        className="w-full p-2.5 border border-amber-300 rounded-xl bg-white text-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Esses sabores serão exibidos para o cliente escolher ao adicionar o combo.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                                        Quantidade de Escolhas Permitidas (Ex: 1 para sabor único, 6 para caixa de 6 esfihas)
                                    </label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        placeholder="Ex: 1, 2, 6" 
                                        value={upsellMaxSelections} 
                                        onChange={e => setUpsellMaxSelections(e.target.value)} 
                                        className="w-full p-2.5 border border-amber-300 rounded-xl bg-white font-mono font-bold text-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Número exato ou máximo de sabores que o cliente pode escolher nesta promoção.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Frase Chamativa / Descrição no Modal</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Aproveite nossa caixa com 6 esfihas fresquinhas por um preço imperdível!" 
                                        value={upsellDescription} 
                                        onChange={e => setUpsellDescription(e.target.value)} 
                                        className="w-full p-2.5 border border-amber-300 rounded-xl bg-white text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- GRUPOS DE OPCIONAIS DA PROMOÇÃO (TURBINADO COM PUXAR DE CATEGORIA E QUANTIDADE POR OPÇÃO) --- */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase">🍔 Grupos de Opcionais & Sabores da Promoção</h3>
                                <p className="text-xs text-slate-600">Adicione grupos de escolha livre (ex: escolha os sabores da caixa, molhos, adicionais e quantidade por sabor).</p>
                            </div>
                            <div className="flex gap-2">
                                {availableCategoryList.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCategoryImport(null)}
                                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>📂 Puxar de Categoria</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={addOptionGroup}
                                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <span>➕ Adicionar Grupo</span>
                                </button>
                            </div>
                        </div>

                        {optionGroups.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-xs text-slate-500 font-medium">Nenhum grupo de opcionais cadastrado para esta promoção.</p>
                                <p className="text-[10px] text-slate-400 mt-1">Use "📂 Puxar de Categoria" para importar automaticamente todos os itens de uma categoria (ex: Esfihas, Pizzas) para a escolha da promoção.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {optionGroups.map((group, groupIdx) => (
                                    <div key={group.id} className="bg-white border-2 border-orange-200 rounded-2xl p-4 space-y-3 shadow-xs">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Título do Grupo #{groupIdx + 1}</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Escolha os 6 Sabores das Esfihas"
                                                    value={group.title}
                                                    onChange={(e) => updateOptionGroup(group.id, 'title', e.target.value)}
                                                    className="w-full p-2.5 border rounded-xl font-bold text-sm bg-slate-50 focus:bg-white"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mínimo</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={group.minSelections}
                                                    onChange={(e) => updateOptionGroup(group.id, 'minSelections', parseInt(e.target.value) || 0)}
                                                    className="w-full p-2.5 border rounded-xl font-bold text-sm bg-slate-50 text-center"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Máximo</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={group.maxSelections}
                                                    onChange={(e) => updateOptionGroup(group.id, 'maxSelections', parseInt(e.target.value) || 1)}
                                                    className="w-full p-2.5 border rounded-xl font-bold text-sm bg-slate-50 text-center"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeOptionGroup(group.id)}
                                                className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                title="Remover Grupo"
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        {/* Permissão de Quantidade por Opção (Ex: 2x Carne, 1x Frango) */}
                                        <div className="flex items-center justify-between bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">🔢</span>
                                                <div>
                                                    <p className="text-xs font-black text-gray-800">Permitir quantidade por opção (Múltiplas unidades do mesmo sabor)</p>
                                                    <p className="text-[10px] text-gray-500">Ex: Cliente pode escolher 3x Esfiha de Carne e 3x Esfiha de Frango (Total 6).</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={group.allowQuantityPerOption || false}
                                                    onChange={(e) => updateOptionGroup(group.id, 'allowQuantityPerOption', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                            </label>
                                        </div>

                                        {/* Opções / Sabores do Grupo */}
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-500">Opções / Sabores do Grupo:</span>
                                                {availableCategoryList.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenCategoryImport(group.id)}
                                                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                                    >
                                                        + Puxar itens de categoria neste grupo
                                                    </button>
                                                )}
                                            </div>

                                            {group.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nome da opção (ex: Carne)"
                                                        value={opt.name}
                                                        onChange={(e) => updateOptionInGroup(group.id, optIdx, 'name', e.target.value)}
                                                        className="flex-1 p-2 border rounded-xl text-xs font-medium bg-slate-50 focus:bg-white"
                                                    />
                                                    <div className="relative w-32">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={opt.price}
                                                            onChange={(e) => updateOptionInGroup(group.id, optIdx, 'price', parseFloat(e.target.value) || 0)}
                                                            className="w-full p-2 pl-9 border rounded-xl text-xs font-mono font-bold bg-slate-50 focus:bg-white"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOptionFromGroup(group.id, optIdx)}
                                                        className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                                                        title="Remover Opção"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => addOptionToGroup(group.id)}
                                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-orange-200"
                                            >
                                                + Adicionar Opção Manual
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Faixa de Horário e Dias da Semana */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Horários */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase">
                                    ⏰ Faixa de Horário (Opcional)
                                </label>
                                {(availableStartTime || availableEndTime) && (
                                    <button type="button" onClick={() => { setAvailableStartTime(''); setAvailableEndTime(''); }} className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer">
                                        Limpar
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-slate-500 block mb-0.5">Início:</span>
                                    <input type="time" value={availableStartTime} onChange={e => setAvailableStartTime(e.target.value)} className="w-full p-2 border rounded-xl bg-white font-mono text-xs"/>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block mb-0.5">Fim:</span>
                                    <input type="time" value={availableEndTime} onChange={e => setAvailableEndTime(e.target.value)} className="w-full p-2 border rounded-xl bg-white font-mono text-xs"/>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <button type="button" onClick={() => { setAvailableStartTime('18:00'); setAvailableEndTime('23:30'); }} className="px-2 py-1 text-[10px] font-bold rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                    Noite (18h - 23:30)
                                </button>
                                <button type="button" onClick={() => { setAvailableStartTime('11:00'); setAvailableEndTime('15:00'); }} className="px-2 py-1 text-[10px] font-bold rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                    Almoço (11h - 15h)
                                </button>
                                <button type="button" onClick={() => { setAvailableStartTime('18:00'); setAvailableEndTime('20:00'); }} className="px-2 py-1 text-[10px] font-bold rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                    Happy Hour (18h - 20h)
                                </button>
                            </div>
                        </div>

                        {/* Dias da Semana */}
                        <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-700 uppercase">
                                    🗓️ Dias da Semana
                                </label>
                                <span className="text-[11px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                                    {formatPromoDays(availableDays)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <button type="button" onClick={() => setAvailableDays(ALL_DAYS)} className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${JSON.stringify([...availableDays].sort()) === JSON.stringify(ALL_DAYS) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                                    Todos
                                </button>
                                <button type="button" onClick={() => setAvailableDays(MON_TO_THU)} className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${JSON.stringify([...availableDays].sort()) === JSON.stringify(MON_TO_THU) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                                    Seg-Qui 🔥
                                </button>
                                <button type="button" onClick={() => setAvailableDays(FRI_TO_SUN)} className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${JSON.stringify([...availableDays].sort()) === JSON.stringify([0,5,6]) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                                    Sex-Dom
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
                                            className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                isSelected ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {d.abbr}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Seleção de Produtos, Combos e Categorias Participantes */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                        <div className="flex bg-slate-200/80 p-1.5 gap-1">
                            <button onClick={() => setActiveTab('ITEMS')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'ITEMS' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                Itens ({itemIds.size})
                            </button>
                            <button onClick={() => setActiveTab('COMBOS')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'COMBOS' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                Combos ({comboIds.size})
                            </button>
                            <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'CATEGORIES' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                Categorias ({categoryIds.size})
                            </button>
                        </div>
                        
                        <div className="p-4 bg-white h-52 overflow-y-auto">
                            {activeTab === 'ITEMS' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {menuItems.map(item => (
                                        <label key={item.id} className="flex items-center space-x-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-orange-50/60 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50/40 transition-colors">
                                            <input type="checkbox" checked={itemIds.has(item.id)} onChange={() => toggleSelection(item.id, 'ITEMS')} className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"/>
                                            <span className="text-xs font-medium text-slate-800 truncate">{item.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'COMBOS' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {combos.map(combo => (
                                        <label key={combo.id} className="flex items-center space-x-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-orange-50/60 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50/40 transition-colors">
                                            <input type="checkbox" checked={comboIds.has(combo.id)} onChange={() => toggleSelection(combo.id, 'COMBOS')} className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"/>
                                            <span className="text-xs font-medium text-slate-800 truncate">{combo.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'CATEGORIES' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center space-x-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-orange-50/60 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50/40 transition-colors">
                                            <input type="checkbox" checked={categoryIds.has(cat.id)} onChange={() => toggleSelection(cat.id, 'CATEGORIES')} className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"/>
                                            <span className="text-xs font-medium text-slate-800 truncate">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {(activeTab === 'ITEMS' && menuItems.length === 0) && <p className="text-center text-slate-400 py-12 text-xs">Nenhum item disponível.</p>}
                            {(activeTab === 'COMBOS' && combos.length === 0) && <p className="text-center text-slate-400 py-12 text-xs">Nenhum combo disponível.</p>}
                            {(activeTab === 'CATEGORIES' && categories.length === 0) && <p className="text-center text-slate-400 py-12 text-xs">Nenhuma categoria disponível.</p>}
                        </div>
                    </div>
                </div>

                {error && <div className="px-6 py-2 bg-red-50 border-t border-red-200 text-red-600 text-xs font-bold">{error}</div>}
                
                {/* Footer */}
                <div className="bg-slate-100 px-6 py-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md transition-colors cursor-pointer">
                        Salvar Promoção
                    </button>
                </div>
            </div>

            {/* --- MODAL DE PUXAR DE CATEGORIA --- */}
            {isCategoryImportModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsCategoryImportModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📂</span>
                                <div>
                                    <h3 className="text-base font-black text-gray-900 leading-tight">Puxar Produtos de Categoria</h3>
                                    <p className="text-xs text-gray-500 font-medium">Importe rapidamente todos os produtos de uma categoria para o grupo da promoção.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCategoryImportModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-bold p-1 text-lg leading-none cursor-pointer">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1">Selecione a Categoria de Origem</label>
                                <select
                                    value={selectedImportCategory}
                                    onChange={(e) => handleSelectCategoryForImport(e.target.value)}
                                    className="w-full p-3 border-2 border-orange-200 rounded-2xl bg-white font-bold text-sm text-gray-800"
                                >
                                    {availableCategoryList.map(cat => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name} ({cat.items.length} itens)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1">Título do Grupo Gerado</label>
                                <input
                                    type="text"
                                    value={categoryImportGroupTitle}
                                    onChange={(e) => setCategoryImportGroupTitle(e.target.value)}
                                    placeholder="Ex: Escolha suas Esfihas"
                                    className="w-full p-3 border rounded-xl font-bold text-sm bg-gray-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase mb-1">Mínimo de Escolhas</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={categoryImportMin}
                                        onChange={(e) => setCategoryImportMin(parseInt(e.target.value) || 0)}
                                        className="w-full p-3 border rounded-xl font-bold text-sm bg-gray-50 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase mb-1">Máximo de Escolhas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={categoryImportMax}
                                        onChange={(e) => setCategoryImportMax(parseInt(e.target.value) || 1)}
                                        className="w-full p-3 border rounded-xl font-bold text-sm bg-gray-50 text-center"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1.5">
                                    Itens da Categoria ({selectedImportCategory}):
                                </label>
                                <div className="max-h-48 overflow-y-auto border rounded-xl p-3 space-y-1.5 bg-gray-50">
                                    {availableCategoryList.find(c => c.name === selectedImportCategory)?.items.map(item => {
                                        const isSelected = categoryImportItemSelection.has(item.id);
                                        return (
                                            <label key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border cursor-pointer hover:bg-orange-50">
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            const next = new Set(categoryImportItemSelection);
                                                            if (next.has(item.id)) next.delete(item.id);
                                                            else next.add(item.id);
                                                            setCategoryImportItemSelection(next);
                                                        }}
                                                        className="h-4 w-4 rounded text-orange-600"
                                                    />
                                                    <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-mono font-black text-orange-600">R$ {Number(item.price || 0).toFixed(2)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryImportModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCategoryImport}
                                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    Importar Produtos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionEditorModal;
