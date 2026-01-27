
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
    const [warning, setWarning] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    
    // UI state to toggle second shift view per day
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


    useEffect(() => {
        if (existingRestaurant) {
            const opHours = existingRestaurant.operatingHours && existingRestaurant.operatingHours.length === 7 
                ? existingRestaurant.operatingHours 
                : getDefaultOperatingHours();
            
            // Determine which days have a second shift active to show UI
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
            setChangeCredentials(true); // Always true for new
            setLogoPreview(null);
        }
        setMerchantEmail('');
        setMerchantPassword('');
        setLogoFile(null);
        setError('');
        setWarning('');
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
    
    // Handle Multi-select Category
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
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
            setLogoPreview(URL.createObjectURL(file));
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
        
        // If enabling, set default times if empty
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
        setWarning('');
        
        if (!formData.name || !formData.category || !formData.address || !formData.phone) {
            setError('Nome, Categoria, Endereço e Telefone são obrigatórios.');
            return;
        }

        if ((!existingRestaurant || changeCredentials) && (!merchantEmail || !merchantPassword)) {
            if (!existingRestaurant) {
                setError('Email e Senha para o lojista são obrigatórios ao criar um novo restaurante.');
                return;
            }
        }
        
        if ((!existingRestaurant || changeCredentials) && merchantPassword && merchantPassword.length < 6) {
             setError('A senha do lojista deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsSaving(true);
        let finalImageUrl = existingRestaurant?.imageUrl || '';

        if (logoFile) {
            try {
                const fileExt = logoFile.name.split('.').pop();
                const filePath = `public/${crypto.randomUUID()}.${fileExt}`;

                if (existingRestaurant?.imageUrl) {
                    try {
                        const oldFilePath = new URL(existingRestaurant.imageUrl).pathname.split('/restaurant-logos/')[1];
                        if (oldFilePath) {
                           await supabase.storage.from('restaurant-logos').remove([oldFilePath]);
                        }
                    } catch (e) {
                        console.warn("Could not parse or remove old logo.", e);
                    }
                }

                const { error: uploadError } = await supabase.storage
                    .from('restaurant-logos')
                    .upload(filePath, logoFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('restaurant-logos')
                    .getPublicUrl(filePath);

                finalImageUrl = data.publicUrl;
            } catch (uploadError: any) {
                setError(`Erro no upload da imagem: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
        }
        
        const openDays = formData.operatingHours?.filter(d => d.isOpen) || [];
        const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
        const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

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
            delivery_fee: formData.deliveryFee || 0,
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
                
                if (data?.warning) {
                    setWarning(data.warning);
                    addToast({ message: 'Atenção ao salvar dados do lojista.', type: 'warning' });
                } else if (data?.success) {
                    addToast({ message: 'Restaurante salvo com sucesso!', type: 'success' });
                    onSaveSuccess();
                    onClose();
                }
            } else {
                const { error: updateError } = await supabase.from('restaurants').update(dbPayload).eq('id', existingRestaurant.id);
                if (updateError) throw updateError;
                addToast({ message: 'Restaurante atualizado com sucesso!', type: 'success' });
                onSaveSuccess();
                onClose();
            }
        } catch (err: any) {
            console.error("Failed to save restaurant:", err);
            setError(`Erro ao salvar: ${err.message || JSON.stringify(err)}`);
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
                    <h2 className="text-2xl font-bold">{existingRestaurant ? 'Editar Restaurante' : 'Adicionar Novo Restaurante'}</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${formData.active ? 'text-green-600' : 'text-red-600'}`}>
                            {formData.active ? 'Loja Ativa' : 'Loja Suspensa'}
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
                             <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-1">Logomarca</label>
                            <input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                        </div>
                    </div>

                    <div>
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Restaurante" className="w-full p-3 border rounded-lg bg-gray-50 mb-3"/>
                        
                        <div className="border rounded-lg bg-gray-50 p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categorias (Selecione uma ou mais)</label>
                            {loadingCategories ? (
                                <div className="p-2 text-sm text-gray-500">Carregando categorias...</div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Endereço" className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                    
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Horário de Funcionamento</h3>
                        <div className="space-y-2">
                            {(formData.operatingHours || []).map((day, index) => (
                                <div key={index} className="p-2 rounded-lg bg-gray-50 border grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4 flex items-center">
                                        <input type="checkbox" checked={day.isOpen} onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)} className="h-4 w-4 mr-2 text-orange-600 rounded focus:ring-orange-500"/>
                                        <span className="font-semibold text-sm text-gray-700">{daysOfWeek[index]}</span>
                                    </div>
                                    <div className="col-span-4">
                                        <input type="time" value={day.opens} onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)} disabled={!day.isOpen} className="w-full p-1 border rounded text-sm disabled:bg-gray-200"/>
                                    </div>
                                    <div className="col-span-4">
                                        <input type="time" value={day.closes} onChange={(e) => handleOperatingHoursChange(index, 'closes', e.target.value)} disabled={!day.isOpen} className="w-full p-1 border rounded text-sm disabled:bg-gray-200"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                         <div className="flex items-center justify-between">
                             <h3 className="text-lg font-semibold text-gray-700">Acesso do Lojista</h3>
                             {existingRestaurant && (
                                <label className="flex items-center space-x-2 text-sm text-blue-600 cursor-pointer">
                                    <input type="checkbox" checked={changeCredentials} onChange={(e) => setChangeCredentials(e.target.checked)} className="h-4 w-4 text-blue-600" />
                                    <span>Alterar Login</span>
                                </label>
                             )}
                         </div>
                         
                         {(changeCredentials || !existingRestaurant) && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <input type="email" placeholder="Email do Lojista" value={merchantEmail} onChange={(e) => setMerchantEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-white"/>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="Senha" value={merchantPassword} onChange={(e) => setMerchantPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-white pr-10"/>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                             </div>
                         )}
                    </div>
                </div>

                {warning && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        <strong>Aviso:</strong> {warning}
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-wrap">
                        {error}
                    </div>
                )}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-orange-300" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantEditorModal;
