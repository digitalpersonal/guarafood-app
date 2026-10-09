
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { MenuItem, SizeOption, Addon, OptionGroup, CustomizationOption, MenuCategory } from '../types';
import { DAYS_OF_WEEK, ALL_DAYS, MON_TO_THU, MON_TO_FRI, FRI_TO_SUN, formatPromoDays } from '../utils/promoUtils';
import { supabase } from '../services/api';

// Icon for the Combobox dropdown
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
);

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dayAbbreviations = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// A reusable Combobox component for category selection
interface ComboboxProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const Combobox: React.FC<ComboboxProps> = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Filter options based on user input
    const filteredOptions = useMemo(() => 
        value ? options.filter(option => option.toLowerCase().includes(value.toLowerCase())) : options,
        [options, value]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        if (!isOpen) setIsOpen(true);
    };
    
    const handleOptionClick = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    // Check if the current value is a new category
    const isNewCategory = value && !options.some(opt => opt.toLowerCase() === value.toLowerCase());

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full p-3 border rounded-lg bg-gray-50 pr-10"
                autoComplete="off"
            />
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="absolute inset-y-0 right-0 flex items-center pr-3" aria-label="Toggle category list">
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredOptions.map(option => (
                        <li key={option} onClick={() => handleOptionClick(option)} className="cursor-pointer px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-700">
                            {option}
                        </li>
                    ))}
                    {isNewCategory && (
                        <li className="px-4 py-2 text-sm text-gray-500 border-t">
                           Criar nova categoria: <span className="font-semibold text-gray-800">{`"${value}"`}</span>
                        </li>
                    )}
                    {filteredOptions.length === 0 && !isNewCategory && (
                         <li className="px-4 py-2 text-sm text-gray-500">Nenhuma categoria encontrada.</li>
                    )}
                </ul>
            )}
        </div>
    );
};


interface MenuItemEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (itemData: Omit<MenuItem, 'id' | 'restaurantId'>, category: string) => Promise<void>;
    existingItem?: MenuItem;
    initialCategory?: string;
    restaurantCategories: string[];
    categories?: MenuCategory[];
    allAddons: Addon[];
    restaurantId: number;
}

