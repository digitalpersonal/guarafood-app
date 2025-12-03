
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { MenuItem, SizeOption, Addon } from '../types';
import { supabase } from '../services/api';
import { generateImage } from '../services/databaseService';

// Icon for the Combobox dropdown
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.4-1.4l-1.188-.648 1.188-.648a2.25 2.25 0 011.4-1.4l.648-1.188.648 1.188a2.25 2.25 0 01-1.4 1.4z" />
    </svg>
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
    onSave: (itemData: Omit<MenuItem, 'id' | 'restaurantId'>, category: string) => void;
    existingItem?: MenuItem;
    initialCategory?: string;
    restaurantCategories: string[];
    allAddons: Addon[];
    restaurantId: number;
}

const MenuItemEditorModal: React.FC<MenuItemEditorModalProps> = ({ isOpen, onClose, onSave, existingItem, initialCategory = '', restaurantCategories, allAddons, restaurantId }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [category, setCategory] = useState('');
    const [isAcai, setIsAcai] = useState(false);
    const [isDailySpecial, setIsDailySpecial] = useState(false);
    const [isWeeklySpecial, setIsWeeklySpecial] = useState(false);
    const [isMarmita, setIsMarmita] = useState(false);
    const [marmitaOptions, setMarmitaOptions] = useState<string[]>(['']);
    const [sizes, setSizes] = useState<SizeOption[]>([]);
    const [availableDays, setAvailableDays] = useState<number[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
    const [addonSearchTerm, setAddonSearchTerm] = useState('');
    const [error, setError] = useState('');

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);


    useEffect(() => {
        if (existingItem) {
            setName(existingItem.name);
            setDescription(existingItem.description);
            setPrice(String(existingItem.price));
            setOriginalPrice(String(existingItem.originalPrice || ''));
            setImagePreview(existingItem.imageUrl || null);
            setCategory(initialCategory);
            setIsAcai(existingItem.isAcai || false);
            setIsDailySpecial(existingItem.isDailySpecial || false);
            setIsWeeklySpecial(existingItem.isWeeklySpecial || false);
            setIsMarmita(existingItem.isMarmita || false);
            setMarmitaOptions(existingItem.marmitaOptions && existingItem.marmitaOptions.length > 0 ? existingItem.marmitaOptions : ['']);
            setSizes(existingItem.sizes || []);
            setAvailableDays(existingItem.availableDays || []);
            setSelectedAddonIds(new Set(existingItem.availableAddonIds || []));
        } else {
            // Reset form for new item
            setName('');
            setDescription('');
            setPrice('');
            setOriginalPrice('');
            setImagePreview(null);
            setCategory(initialCategory);
            setIsAcai(false);
            setIsDailySpecial(false);
            setIsWeeklySpecial(false);
            setIsMarmita(false);
            setMarmitaOptions(['']);
            setSizes([]);
            setAvailableDays([]);
            setSelectedAddonIds(new Set());
        }
        setAddonSearchTerm('');
        setImageFile(null);
        setError('');
        setIsSaving(false);
        setIsGenerating(false);
    }, [existingItem, initialCategory, isOpen]);

    // Cleanup for image preview object URL
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // --- COMPRESSÃO DE IMAGEM ---
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

                // Configurações de otimização
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                // Redimensionar mantendo proporção
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

                // Converter para Blob (JPEG com 70% de qualidade)
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`Imagem comprimida: ${file.size} -> ${compressedFile.size} bytes`);
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Falha na compressão da imagem."));
                    }
                }, 'image/jpeg', 0.7); // 0.7 = 70% quality (Bom balanço tamanho/qualidade)
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
                // Comprimir imagem antes de setar no estado
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

    // Helper to convert Base64 string to File object
    const base64ToFile = (base64String: string, filename: string): File => {
        const arr = base64String.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleGenerateImage = async () => {
        if (!name) {
            setError("Por favor, digite o nome do item primeiro.");
            return;
        }
        
        // Safety check for production environment
        if (typeof window !== 'undefined' && !(window as any).aistudio) {
            setError("A geração de imagem por IA só está disponível no ambiente de desenvolvimento do Google AI Studio.");
            return;
        }

        setIsGenerating(true);
        setError('');
        try {
            // CRITICAL: Ensure `window.aistudio.hasSelectedApiKey()` is checked and `window.aistudio.openSelectKey()` is called
            // before generating the image, as per Gemini API guidelines for premium models.
            if (!await window.aistudio.hasSelectedApiKey()) {
                await window.aistudio.openSelectKey();
                // Assume success and proceed, as per race condition guideline.
            }
            
            const prompt = `A delicious close-up photo of ${name}${description ? `, ${description}` : ''}. High quality food photography.`;
            const base64Image = await generateImage(prompt, '1:1');
            
            // Convert to file
            const rawFile = base64ToFile(base64Image, `ai-generated-${Date.now()}.jpg`);
            
            // Compress the AI generated image as well (they can be large PNGs sometimes)
            const compressedFile = await compressImage(rawFile);
            
            setImageFile(compressedFile);
            
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
            setImagePreview(URL.createObjectURL(compressedFile));
            
        } catch (err: any) {
            // If the error message indicates a missing entity (e.g., API Key invalid/not selected), prompt again.
            if (err.message && err.message.includes("Requested entity was not found")) {
                setError("Chave API não selecionada ou inválida. Por favor, selecione uma chave API paga para gerar imagens (ai.google.dev/gemini-api/docs/billing).");
                await window.aistudio.openSelectKey(); // Prompt again
            } else {
                setError(`Erro ao gerar imagem: ${err.message}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSizeChange = (index: number, field: keyof SizeOption, value: string) => {
        const newSizes = [...sizes];
        const numValue = field === 'price' ? parseFloat(value) : parseInt(value, 10);
        (newSizes[index] as any)[field] = isNaN(numValue) ? value : numValue;
        setSizes(newSizes);
    };

    const addSize = () => {
        setSizes([...sizes, { name: '', price: 0, freeAddonCount: 0 }]);
    };

    const removeSize = (index: number) => {
        setSizes(sizes.filter((_, i) => i !== index));
    };

    const handleDayToggle = (dayIndex: number) => {
        setAvailableDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex) 
                : [...prev, dayIndex]
        );
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
             setError('ID do restaurante não encontrado. Não é possível salvar a imagem.');
             return;
        }

        setIsSaving(true);
        let finalImageUrl = existingItem?.imageUrl || '';

        try {
            if (imageFile) {
                try {
                    // Sanitização e caminho robusto
                    const fileExt = 'jpg'; // We force jpg compression
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    const filePath = `${restaurantId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, imageFile, {
                            contentType: 'image/jpeg',
                            cacheControl: '3600',
                            upsert: false // Evita sobrescrever se o UUID colidir (impossível, mas boa prática)
                        });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(filePath);

                    finalImageUrl = data.publicUrl;
                } catch (uploadError: any) {
                    setError(`Erro no upload da imagem: ${uploadError.message}`);
                    return; // Exit here, let the outer finally handle setIsSaving(false)
                }
            }


            const numericOriginalPrice = parseFloat(originalPrice);

            onSave({
                name,
                description,
                price: basePrice,
                originalPrice: numericOriginalPrice > 0 ? numericOriginalPrice : undefined,
                imageUrl: finalImageUrl,
                isAcai,
                isDailySpecial,
                isWeeklySpecial,
                isMarmita,
                marmitaOptions: isMarmita ? marmitaOptions.filter(opt => opt.trim() !== '') : undefined,
                availableDays,
                sizes: hasSizes ? sizes : undefined,
                availableAddonIds: Array.from(selectedAddonIds),
            }, category);
            // If onSave succeeds, close modal.
            // Moved closing logic to onSave prop callback in MenuManagement.tsx
            // setIsItemModalOpen(false); // This is handled by parent's onSave callback.
        } catch (err: any) {
            console.error("Failed to save menu item in modal:", err);
            setError(`Erro ao salvar item no cardápio: ${err.message || String(err)}`);
        } finally {
            setIsSaving(false); // Ensure saving state is reset in all cases.
        }
    };

    if (!isOpen) return null;

    const hasSizes = sizes.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="menuitem-editor-modal-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="menuitem-editor-modal-title" className="text-2xl font-bold mb-4">{existingItem ? 'Editar Item do Cardápio' : 'Adicionar Novo Item'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
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
                                Imagem do Produto
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="imageUpload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-orange-50 file:text-orange-700
                                        hover:file:bg-orange-100"
                                />
                                <button 
                                    type="button"
                                    onClick={handleGenerateImage}
                                    disabled={isGenerating || !name}
                                    className="bg-purple-600 text-white text-xs font-bold py-2 px-3 rounded-full hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-1 whitespace-nowrap shadow-md transition-all hover:scale-105"
                                    title={!name ? "Digite o nome do prato primeiro" : "Gerar imagem com IA"}
                                >
                                    <SparklesIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Envie um arquivo ou use a IA. Imagens serão otimizadas automaticamente para celular.</p>
                        </div>
                    </div>


                    <input type="text" placeholder="Nome do Item (ex: X-Bacon)" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    <textarea placeholder="Descrição do Item" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50" rows={3}/>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="number"
                            placeholder="Preço Original (Opcional)"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-gray-50"
                            title="Preço 'de'. Deixe em branco se não for uma promoção."
                        />
                        <input
                            type="number"
                            placeholder={hasSizes ? "Preço base nos tamanhos" : "Preço de Venda"}
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200"
                            disabled={hasSizes}
                            title="Preço 'por'. Este é o preço que o cliente paga."
                        />
                    </div>
                    
                    {/* --- SIZES MANAGEMENT --- */}
                    <div className="p-3 bg-gray-50 rounded-lg border">
                        <h3 className="font-bold text-gray-700 mb-3">Tamanhos (Opcional)</h3>
                        {sizes.map((size, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                                <input type="text" placeholder="Nome (ex: Grande)" value={size.name} onChange={(e) => handleSizeChange(index, 'name', e.target.value)} className="col-span-5 p-2 border rounded-md"/>
                                <input type="number" placeholder="Preço" value={size.price} onChange={(e) => handleSizeChange(index, 'price', e.target.value)} className="col-span-3 p-2 border rounded-md"/>
                                {isAcai && <input type="number" placeholder="Grátis" title="Adicionais Grátis" value={size.freeAddonCount || ''} onChange={(e) => handleSizeChange(index, 'freeAddonCount', e.target.value)} className="col-span-3 p-2 border rounded-md"/>}
                                <button onClick={() => removeSize(index)} className={`p-2 text-red-500 hover:text-red-700 ${isAcai ? 'col-span-1' : 'col-span-4'}`}><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                        <button onClick={addSize} className="w-full text-sm font-semibold text-blue-600 p-2 rounded-md hover:bg-blue-100 border-dashed border-2 mt-2">
                            + Adicionar Tamanho
                        </button>
                    </div>

                    {/* --- ADDONS MANAGEMENT --- */}
                    {allAddons.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <h3 className="font-bold text-gray-700 mb-2">Adicionais Disponíveis</h3>
                            <p className="text-xs text-gray-500 mb-3">Selecione quais adicionais podem ser escolhidos com este item.</p>
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
                                {filteredAddons.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center p-2">Nenhum adicional encontrado.</p>}
                            </div>
                        </div>
                    )}

                    {/* --- WEEKDAY AVAILABILITY --- */}
                    <div className="p-3 bg-gray-50 rounded-lg border">
                        <h3 className="font-bold text-gray-700 mb-2">Disponibilidade Semanal (Menu do Dia)</h3>
                        <p className="text-xs text-gray-500 mb-3">Selecione os dias em que este item estará disponível. Deixe todos desmarcados para que esteja disponível todos os dias.</p>
                        <div className="flex justify-around">
                            {dayAbbreviations.map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleDayToggle(index)}
                                    className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                                        availableDays.includes(index)
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    title={daysOfWeek[index]}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                         <div className="flex flex-col p-3 bg-gray-100 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <input type="checkbox" id="is-marmita-toggle" checked={isMarmita} onChange={(e) => setIsMarmita(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                                <label htmlFor="is-marmita-toggle" className="font-semibold text-gray-700">É uma marmita / Prato do Dia?</label>
                            </div>
                             {isMarmita && (
                                <div className="mt-2 p-3 bg-white border rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Composição / Opções do Prato de Hoje</label>
                                    <div className="space-y-2">
                                        {marmitaOptions.map((option, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={`Opção ${index + 1}`}
                                                    value={option}
                                                    onChange={(e) => handleMarmitaOptionChange(index, e.target.value)}
                                                    className="w-full p-2 border rounded-md"
                                                />
                                                <button type="button" onClick={() => removeMarmitaOption(index)} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={marmitaOptions.length <= 1}>
                                                    <TrashIcon className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={addMarmitaOption} className="w-full text-sm font-semibold text-blue-600 p-2 rounded-md hover:bg-blue-100 border-dashed border-2 mt-3">
                                        + Adicionar Opção
                                    </button>
                                </div>
                            )}
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                            <input type="checkbox" id="is-acai-toggle" checked={isAcai} onChange={(e) => setIsAcai(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                            <label htmlFor="is-acai-toggle" className="font-semibold text-gray-700">É um item de açaí customizável?</label>
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                            <input type="checkbox" id="is-daily-special-toggle" checked={isDailySpecial} onChange={(e) => setIsDailySpecial(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                            <label htmlFor="is-daily-special-toggle" className="font-semibold text-gray-700">É um "Destaque do Dia"?</label>
                        </div>
                         <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                            <input type="checkbox" id="is-weekly-special-toggle" checked={isWeeklySpecial} onChange={(e) => setIsWeeklySpecial(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                            <label htmlFor="is-weekly-special-toggle" className="font-semibold text-gray-700">É uma "Promoção da Semana" (para supermercados)?</label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="category-input" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <Combobox options={restaurantCategories} value={category} onChange={setCategory} placeholder="Selecione ou crie uma categoria"/>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-orange-300" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuItemEditorModal;
