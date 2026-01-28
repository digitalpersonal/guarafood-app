
import React, { useState, useEffect } from 'react';
import type { Restaurant, OperatingHours, RestaurantCategory } from '../types';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/api';
import { fetchRestaurantCategories } from '../services/databaseService';
import { SUPABASE_URL } from '../config';

interface RestaurantEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    existingRestaurant: Restaurant | null;
}

type FormData = Omit<Restaurant, 'id'>;

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PREDEFINED_PAYMENT_METHODS = [
    "Pix",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Dinheiro",
    "Marcar na minha conta"
];

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const getDefaultOperatingHours = (): OperatingHours[] =>
    daysOfWeek.map((_, index) => ({
        dayOfWeek: index,
        opens: '18:00',
        closes: '23:00',
        isOpen: false,
    }));


const RestaurantEditorModal: React.FC<RestaurantEditorModalProps> = ({ isOpen, onClose, onSaveSuccess, existingRestaurant }) => {
    const { addToast } = useNotification();
    const [formData, setFormData] = useState<FormData>({
        name: '',
        category: '',
        deliveryTime: '',
        rating: 0,
        imageUrl: '',
        paymentGateways: [],
        address: '',
        phone: '',
        openingHours: '',
        closingHours: '',
        deliveryFee: 0,
        mercado_pago_credentials: { accessToken: '' },
        operatingHours: getDefaultOperatingHours(),
        manualPixKey: '',
        active: true,
    });
    
    const [merchantEmail, setMerchantEmail] = useState('');
    const [merchantPassword, setMerchantPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [changeCredentials, setChangeCredentials] = useState(false);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [newGateway, setNewGateway] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    
    const [showSecondShift, setShowSecondShift] = useState<boolean[]>(Array(7).fill(false));


    useEffect(() => {
        const loadCategories = async () => {
            setLoadingCategories(true);
            try {
                const data = await fetchRestaurantCategories();
                setCategories(data);
            } catch (e) {
                console.error("Failed to load categories", e);
            } finally {
                setLoadingCategories(false);
            }
        };
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    // --- COMPRESSÃO DE LOGO ---
    const compressLogo = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(img.src);
                    reject(new Error("Erro ao processar imagem."));
                    return;
                }

                const MAX_SIZE = 400; // Logos podem ser pequenas
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], "logo.jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Falha na compressão."));
                    }
                }, 'image/jpeg', 0.5); // Qualidade 50%
            };
            img.onerror = () => reject(new Error("Erro ao carregar imagem."));
        });
    };

    useEffect(() => {
        if (existingRestaurant) {
            const opHours = existingRestaurant.operatingHours && existingRestaurant.operatingHours.length === 7 
                ? existingRestaurant.operatingHours 
                : getDefaultOperatingHours();
            
            const hasShift2 = opHours.map(d => !!(d.opens2 || d.closes2));
            setShowSecondShift(hasShift2);

            setFormData({
                ...existingRestaurant,
                mercado_pago_credentials: existingRestaurant.mercado_pago_credentials || { accessToken: '' },
                operatingHours: opHours,
                manualPixKey: existingRestaurant.manualPixKey || '',
                active: existingRestaurant.active !== false
            });
            setLogoPreview(existingRestaurant.imageUrl);
            setChangeCredentials(false);
        } else {
            setFormData({
                name: '',
                category: '',
                deliveryTime: '',
                rating: 0,
                imageUrl: '',
                paymentGateways: [],
                address: '',
                phone: '',
                openingHours: '',
                closingHours: '',
                deliveryFee: 0,
                mercado_pago_credentials: { accessToken: '' },
                operatingHours: getDefaultOperatingHours(),
                manualPixKey: '',
                active: true
            });
            setShowSecondShift(Array(7).fill(false));
            setChangeCredentials(true); 
            setLogoPreview(null);
        }
        setMerchantEmail('');
        setMerchantPassword('');
        setLogoFile(null);
        setError('');
        setShowPassword(false);
    }, [existingRestaurant, isOpen]);
    
    useEffect(() => {
        return () => {
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'deliveryFee') ? parseFloat(value) : value }));
    };
    
    const toggleCategory = (categoryName: string) => {
        setFormData(prev => {
            const currentCategories = prev.category ? prev.category.split(',').map(c => c.trim()) : [];
            let newCategories;
            
            if (currentCategories.includes(categoryName)) {
                newCategories = currentCategories.filter(c => c !== categoryName);
            } else {
                newCategories = [...currentCategories, categoryName];
            }
            
            return {
                ...prev,
                category: newCategories.join(', ')
            };
        });
    };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const compressed = await compressLogo(file);
                setLogoFile(compressed);
                if (logoPreview && logoPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(logoPreview);
                }
                setLogoPreview(URL.createObjectURL(compressed));
            } catch (err) {
                setError("Erro ao processar logo.");
            }
        }
    };

    const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            mercado_pago_credentials: { accessToken: value }
        }));
    };

    const handleOperatingHoursChange = (dayIndex: number, field: 'isOpen' | 'opens' | 'closes' | 'opens2' | 'closes2', value: string | boolean) => {
        setFormData(prev => {
            const newHours = [...(prev.operatingHours || getDefaultOperatingHours())];
            const day = { ...newHours[dayIndex] };
            (day as any)[field] = value;
            newHours[dayIndex] = day;
            return { ...prev, operatingHours: newHours };
        });
    };
    
    const toggleSecondShift = (dayIndex: number) => {
        setShowSecondShift(prev => {
            const newState = [...prev];
            newState[dayIndex] = !newState[dayIndex];
            return newState;
        });
        
        if (!showSecondShift[dayIndex]) {
             setFormData(prev => {
                const newHours = [...(prev.operatingHours || getDefaultOperatingHours())];
                const day = { ...newHours[dayIndex] };
                if (!day.opens2) day.opens2 = '11:00';
                if (!day.closes2) day.closes2 = '14:30';
                newHours[dayIndex] = day;
                return { ...prev, operatingHours: newHours };
            });
        }
    }

    const handleAddGateway = () => {
        const trimmedGateway = newGateway.trim();
        if (!trimmedGateway) return;

        const gatewayExists = formData.paymentGateways.some(
            g => g.toLowerCase() === trimmedGateway.toLowerCase()
        );

        if (gatewayExists) {
            addToast({ message: `A forma de pagamento "${trimmedGateway}" já existe.`, type: 'error' });
            return;
        }

        setFormData(prev => ({
            ...prev,
            paymentGateways: [...prev.paymentGateways, trimmedGateway]
        }));
        setNewGateway('');
    };

    const togglePredefinedGateway = (method: string) => {
        const exists = formData.paymentGateways.includes(method);
        if (exists) {
             handleRemoveGateway(method);
        } else {
             setFormData(prev => ({
                ...prev,
                paymentGateways: [...prev.paymentGateways, method]
            }));
        }
    };
    
    const handleRemoveGateway = (gatewayToRemove: string) => {
         setFormData(prev => ({
            ...prev,
            paymentGateways: prev.paymentGateways.filter(g => g !== gatewayToRemove)
        }));
    };
    
    const handleCopyWebhook = () => {
        if (existingRestaurant) {
            const url = `${SUPABASE_URL}/functions/v1/payment-webhook?restaurantId=${existingRestaurant.id}`;
            navigator.clipboard.writeText(url);
            addToast({ message: 'URL do Webhook copiada!', type: 'success' });
        }
    };

    const handleSubmit = async () => {
        setError('');
        if (!formData.name || !formData.category || !formData.address || !formData.phone) {
            setError('Nome, Categoria, Endereço e Telefone são obrigatórios.');
            return;
        }

        if ((!existingRestaurant || changeCredentials) && (!merchantEmail || !merchantPassword)) {
            if (!existingRestaurant) {
                setError('Email e Senha para o lojista são obrigatórios.');
                return;
            }
        }
        
        setIsSaving(true);
        let finalImageUrl = existingRestaurant?.imageUrl || '';

        if (logoFile) {
            try {
                const fileName = `${crypto.randomUUID()}.jpg`;
                const filePath = `public/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('restaurant-logos')
                    .upload(filePath, logoFile, { contentType: 'image/jpeg' });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('restaurant-logos')
                    .getPublicUrl(filePath);

                finalImageUrl = data.publicUrl;
            } catch (uploadError: any) {
                setError(`Erro no upload: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
        }
        
        const openDays = formData.operatingHours?.filter(d => d.isOpen) || [];
        const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
        const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

        const deliveryFeeValue = formData.deliveryFee !== undefined && formData.deliveryFee !== '' 
            ? parseFloat(String(formData.deliveryFee)) 
            : 0;

        const dbPayload = {
            name: formData.name,
            category: formData.category,
            delivery_time: formData.deliveryTime, 
            rating: formData.rating,
            image_url: finalImageUrl,           
            payment_gateways: formData.paymentGateways, 
            address: formData.address,
            phone: formData.phone,
            opening_hours: openingHoursSummary, 
            closing_hours: closingHoursSummary, 
            delivery_fee: isNaN(deliveryFeeValue) ? 0 : deliveryFeeValue,
            mercado_pago_credentials: formData.mercado_pago_credentials, 
            operating_hours: formData.operatingHours,
            manual_pix_key: formData.manualPixKey,
            active: formData.active
        };

        try {
            if (!existingRestaurant || changeCredentials) {
                const { data, error: functionError } = await supabase.functions.invoke('create-restaurant-with-user', {
                    body: {
                        restaurantData: dbPayload, 
                        userData: { email: merchantEmail, password: merchantPassword }
                    },
                });
                if (functionError) throw functionError;
                addToast({ message: 'Salvo com sucesso!', type: 'success' });
            } else {
                const { error: updateError } = await supabase.from('restaurants').update(dbPayload).eq('id', existingRestaurant.id);
                if (updateError) throw updateError;
                addToast({ message: 'Restaurante atualizado!', type: 'success' });
            }
            
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            setError(`Erro ao salvar: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };


    if (!isOpen) return null;
    
    const isCategorySelected = (catName: string) => {
        if (!formData.category) return false;
        return formData.category.split(',').map(c => c.trim()).includes(catName);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{existingRestaurant ? 'Editar Restaurante' : 'Novo Restaurante'}</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${formData.active ? 'text-green-600' : 'text-red-600'}`}>
                            {formData.active ? 'Ativo' : 'Suspenso'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <div className="flex flex-col md:flex-row items-start gap-4">
                        <div className="flex-shrink-0">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview" className="w-24 h-24 rounded-md object-cover border" loading="lazy" />
                            ) : (
                                <div className="w-24 h-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-sm border">Logo</div>
                            )}
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-1">Logomarca (App irá comprimir)</label>
                            <input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                        </div>
                    </div>

                    <div>
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Restaurante" className="w-full p-3 border rounded-lg bg-gray-50 mb-3"/>
                        
                        <div className="border rounded-lg bg-gray-50 p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categorias</label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => {
                                    const isSelected = isCategorySelected(cat.name);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.name)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                                isSelected 
                                                    ? 'bg-orange-600 text-white border-orange-600' 
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            {isSelected ? '✓ ' : '+ '} {cat.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Endereço" className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} placeholder="Tempo Entrega" className="w-full p-3 border rounded-lg bg-gray-50"/>
                         <div>
                            <label className="text-xs text-gray-500">Taxa de Entrega (R$)</label>
                            <input name="deliveryFee" type="number" value={formData.deliveryFee} onChange={handleChange} min="0" step="0.50" className="w-full p-2 border rounded-lg bg-gray-50"/>
                         </div>
                    </div>
                    
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Funcionamento</h3>
                        <div className="space-y-3">
                            {(formData.operatingHours || []).map((day, index) => (
                                <div key={index} className="p-2 rounded-lg bg-gray-50 border">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4 flex items-center">
                                            <input type="checkbox" checked={day.isOpen} onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)} className="h-4 w-4 mr-2 text-orange-600 rounded focus:ring-orange-500"/>
                                            <span className="font-semibold text-sm text-gray-700">{daysOfWeek[index]}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.opens} onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)} disabled={!day.isOpen} className="w-full p-1 border rounded text-sm disabled:bg-gray-200"/>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.closes} onChange={(e) => handleOperatingHoursChange(index, 'closes', e.target.value)} disabled={!day.isOpen} className="w-full p-1 border rounded text-sm disabled:bg-gray-200"/>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <button type="button" onClick={() => toggleSecondShift(index)} className={`p-1 rounded ${showSecondShift[index] ? 'text-orange-600' : 'text-gray-400'}`}><PlusIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                    {day.isOpen && showSecondShift[index] && (
                                        <div className="grid grid-cols-12 gap-2 items-center mt-2 pt-2 border-t">
                                            <div className="col-span-4 text-right"><span className="text-[10px] font-bold">Turno 2:</span></div>
                                            <div className="col-span-3"><input type="time" value={day.opens2 || ''} onChange={(e) => handleOperatingHoursChange(index, 'opens2', e.target.value)} className="w-full p-1 border rounded text-sm"/></div>
                                            <div className="col-span-3"><input type="time" value={day.closes2 || ''} onChange={(e) => handleOperatingHoursChange(index, 'closes2', e.target.value)} className="w-full p-1 border rounded text-sm"/></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                         <div className="flex items-center justify-between">
                             <h3 className="text-lg font-semibold text-gray-700">Acesso Lojista</h3>
                             {existingRestaurant && (
                                <label className="flex items-center space-x-2 text-sm text-blue-600 cursor-pointer">
                                    <input type="checkbox" checked={changeCredentials} onChange={(e) => setChangeCredentials(e.target.checked)} className="h-4 w-4 text-blue-600"/>
                                    <span>Alterar Login</span>
                                </label>
                             )}
                         </div>
                         {(changeCredentials || !existingRestaurant) && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg">
                                <input type="email" placeholder="Email" value={merchantEmail} onChange={(e) => setMerchantEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-white"/>
                                <input type="password" placeholder="Senha" value={merchantPassword} onChange={(e) => setMerchantPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-white"/>
                             </div>
                         )}
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Formas de Pagamento</label>
                         <div className="p-3 border rounded-lg bg-gray-50 space-y-3">
                             <div className="flex flex-wrap gap-2">
                                 {PREDEFINED_PAYMENT_METHODS.map(method => (
                                     <button key={method} onClick={() => togglePredefinedGateway(method)} className={`px-3 py-1 text-xs font-bold rounded-full border ${formData.paymentGateways.includes(method) ? 'bg-orange-600 text-white' : 'bg-white text-gray-600'}`}>{method}</button>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>

                {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-orange-600 text-white rounded font-bold" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantEditorModal;