const MenuItemEditorModal: React.FC<MenuItemEditorModalProps> = ({ isOpen, onClose, onSave, existingItem, initialCategory = '', restaurantCategories, categories = [], allAddons, restaurantId }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [category, setCategory] = useState('');
    const [isAcai, setIsAcai] = useState(false);
    const [isPizza, setIsPizza] = useState(false);
    const [isDailySpecial, setIsDailySpecial] = useState(false);
    const [isWeeklySpecial, setIsWeeklySpecial] = useState(false);
    const [isMarmita, setIsMarmita] = useState(false);
    const [marmitaOptions, setMarmitaOptions] = useState<string[]>(['']);
    const [sizes, setSizes] = useState<SizeOption[]>([]);
    const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
    const [addonSearchTerm, setAddonSearchTerm] = useState('');
    const [isCopyingGroups, setIsCopyingGroups] = useState(false);
    const [copySearchTerm, setCopySearchTerm] = useState('');
    const [allItemsForCopy, setAllItemsForCopy] = useState<MenuItem[]>([]);
    const [error, setError] = useState('');
    const [available, setAvailable] = useState(true);
    const [availableDays, setAvailableDays] = useState<number[]>(ALL_DAYS);
    const [availableStartTime, setAvailableStartTime] = useState('');
    const [availableEndTime, setAvailableEndTime] = useState('');

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- ESTADOS DO MODAL DE IMPORTAÇÃO POR CATEGORIA ---
    const [isCategoryImportModalOpen, setIsCategoryImportModalOpen] = useState(false);
    const [categoryImportTargetGroupId, setCategoryImportTargetGroupId] = useState<string | null>(null);
    const [selectedImportCategory, setSelectedImportCategory] = useState<string>('');
    const [categoryImportItemSelection, setCategoryImportItemSelection] = useState<Set<number>>(new Set());
    const [categoryImportPriceMode, setCategoryImportPriceMode] = useState<'FREE' | 'ORIGINAL'>('FREE');
    const [categoryImportMode, setCategoryImportMode] = useState<'REPLACE' | 'APPEND'>('APPEND');
    const [categoryImportGroupTitle, setCategoryImportGroupTitle] = useState('');
    const [categoryImportMin, setCategoryImportMin] = useState(1);
    const [categoryImportMax, setCategoryImportMax] = useState(1);

    // --- ESTADOS DO MODAL DE IMPORTAÇÃO DE ADICIONAIS / COMPLEMENTOS ---
    const [isAddonImportModalOpen, setIsAddonImportModalOpen] = useState(false);
    const [addonImportTargetGroupId, setAddonImportTargetGroupId] = useState<string | null>(null);
    const [addonImportSelection, setAddonImportSelection] = useState<Set<number>>(new Set());
    const [addonImportFilter, setAddonImportFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
    const [addonImportPriceMode, setAddonImportPriceMode] = useState<'FREE' | 'ORIGINAL'>('FREE');
    const [addonImportMode, setAddonImportMode] = useState<'REPLACE' | 'APPEND'>('APPEND');
    const [addonImportGroupTitle, setAddonImportGroupTitle] = useState('');
    const [addonImportMin, setAddonImportMin] = useState(0);
    const [addonImportMax, setAddonImportMax] = useState(3);


    useEffect(() => {
        const fetchAllItems = async () => {
            if (!restaurantId || !isOpen) return;
            try {
                const { data, error } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('restaurant_id', restaurantId);
                
                if (error) throw error;
                if (data) {
                    setAllItemsForCopy(data.map(item => ({
                        ...item,
                        restaurantId: item.restaurant_id,
                        marmitaOptions: item.marmita_options,
                        availableAddonIds: item.available_addon_ids,
                        isMarmita: item.is_marmita,
                        isDailySpecial: item.is_daily_special,
                        isWeeklySpecial: item.is_weekly_special,
                        optionGroups: item.option_groups
                    } as MenuItem)));
                }
            } catch (err) {
                console.error("Erro ao buscar itens para cópia:", err);
            }
        };

        fetchAllItems();
    }, [restaurantId, isOpen]);

    // Lista de categorias com seus respectivos produtos para importação rápida
    const availableCategoryList = useMemo(() => {
        if (categories && categories.length > 0) {
            return categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                items: cat.items || []
            }));
        }
        // Fallback: agrupa allItemsForCopy por categoria
        const map = new Map<string, MenuItem[]>();
        restaurantCategories.forEach(cName => map.set(cName, []));
        allItemsForCopy.forEach(item => {
            const catName = (item as any).category_name || (item as any).category || '';
            if (catName) {
                if (!map.has(catName)) map.set(catName, []);
                map.get(catName)!.push(item);
            }
        });
        return Array.from(map.entries()).map(([name, items], idx) => ({ id: idx + 1, name, items }));
    }, [categories, restaurantCategories, allItemsForCopy]);

    const handleSelectCategoryForImport = (catName: string) => {
        setSelectedImportCategory(catName);
        const catData = availableCategoryList.find(c => c.name === catName);
        const allIds = new Set<number>((catData?.items || []).map(i => i.id));
        setCategoryImportItemSelection(allIds);
        
        // Auto-sugere o título se estiver vazio ou genérico
        if (!categoryImportGroupTitle || categoryImportGroupTitle.startsWith('Escolha seu') || categoryImportGroupTitle === 'Opções') {
            setCategoryImportGroupTitle(`Escolha seu(sua) ${catName}`);
        }
    };

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
                options: newOptions
            };
            setOptionGroups(prev => [...prev, newGroup]);
        }

        setIsCategoryImportModalOpen(false);
    };

    const handleOpenAddonImport = (groupId: string | null = null) => {
        setAddonImportTargetGroupId(groupId);
        const existingGroup = groupId ? optionGroups.find(g => g.id === groupId) : null;
        
        setAddonImportSelection(new Set(allAddons.map(a => a.id)));
        setAddonImportFilter('ALL');
        setAddonImportPriceMode('FREE');
        setAddonImportMode(existingGroup ? 'REPLACE' : 'APPEND');
        setAddonImportGroupTitle(existingGroup?.title || 'Complementos / Adicionais');
        setAddonImportMin(existingGroup?.minSelections !== undefined ? existingGroup.minSelections : 0);
        setAddonImportMax(existingGroup?.maxSelections !== undefined ? existingGroup.maxSelections : 3);
        
        setIsAddonImportModalOpen(true);
    };

    const handleConfirmAddonImport = () => {
        const selectedList = allAddons.filter(a => addonImportSelection.has(a.id));
        if (selectedList.length === 0) {
            alert('Selecione pelo menos um adicional para importar.');
            return;
        }

        const newOptions: CustomizationOption[] = selectedList.map(a => ({
            name: a.name,
            price: addonImportPriceMode === 'FREE' ? 0 : (Number(a.price) || 0)
        }));

        if (addonImportTargetGroupId) {
            setOptionGroups(prev => prev.map(group => {
                if (group.id !== addonImportTargetGroupId) return group;
                return {
                    ...group,
                    title: addonImportGroupTitle.trim() || group.title,
                    minSelections: addonImportMin,
                    maxSelections: addonImportMax,
                    options: addonImportMode === 'REPLACE' ? newOptions : [...group.options, ...newOptions]
                };
            }));
        } else {
            const newGroup: OptionGroup = {
                id: crypto.randomUUID(),
                title: addonImportGroupTitle.trim() || 'Complementos / Adicionais',
                minSelections: addonImportMin,
                maxSelections: addonImportMax,
                options: newOptions
            };
            setOptionGroups(prev => [...prev, newGroup]);
        }

        setIsAddonImportModalOpen(false);
    };

    const handleCopyGroupsFromItem = (sourceItem: MenuItem, mode: 'APPEND' | 'REPLACE') => {
        if (!sourceItem.optionGroups || sourceItem.optionGroups.length === 0) {
            alert('Este produto não possui grupos de opções para copiar.');
            return;
        }

        const copiedGroups: OptionGroup[] = sourceItem.optionGroups.map(group => ({
            ...group,
            id: crypto.randomUUID(),
            options: group.options.map(opt => ({ ...opt }))
        }));

        if (mode === 'APPEND') {
            setOptionGroups(prev => [...prev, ...copiedGroups]);
        } else {
            setOptionGroups(copiedGroups);
        }
        setIsCopyingGroups(false);
        setCopySearchTerm('');
    };

    useEffect(() => {
        if (existingItem) {
            setName(existingItem.name);
            setDescription(existingItem.description);
            setPrice(String(existingItem.price));
            setOriginalPrice(String(existingItem.originalPrice || ''));
            setImagePreview(existingItem.imageUrl || null);
            setCategory(initialCategory);
            setIsAcai(existingItem.isAcai || false);
            setIsPizza(existingItem.isPizza || false);
            setIsDailySpecial(existingItem.isDailySpecial || false);
            setIsWeeklySpecial(existingItem.isWeeklySpecial || false);
            setIsMarmita(existingItem.isMarmita || false);
            setMarmitaOptions(existingItem.marmitaOptions && existingItem.marmitaOptions.length > 0 ? existingItem.marmitaOptions : ['']);
            setSizes(existingItem.sizes || []);
            setOptionGroups(existingItem.optionGroups || []);
            setSelectedAddonIds(new Set(existingItem.availableAddonIds || []));
            setAvailable(existingItem.available !== false);
            setAvailableDays(existingItem.availableDays && existingItem.availableDays.length > 0 ? existingItem.availableDays : ALL_DAYS);
            setAvailableStartTime(existingItem.availableStartTime || '');
            setAvailableEndTime(existingItem.availableEndTime || '');
        } else {
            // Reset form for new item
            setName('');
            setDescription('');
            setPrice('');
            setOriginalPrice('');
            setImagePreview(null);
            setCategory(initialCategory);
            setIsAcai(false);
            setIsPizza(false);
            setIsDailySpecial(false);
            setIsWeeklySpecial(false);
            setIsMarmita(false);
            setMarmitaOptions(['']);
            setSizes([]);
            setOptionGroups([]);
            setSelectedAddonIds(new Set());
            setAvailable(true);
            setAvailableDays(ALL_DAYS);
            setAvailableStartTime('');
            setAvailableEndTime('');
        }
        setAddonSearchTerm('');
        setImageFile(null);
        setError('');
        setIsSaving(false);
    }, [existingItem, initialCategory, isOpen]);

    // Cleanup for image preview object URL
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // --- COMPRESSÃO DE IMAGEM ULTRA LEVE ---
    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(img.src);
                    reject(new Error("Não foi possível processar a imagem."));
                    return;
                }

                // Configurações de otimização AGRESSIVA (Foco em mobile)
                const MAX_WIDTH = 600; 
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG 50% de qualidade - Extremamente leve para listas de comida
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Falha na compressão."));
                    }
                }, 'image/jpeg', 0.5); 
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(img.src);
                reject(err);
            };
        });
    };


    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const originalFile = e.target.files[0];
            try {
                const compressedFile = await compressImage(originalFile);
                setImageFile(compressedFile);
                
                if (imagePreview && imagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreview);
                }
                setImagePreview(URL.createObjectURL(compressedFile));
            } catch (err) {
                console.error("Erro ao otimizar imagem:", err);
                setError("Erro ao processar imagem. Tente outra.");
            }
        }
    };

    const handlePriceChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter((value || '').replace(',', '.'));
    };

    const handleSizeChange = (index: number, field: keyof SizeOption, value: string) => {
        const newSizes = [...sizes];
        let processedValue: string | number = value;
        
        if (field === 'price') {
             processedValue = parseFloat((value || '').replace(',', '.'));
        } else if (field === 'freeAddonCount') {
             processedValue = parseInt(value, 10);
        }

        (newSizes[index] as any)[field] = isNaN(processedValue as number) && field !== 'name' ? value : processedValue;
        setSizes(newSizes);
    };

    const addSize = () => {
        setSizes([...sizes, { name: '', price: 0, freeAddonCount: 0 }]);
    };

    const removeSize = (index: number) => {
        setSizes(sizes.filter((_, i) => i !== index));
    };

    const addOptionGroup = () => {
        const newGroup: OptionGroup = {
            id: crypto.randomUUID(),
            title: '',
            minSelections: 0,
            maxSelections: 1,
            options: [{ name: '', price: 0 }]
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


    const handleAddonToggle = (addonId: number) => {
        setSelectedAddonIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(addonId)) {
                newSet.delete(addonId);
            } else {
                newSet.add(addonId);
            }
            return newSet;
        });
    };
    
    const handleMarmitaOptionChange = (index: number, value: string) => {
        const newOptions = [...marmitaOptions];
        newOptions[index] = value;
        setMarmitaOptions(newOptions);
    };
    const addMarmitaOption = () => {
        setMarmitaOptions([...marmitaOptions, '']);
    };
    const removeMarmitaOption = (index: number) => {
        setMarmitaOptions(marmitaOptions.filter((_, i) => i !== index));
    };


    const filteredAddons = useMemo(() => {
        if (!addonSearchTerm) return allAddons;
        return allAddons.filter(addon => addon.name.toLowerCase().includes(addonSearchTerm.toLowerCase()));
    }, [allAddons, addonSearchTerm]);

    const handleSubmit = async () => {
        const hasSizes = sizes.length > 0;
        if (!name || (!hasSizes && !price) || !category) {
            setError('Nome, Preço de Venda e Categoria são obrigatórios.');
            return;
        }

        const basePrice = hasSizes ? (sizes[0]?.price || 0) : parseFloat(price);
        if (isNaN(basePrice) || basePrice <= 0) {
            setError('O preço de venda deve ser um número válido e maior que zero.');
            return;
        }
        if (!restaurantId) {
             setError('ID do restaurante não encontrado.');
             return;
        }

        setIsSaving(true);
        let finalImageUrl = existingItem?.imageUrl || '';

        try {
            if (imageFile) {
                try {
                    const fileExt = 'jpg'; 
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    const filePath = `${restaurantId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, imageFile, {
                            contentType: 'image/jpeg',
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(filePath);

                    finalImageUrl = data.publicUrl;
                } catch (uploadError: any) {
                    setError(`Erro no upload: ${uploadError.message}`);
                    return; 
                }
            }


            const numericOriginalPrice = parseFloat(originalPrice);

            await onSave({
                name,
                description,
                price: basePrice,
                originalPrice: numericOriginalPrice > 0 ? numericOriginalPrice : undefined,
                imageUrl: finalImageUrl,
                isAcai,
                isPizza,
                isDailySpecial,
                isWeeklySpecial,
                isMarmita,
                marmitaOptions: isMarmita ? marmitaOptions.filter(opt => opt.trim() !== '') : null,
                sizes: hasSizes ? sizes : null,
                optionGroups: optionGroups.length > 0 ? optionGroups : null,
                availableAddonIds: Array.from(selectedAddonIds),
                available: available,
                availableDays: availableDays && availableDays.length > 0 ? availableDays : ALL_DAYS,
                availableStartTime: availableStartTime || undefined,
                availableEndTime: availableEndTime || undefined
            }, category);
        } catch (err: any) {
            console.error("Failed to save:", err);
            setError(`Erro: ${err.message || String(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const hasSizes = sizes.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="menuitem-editor-modal-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="menuitem-editor-modal-title" className="text-2xl font-bold mb-4">{existingItem ? 'Editar Item' : 'Adicionar Item'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    
                    {/* DISPONIBILIDADE (ESTOQUE) */}
                    <div className="p-4 bg-orange-50 border-2 border-orange-100 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${available ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <div>
                                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">Status de Venda</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{available ? 'Disponível no cardápio' : 'Esgotado / Pausado'}</p>
                            </div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                    </div>

                    {/* HORÁRIO DE VENDA (EX: COMBO DA TARDE 13H ÀS 18H) */}
                    <div className="p-4 bg-gradient-to-r from-orange-50/70 to-amber-50/50 border border-orange-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-orange-950 uppercase flex items-center gap-1.5">
                                <span>⏰</span>
                                <span>Horário de Venda / Validade (Opcional)</span>
                            </label>
                            {(availableStartTime || availableEndTime) && (
                                <button
                                    type="button"
                                    onClick={() => { setAvailableStartTime(''); setAvailableEndTime(''); }}
                                    className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
                                >
                                    Limpar Horário
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-600">
                            Ex: <strong>Combo da Tarde (13:00 às 18:00)</strong>, Marmita Almoço (11h às 14h). Se preenchido, o app só permitirá pedidos nessa faixa de horário.
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
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1 self-center">Atalhos:</span>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('13:00'); setAvailableEndTime('18:00'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-orange-300 text-orange-800 hover:bg-orange-100/60 cursor-pointer"
                            >
                                Tarde (13h - 18h) 🔥
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('11:00'); setAvailableEndTime('15:00'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                                Almoço (11h - 15h)
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAvailableStartTime('18:00'); setAvailableEndTime('23:30'); }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                                Noite (18h - 23h30)
                            </button>
                        </div>

                        {/* Dias da Semana */}
                        <div className="pt-2 border-t border-orange-200/60">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-gray-700 uppercase">Dias Válidos:</span>
                                <span className="text-[11px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                                    {formatPromoDays(availableDays)}
                                </span>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {DAYS_OF_WEEK.map(day => {
                                    const isSelected = availableDays.includes(day.index);
                                    return (
                                        <button
                                            key={day.index}
                                            type="button"
                                            onClick={() => {
                                                setAvailableDays(prev => {
                                                    if (prev.includes(day.index)) {
                                                        if (prev.length === 1) return prev;
                                                        return prev.filter(d => d !== day.index);
                                                    } else {
                                                        return [...prev, day.index].sort((a,b)=>a-b);
                                                    }
                                                });
                                            }}
                                            className={`py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-4">
                         <div className="flex-shrink-0">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-md object-cover" loading="lazy" />
                            ) : (
                                <div className="w-24 h-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-sm text-center p-2">
                                    Sem Imagem
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-700 mb-1">
                                Foto do Produto
                            </label>
                            <input
                                id="imageUpload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-orange-50 file:text-orange-700
                                    hover:file:bg-orange-100"
                            />
                            <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase tracking-tighter">O App reduzirá o peso da foto automaticamente para economizar espaço.</p>
                        </div>
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Item</label>
                        <input type="text" placeholder="ex: X-Bacon" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Item</label>
                        <textarea placeholder="Descreva os ingredientes ou detalhes do produto" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50" rows={3}/>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preço Original (Racionado / Riscado)</label>
                            <input
                                type="text"
                                placeholder="0,00"
                                value={originalPrice}
                                onChange={(e) => handlePriceChange(e.target.value, setOriginalPrice)}
                                className="w-full p-3 border rounded-lg bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{hasSizes ? "Defina o preço nos tamanhos" : "Preço de Venda"}</label>
                            <input
                                type="text"
                                placeholder="0,00"
                                value={price}
                                onChange={(e) => handlePriceChange(e.target.value, setPrice)}
                                className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200"
                                disabled={hasSizes}
                            />
                        </div>
                    </div>
                    
                    {/* --- SIZES MANAGEMENT --- */}
                    <div className="p-3 bg-gray-50 rounded-lg border">
                        <h3 className="font-bold text-gray-700 mb-3">Tamanhos / Porções</h3>
                        {sizes.map((size, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                                <input type="text" placeholder="Nome (ex: 500ml)" value={size.name} onChange={(e) => handleSizeChange(index, 'name', e.target.value)} className="col-span-5 p-2 border rounded-md"/>
                                <input type="number" placeholder="Preço" value={size.price} onChange={(e) => handleSizeChange(index, 'price', e.target.value)} className="col-span-3 p-2 border rounded-md"/>
                                
                                {isAcai ? (
                                    <input 
                                        type="number" 
                                        placeholder="Grátis" 
                                        value={size.freeAddonCount || ''} 
                                        onChange={(e) => handleSizeChange(index, 'freeAddonCount', e.target.value)} 
                                        className="col-span-3 p-2 border rounded-md bg-white border-purple-300 focus:ring-purple-500"
                                    />
                                ) : (
                                    <div className="col-span-3"></div> 
                                )}
                                
                                <button onClick={() => removeSize(index)} className="col-span-1 p-2 text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                        <button onClick={addSize} className="w-full text-sm font-semibold text-blue-600 p-2 rounded-md hover:bg-blue-100 border-dashed border-2 mt-2">
                            + Adicionar Tamanho
                        </button>
                    </div>

                    {/* --- OPTION GROUPS MANAGEMENT (GENERIC CUSTOMIZATION & COMBOS) --- */}
                    <div className="p-4 bg-white rounded-2xl border-2 border-orange-200/80 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
                            <div>
                                <h3 className="font-black text-gray-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                                    <span>⚙️</span>
                                    <span>Grupos de Opções / Montagem do Combo</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Crie escolhas como "Escolha seu Pastel", "Bebida", "Complementos do Açaí", etc.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button 
                                    onClick={() => handleOpenCategoryImport(null)} 
                                    className="text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 text-white px-3 py-1.5 rounded-xl hover:from-orange-700 hover:to-amber-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    type="button"
                                    title="Criar um grupo preenchido automaticamente com todos os produtos de uma categoria (ex: Pastéis)"
                                >
                                    <span>⚡ Puxar de Categoria</span>
                                </button>
                                <button 
                                    onClick={() => handleOpenAddonImport(null)} 
                                    className="text-xs font-black bg-purple-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-purple-700 shadow-sm flex items-center gap-1 cursor-pointer"
                                    type="button"
                                    title="Criar grupo com complementos cadastrados (ex: Adicionais do Açaí)"
                                >
                                    <span>🍇 Puxar Complementos</span>
                                </button>
                                <button 
                                    onClick={() => setIsCopyingGroups(!isCopyingGroups)} 
                                    className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1 cursor-pointer"
                                    type="button"
                                    title="Copiar grupos de opções de outro produto existente"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
                                    <span>Copiar Produto</span>
                                </button>
                                <button 
                                    onClick={addOptionGroup} 
                                    className="text-xs font-black bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-2.5 py-1.5 rounded-xl cursor-pointer" 
                                    type="button"
                                >
                                    + Grupo Vazio
                                </button>
                            </div>
                        </div>

                        {/* Painel de Cópia Inteligente de Grupos */}
                        {isCopyingGroups && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 animate-fadeIn space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                                            Copiar Grupos de Opções de Outro Produto
                                        </h4>
                                        <p className="text-[11px] text-emerald-700">
                                            Você pode <strong>anexar</strong> aos grupos atuais (preservando o que já fez) ou <strong>substituir</strong>.
                                        </p>
                                    </div>
                                    <button onClick={() => setIsCopyingGroups(false)} className="text-emerald-600 hover:text-emerald-800 p-1">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar produto pelo nome (ex: Açaí, Pastel, Pizza)..." 
                                    value={copySearchTerm}
                                    onChange={(e) => setCopySearchTerm(e.target.value)}
                                    className="w-full p-2.5 text-sm border-2 border-emerald-200 rounded-xl bg-white focus:border-emerald-500 outline-none"
                                />
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {allItemsForCopy
                                        .filter(item => 
                                            item.id !== existingItem?.id && 
                                            item.name.toLowerCase().includes(copySearchTerm.toLowerCase()) &&
                                            item.optionGroups && item.optionGroups.length > 0
                                        )
                                        .map(item => (
                                            <div 
                                                key={item.id}
                                                className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
                                            >
                                                <div>
                                                    <span className="text-sm font-black text-emerald-950 block">{item.name}</span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {item.optionGroups?.length} grupo(s): {item.optionGroups?.map(g => g.title).filter(Boolean).join(', ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyGroupsFromItem(item, 'APPEND')}
                                                        className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
                                                        title="Adiciona os grupos deste produto mantendo os grupos que você já criou intactos"
                                                    >
                                                        + Anexar Grupos
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm(`Substituir TODOS os grupos atuais pelos grupos de "${item.name}"?`)) {
                                                                handleCopyGroupsFromItem(item, 'REPLACE');
                                                            }
                                                        }}
                                                        className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer"
                                                        title="Substitui todos os grupos atuais"
                                                    >
                                                        Substituir Tudo
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {allItemsForCopy.filter(item => 
                                        item.id !== existingItem?.id && 
                                        item.name.toLowerCase().includes(copySearchTerm.toLowerCase()) &&
                                        item.optionGroups && item.optionGroups.length > 0
                                    ).length === 0 && (
                                        <p className="text-xs text-emerald-700 font-bold italic py-3 text-center">
                                            Nenhum produto com grupos de opções encontrado.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {optionGroups.length === 0 && (
                            <div className="text-center py-8 px-4 bg-orange-50/50 rounded-2xl border border-dashed border-orange-200">
                                <span className="text-3xl block mb-2">💡</span>
                                <h4 className="text-xs font-black text-orange-950 uppercase mb-1">Nenhum grupo de personalização definido</h4>
                                <p className="text-xs text-gray-600 max-w-md mx-auto mb-3">
                                    Para montar um Combo (ex: pastel + bebida + açaí), clique no botão abaixo para puxar todos os pastéis com 1 clique!
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCategoryImport(null)}
                                        className="px-4 py-2 bg-orange-600 text-white text-xs font-black rounded-xl hover:bg-orange-700 shadow-sm cursor-pointer"
                                    >
                                        ⚡ Criar Grupo a Partir de uma Categoria
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAddonImport(null)}
                                        className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 shadow-sm cursor-pointer"
                                    >
                                        🍇 Criar Grupo com Adicionais do Açaí
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {optionGroups.map((group, gIdx) => (
                                <div key={group.id} className="p-4 bg-gray-50 border-2 border-gray-200/90 rounded-2xl relative group/card space-y-3">
                                    <button 
                                        onClick={() => removeOptionGroup(group.id)}
                                        className="absolute -top-2.5 -right-2.5 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 shadow-sm transition-opacity"
                                        title="Remover este grupo"
                                        type="button"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-6">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                                Título do Grupo ({gIdx + 1})
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: Escolha o Pastel, Escolha a Bebida" 
                                                value={group.title} 
                                                onChange={(e) => updateOptionGroup(group.id, 'title', e.target.value)}
                                                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl bg-white font-bold text-gray-900"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                                Mínimo Obrigatório
                                            </label>
                                            <input 
                                                type="number" 
                                                value={group.minSelections} 
                                                onChange={(e) => updateOptionGroup(group.id, 'minSelections', parseInt(e.target.value) || 0)}
                                                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl bg-white font-bold"
                                                min="0"
                                            />
                                            <span className="text-[10px] text-gray-400">1 = obrigatório, 0 = opcional</span>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                                                Máximo Permitido
                                            </label>
                                            <input 
                                                type="number" 
                                                value={group.maxSelections} 
                                                onChange={(e) => updateOptionGroup(group.id, 'maxSelections', parseInt(e.target.value) || 1)}
                                                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl bg-white font-bold"
                                                min="1"
                                            />
                                            <span className="text-[10px] text-gray-400">Limite de escolhas</span>
                                        </div>
                                    </div>

                                    {/* Barra de Ações Rápidas do Grupo */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">
                                                Opções ({group.options.length}):
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                                {group.minSelections > 0 ? `Mín: ${group.minSelections}` : 'Opcional'} • Máx: {group.maxSelections}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenCategoryImport(group.id)}
                                                className="text-[11px] font-bold bg-orange-100 text-orange-800 hover:bg-orange-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                                title="Preencher com todos os produtos de uma categoria (ex: Pastéis)"
                                            >
                                                <span>⚡ Puxar de Categoria</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAddonImport(group.id)}
                                                className="text-[11px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                                title="Preencher com adicionais/complementos (ex: Adicionais do Açaí)"
                                            >
                                                <span>🍇 Puxar Complementos</span>
                                            </button>
                                            {group.options.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm('Deseja limpar todas as opções deste grupo?')) {
                                                            updateOptionGroup(group.id, 'options', []);
                                                        }
                                                    }}
                                                    className="text-[11px] font-bold text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg cursor-pointer"
                                                >
                                                    Limpar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lista de Opções */}
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {group.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="grid grid-cols-12 gap-2 items-center bg-white p-1.5 rounded-xl border border-gray-200">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome da Opção (ex: Pastel de Carne)" 
                                                    value={opt.name} 
                                                    onChange={(e) => updateOptionInGroup(group.id, oIdx, 'name', e.target.value)}
                                                    className="col-span-7 p-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 font-medium"
                                                />
                                                <div className="col-span-4 flex items-center gap-1">
                                                    <span className="text-[10px] font-bold text-gray-400">+R$</span>
                                                    <input 
                                                        type="number" 
                                                        placeholder="0.00" 
                                                        value={opt.price} 
                                                        onChange={(e) => updateOptionInGroup(group.id, oIdx, 'price', parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-gray-50/50 font-mono font-bold"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeOptionFromGroup(group.id, oIdx)}
                                                    className="col-span-1 p-1 text-red-400 hover:text-red-600 flex justify-center cursor-pointer"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => addOptionToGroup(group.id)}
                                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        <span>Adicionar Opção Manual</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium italic">
                            O cliente poderá escolher entre o mínimo e o máximo de opções configuradas acima ao adicionar este item ao carrinho.
                        </p>
                    </div>

                    {/* --- ADDONS MANAGEMENT --- */}
                    {allAddons.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <h3 className="font-bold text-gray-700 mb-2">Adicionais Disponíveis</h3>
                            <input
                                type="text"
                                placeholder="Buscar adicional..."
                                value={addonSearchTerm}
                                onChange={(e) => setAddonSearchTerm(e.target.value)}
                                className="w-full p-2 border rounded-md mb-2 bg-white"
                            />
                            <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredAddons.map(addon => (
                                    <label key={addon.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer has-[:checked]:bg-orange-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedAddonIds.has(addon.id)}
                                            onChange={() => handleAddonToggle(addon.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span>{addon.name} (+ R$ {addon.price.toFixed(2)})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- WEEKDAY AVAILABILITY --- */}

                    <div className="space-y-3">
                         <div className="flex flex-col p-3 bg-gray-100 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <input type="checkbox" id="is-marmita-toggle" checked={isMarmita} onChange={(e) => setIsMarmita(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                <label htmlFor="is-marmita-toggle" className="font-semibold text-gray-700">É Prato do Dia?</label>
                            </div>
                             {isMarmita && (
                                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg animate-fadeIn">
                                    <div className="space-y-2 mb-3">
                                        {marmitaOptions.map((option, index) => (
                                            <div key={index} className="flex items-center gap-2 group">
                                                <input
                                                    type="text"
                                                    placeholder={`Opção ${index + 1}`}
                                                    value={option}
                                                    onChange={(e) => handleMarmitaOptionChange(index, e.target.value)}
                                                    className="flex-grow p-2 text-sm border border-yellow-300 rounded-md"
                                                />
                                                <button type="button" onClick={() => removeMarmitaOption(index)} className="p-2 text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={addMarmitaOption} className="w-full py-2 text-sm font-bold text-yellow-700 bg-yellow-100 rounded-md">+ Add Opção</button>
                                </div>
                            )}
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
                            <input type="checkbox" id="is-acai-toggle" checked={isAcai} onChange={(e) => setIsAcai(e.target.checked)} className="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"/>
                            <label htmlFor="is-acai-toggle" className="font-semibold text-purple-700">Açaí (Montar Copo)?</label>
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-red-100 rounded-lg">
                            <input type="checkbox" id="is-pizza-toggle" checked={isPizza} onChange={(e) => setIsPizza(e.target.checked)} className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-500"/>
                            <label htmlFor="is-pizza-toggle" className="font-semibold text-red-700">É Pizza (Meia-Meia)?</label>
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                            <input type="checkbox" id="is-daily-special-toggle" checked={isDailySpecial} onChange={(e) => setIsDailySpecial(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                            <label htmlFor="is-daily-special-toggle" className="font-semibold text-gray-700">É Destaque?</label>
                        </div>
                    </div>

                    {/* Only show category selection if we don't have an initial category context (new item from top level) 
                        or if we are editing an existing item (to allow moving it) */}
                    {(!initialCategory || existingItem) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <Combobox options={restaurantCategories} value={category} onChange={setCategory} placeholder="Selecione..."/>
                        </div>
                    )}
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-orange-300" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* ⚡ MODAL: IMPORTAR PRODUTOS DE UMA CATEGORIA COMO OPÇÕES DO GRUPO         */}
            {/* ========================================================================= */}
            {isCategoryImportModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4 backdrop-blur-xs" 
                    onClick={() => setIsCategoryImportModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn border border-orange-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                                    Preenchimento Inteligente de Combos
                                </span>
                                <h3 className="text-lg font-black leading-tight flex items-center gap-1.5">
                                    <span>⚡</span>
                                    <span>Puxar Produtos de uma Categoria</span>
                                </h3>
                                <p className="text-xs text-orange-100 mt-0.5">
                                    Selecione a categoria para listar todos os itens automaticamente (ex: todos os pastéis).
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsCategoryImportModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
                                type="button"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 overflow-y-auto space-y-4 flex-1">
                            {/* 1. Selecionar Categoria */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-2">
                                    1. Escolha a Categoria de Origem:
                                </label>
                                {availableCategoryList.length === 0 ? (
                                    <p className="text-xs text-red-500 font-bold">Nenhuma categoria encontrada no cardápio.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                                        {availableCategoryList.map((cat) => {
                                            const isSelected = selectedImportCategory === cat.name;
                                            return (
                                                <button
                                                    key={cat.name}
                                                    type="button"
                                                    onClick={() => handleSelectCategoryForImport(cat.name)}
                                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                        isSelected
                                                            ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400/30'
                                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <span className={`text-xs font-black truncate ${isSelected ? 'text-orange-950' : 'text-gray-800'}`}>
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 mt-1">
                                                        {cat.items.length} produto(s)
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 2. Lista de Produtos da Categoria */}
                            {selectedImportCategory && (
                                <div className="space-y-2 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black text-gray-800 uppercase">
                                            2. Produtos a Incluir ({categoryImportItemSelection.size} selecionados):
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const catData = availableCategoryList.find(c => c.name === selectedImportCategory);
                                                    setCategoryImportItemSelection(new Set((catData?.items || []).map(i => i.id)));
                                                }}
                                                className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
                                            >
                                                Marcar Todos
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setCategoryImportItemSelection(new Set())}
                                                className="text-[10px] font-bold text-gray-500 hover:underline cursor-pointer"
                                            >
                                                Desmarcar
                                            </button>
                                        </div>
                                    </div>

                                    {(() => {
                                        const catData = availableCategoryList.find(c => c.name === selectedImportCategory);
                                        const items = catData?.items || [];
                                        if (items.length === 0) {
                                            return <p className="text-xs text-gray-400 italic py-2">Nenhum produto cadastrado nesta categoria.</p>;
                                        }
                                        return (
                                            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                                {items.map((item) => {
                                                    const checked = categoryImportItemSelection.has(item.id);
                                                    return (
                                                        <label 
                                                            key={item.id}
                                                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                                                checked ? 'bg-white border-orange-300 shadow-2xs' : 'bg-gray-100/50 border-gray-200 opacity-60'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => {
                                                                        setCategoryImportItemSelection(prev => {
                                                                            const n = new Set(prev);
                                                                            if (n.has(item.id)) n.delete(item.id);
                                                                            else n.add(item.id);
                                                                            return n;
                                                                        });
                                                                    }}
                                                                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                                />
                                                                <span className="font-bold text-gray-900">{item.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 font-mono">
                                                                R$ {Number(item.price).toFixed(2)}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* 3. Regra de Preço no Combo */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1.5">
                                    3. Preço Adicional no Combo:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                                        categoryImportPriceMode === 'FREE' 
                                            ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400/20' 
                                            : 'bg-white border-gray-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="cat-price-mode"
                                                checked={categoryImportPriceMode === 'FREE'}
                                                onChange={() => setCategoryImportPriceMode('FREE')}
                                                className="text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-xs font-black text-orange-950">R$ 0,00 (Incluso)</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            Ideal para combo: o cliente escolhe sem acréscimo.
                                        </span>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                                        categoryImportPriceMode === 'ORIGINAL' 
                                            ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400/20' 
                                            : 'bg-white border-gray-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="cat-price-mode"
                                                checked={categoryImportPriceMode === 'ORIGINAL'}
                                                onChange={() => setCategoryImportPriceMode('ORIGINAL')}
                                                className="text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-xs font-black text-gray-900">Preço do Produto</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            Cobra o valor de cada item no cardápio.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* 4. Título e Limites */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                                <div className="md:col-span-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Título do Grupo
                                    </label>
                                    <input
                                        type="text"
                                        value={categoryImportGroupTitle}
                                        onChange={(e) => setCategoryImportGroupTitle(e.target.value)}
                                        placeholder="Ex: Escolha o Pastel"
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={categoryImportMin}
                                        onChange={(e) => setCategoryImportMin(parseInt(e.target.value) || 0)}
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Máximo
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={categoryImportMax}
                                        onChange={(e) => setCategoryImportMax(parseInt(e.target.value) || 1)}
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                            </div>

                            {categoryImportTargetGroupId && (
                                <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                                    <span className="text-xs font-bold text-gray-600">Neste grupo existente:</span>
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name="import-mode-cat"
                                            checked={categoryImportMode === 'REPLACE'}
                                            onChange={() => setCategoryImportMode('REPLACE')}
                                            className="text-orange-600"
                                        />
                                        <span>Substituir opções atuais</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                        <input
                                            type="radio"
                                            name="import-mode-cat"
                                            checked={categoryImportMode === 'APPEND'}
                                            onChange={() => setCategoryImportMode('APPEND')}
                                            className="text-orange-600"
                                        />
                                        <span>Somar às existentes</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCategoryImportModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCategoryImport}
                                disabled={categoryImportItemSelection.size === 0}
                                className="px-5 py-2 text-xs font-black bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                <span>⚡ Inserir {categoryImportItemSelection.size} Produtos no Grupo</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🍇 MODAL: IMPORTAR COMPLEMENTOS / ADICIONAIS COMO OPÇÕES DO GRUPO         */}
            {/* ========================================================================= */}
            {isAddonImportModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4 backdrop-blur-xs" 
                    onClick={() => setIsAddonImportModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn border border-purple-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                                    Adicionais & Acompanhamentos
                                </span>
                                <h3 className="text-lg font-black leading-tight flex items-center gap-1.5">
                                    <span>🍇</span>
                                    <span>Puxar Complementos / Adicionais</span>
                                </h3>
                                <p className="text-xs text-purple-100 mt-0.5">
                                    Adicione com 1 clique adicionais de açaí (leite ninho, granola, banana, morango, caldas, etc.).
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsAddonImportModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
                                type="button"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 overflow-y-auto space-y-4 flex-1">
                            {/* Filtros */}
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs font-black text-gray-700 uppercase">Filtrar Complementos:</span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setAddonImportFilter('ALL')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                                            addonImportFilter === 'ALL' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        Todos ({allAddons.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddonImportFilter('FREE')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                                            addonImportFilter === 'FREE' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        Grátis ({allAddons.filter(a => Number(a.price) === 0).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddonImportFilter('PAID')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                                            addonImportFilter === 'PAID' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        Pagos ({allAddons.filter(a => Number(a.price) > 0).length})
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Adicionais */}
                            <div className="space-y-2 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-800 uppercase">
                                        Complementos Selecionados ({addonImportSelection.size}):
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAddonImportSelection(new Set(allAddons.map(a => a.id)))}
                                            className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                                        >
                                            Marcar Todos
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setAddonImportSelection(new Set())}
                                            className="text-[10px] font-bold text-gray-500 hover:underline cursor-pointer"
                                        >
                                            Desmarcar
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {allAddons
                                        .filter(a => {
                                            if (addonImportFilter === 'FREE') return Number(a.price) === 0;
                                            if (addonImportFilter === 'PAID') return Number(a.price) > 0;
                                            return true;
                                        })
                                        .map((addon) => {
                                            const checked = addonImportSelection.has(addon.id);
                                            return (
                                                <label 
                                                    key={addon.id}
                                                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                                        checked ? 'bg-white border-purple-300 shadow-2xs' : 'bg-gray-100/50 border-gray-200 opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                setAddonImportSelection(prev => {
                                                                    const n = new Set(prev);
                                                                    if (n.has(addon.id)) n.delete(addon.id);
                                                                    else n.add(addon.id);
                                                                    return n;
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                        />
                                                        <span className="font-bold text-gray-900">{addon.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold text-gray-500">
                                                        {Number(addon.price) === 0 ? 'Grátis' : `+ R$ ${Number(addon.price).toFixed(2)}`}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    }
                                </div>
                            </div>

                            {/* Regra de Preço */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase mb-1.5">
                                    Cobrança no Combo / Grupo:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                                        addonImportPriceMode === 'FREE' 
                                            ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/20' 
                                            : 'bg-white border-gray-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="addon-price-mode"
                                                checked={addonImportPriceMode === 'FREE'}
                                                onChange={() => setAddonImportPriceMode('FREE')}
                                                className="text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-xs font-black text-purple-950">R$ 0,00 (Grátis)</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            Ideal para adicionais grátis no Açaí ou Combo.
                                        </span>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                                        addonImportPriceMode === 'ORIGINAL' 
                                            ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/20' 
                                            : 'bg-white border-gray-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="addon-price-mode"
                                                checked={addonImportPriceMode === 'ORIGINAL'}
                                                onChange={() => setAddonImportPriceMode('ORIGINAL')}
                                                className="text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-xs font-black text-gray-900">Preço do Adicional</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">
                                            Mantém o preço já cadastrado do adicional.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Título e Limites */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                                <div className="md:col-span-6">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Título do Grupo
                                    </label>
                                    <input
                                        type="text"
                                        value={addonImportGroupTitle}
                                        onChange={(e) => setAddonImportGroupTitle(e.target.value)}
                                        placeholder="Ex: Complementos do Açaí"
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={addonImportMin}
                                        onChange={(e) => setAddonImportMin(parseInt(e.target.value) || 0)}
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                        Máximo
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addonImportMax}
                                        onChange={(e) => setAddonImportMax(parseInt(e.target.value) || 1)}
                                        className="w-full p-2.5 text-xs font-bold border rounded-xl bg-white"
                                    />
                                </div>
                            </div>

                            {/* Atalhos Rápidos de Quantidade */}
                            <div className="flex items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Atalhos Máx:</span>
                                {[1, 2, 3, 4, 5, 10].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setAddonImportMax(n)}
                                        className={`px-2 py-0.5 text-xs font-bold rounded-md border cursor-pointer ${
                                            addonImportMax === n ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200'
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddonImportModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAddonImport}
                                disabled={addonImportSelection.size === 0}
                                className="px-5 py-2 text-xs font-black bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                <span>🍇 Inserir {addonImportSelection.size} Complementos no Grupo</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuItemEditorModal;
