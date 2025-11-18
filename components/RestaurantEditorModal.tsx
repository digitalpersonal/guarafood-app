




import React, { useState, useEffect } from 'react';
import type { Restaurant, OperatingHours, RestaurantCategory } from '../types';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/api';
import { fetchRestaurantCategories } from '../services/databaseService';

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
    });
    
    const [merchantEmail, setMerchantEmail] = useState('');
    const [merchantPassword, setMerchantPassword] = useState('');

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [newGateway, setNewGateway] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);


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
            setFormData({
                ...existingRestaurant,
                mercado_pago_credentials: existingRestaurant.mercado_pago_credentials || { accessToken: '' },
                operatingHours: existingRestaurant.operatingHours && existingRestaurant.operatingHours.length === 7 
                    ? existingRestaurant.operatingHours 
                    : getDefaultOperatingHours(),
            });
            setLogoPreview(existingRestaurant.imageUrl);
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
            });
            setMerchantEmail('');
            setMerchantPassword('');
            setLogoPreview(null);
        }
        setLogoFile(null);
        setError('');
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
        setFormData(prev => ({ ...prev, [name]: (name === 'rating' || name === 'deliveryFee') ? parseFloat(value) : value }));
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

    const handleOperatingHoursChange = (dayIndex: number, field: 'isOpen' | 'opens' | 'closes', value: string | boolean) => {
        setFormData(prev => {
            const newHours = [...(prev.operatingHours || getDefaultOperatingHours())];
            const day = { ...newHours[dayIndex] };
            (day as any)[field] = value;
            newHours[dayIndex] = day;
            return { ...prev, operatingHours: newHours };
        });
    };

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

    const handleSubmit = async () => {
        setError('');
        if (!formData.name || !formData.category || !formData.address || !formData.phone) {
            setError('Nome, Categoria, Endereço e Telefone são obrigatórios.');
            return;
        }

        if (!existingRestaurant && (!merchantEmail || !merchantPassword)) {
            setError('Email e Senha para o lojista são obrigatórios ao criar um novo restaurante.');
            return;
        }
        if (!existingRestaurant && merchantPassword.length < 6) {
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
                setError(`Erro no upload da logo: ${uploadError.message}`);
                setIsSaving(false);
                return;
            }
        }
        
        const openDays = formData.operatingHours?.filter(d => d.isOpen) || [];
        const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
        const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

        // We use camelCase payload because snake_case fetch failed previously, implies camelCase columns.
        const dbPayload = {
            name: formData.name,
            category: formData.category,
            deliveryTime: formData.deliveryTime,
            rating: formData.rating,
            imageUrl: finalImageUrl,
            paymentGateways: formData.paymentGateways,
            address: formData.address,
            phone: formData.phone,
            openingHours: openingHoursSummary,
            closingHours: closingHoursSummary,
            deliveryFee: formData.deliveryFee,
            mercado_pago_credentials: formData.mercado_pago_credentials,
            operatingHours: formData.operatingHours,
        };

        try {
            if (existingRestaurant) {
                const { error: updateError } = await supabase.from('restaurants').update(dbPayload).eq('id', existingRestaurant.id);
                if (updateError) throw updateError;
                addToast({ message: 'Restaurante atualizado com sucesso!', type: 'success' });
            } else {
                try {
                    const { data, error: functionError } = await supabase.functions.invoke('create-restaurant-with-user', {
                        body: {
                            restaurantData: dbPayload,
                            userData: { email: merchantEmail, password: merchantPassword }
                        },
                    });

                    if (functionError) throw functionError;
                    // Handle potential error object from edge function
                    if (data?.error) {
                         throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
                    }

                    addToast({ message: 'Restaurante e usuário do lojista criados com sucesso!', type: 'success' });
                } catch (edgeError: any) {
                     console.warn("Edge function failed. Falling back to direct insert.", edgeError);
                     // Fallback to direct insert (will not create user)
                     const { error: restError } = await supabase.from('restaurants').insert(dbPayload);
                     if (restError) throw restError;
                     
                     addToast({ 
                         message: 'Restaurante criado! (Nota: O usuário do lojista não pôde ser criado automaticamente).', 
                         type: 'info', 
                         duration: 6000 
                    });
                }
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error("Failed to save restaurant:", err);
            // Enhanced error message specifically for schema issues
            let msg = `Erro ao salvar: ${err.message || JSON.stringify(err)}`;
            if (msg.includes('schema cache') || msg.includes('column')) {
                msg += " (Verifique se as colunas no Supabase correspondem ao camelCase: deliveryTime, deliveryFee, etc.)";
            }
            setError(msg);
            addToast({ message: msg, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{existingRestaurant ? 'Editar Restaurante' : 'Adicionar Novo Restaurante'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    {/* Image Upload */}
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

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Restaurante" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        
                        <div>
                            {loadingCategories ? (
                                <div className="p-3 text-sm text-gray-500">Carregando categorias...</div>
                            ) : (
                                <select 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    className="w-full p-3 border rounded-lg bg-gray-50"
                                >
                                    <option value="" disabled>Selecione a Categoria</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            )}
                            {categories.length === 0 && !loadingCategories && (
                                <p className="text-xs text-red-500 mt-1">Nenhuma categoria cadastrada. Vá em "Categorias" no painel para criar.</p>
                            )}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Endereço" className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} placeholder="Tempo Entrega" className="w-full p-3 border rounded-lg bg-gray-50"/>
                         <div>
                            <label className="text-xs text-gray-500">Taxa de Entrega (R$)</label>
                            <input name="deliveryFee" type="number" value={formData.deliveryFee} onChange={handleChange} min="0" step="0.50" className="w-full p-2 border rounded-lg bg-gray-50"/>
                         </div>
                         <div>
                            <label className="text-xs text-gray-500">Nota (1-5)</label>
                            <input name="rating" type="number" value={formData.rating} onChange={handleChange} min="1" max="5" step="0.1" className="w-full p-2 border rounded-lg bg-gray-50"/>
                         </div>
                    </div>
                    
                    {/* Operating Hours */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Horário de Funcionamento</h3>
                        <div className="space-y-2">
                            {(formData.operatingHours || []).map((day, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 border">
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

                    {/* Merchant User (Only for New) */}
                    {!existingRestaurant && (
                        <div className="border-t pt-4 space-y-3">
                             <h3 className="text-lg font-semibold text-gray-700">Criar Acesso para o Lojista</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="email" placeholder="Email do Lojista" value={merchantEmail} onChange={(e) => setMerchantEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                                <input type="password" placeholder="Senha" value={merchantPassword} onChange={(e) => setMerchantPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                             </div>
                        </div>
                    )}

                    {/* Payment Methods */}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Formas de Pagamento</label>
                         <div className="p-3 border rounded-lg bg-gray-50 space-y-3">
                             <div className="flex flex-wrap gap-2 mb-3">
                                 {PREDEFINED_PAYMENT_METHODS.map(method => (
                                     <button key={method} onClick={() => togglePredefinedGateway(method)} className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${formData.paymentGateways.includes(method) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                                         {formData.paymentGateways.includes(method) ? '✓ ' : '+ '} {method}
                                     </button>
                                 ))}
                             </div>
                             <div className="flex gap-2">
                                <input type="text" value={newGateway} onChange={(e) => setNewGateway(e.target.value)} placeholder="Outra forma..." className="flex-grow p-2 border rounded-md bg-white"/>
                                <button type="button" onClick={handleAddGateway} className="bg-blue-600 text-white font-semibold px-4 rounded-md hover:bg-blue-700">Adicionar</button>
                            </div>
                        </div>
                    </div>
                    
                     {/* Mercado Pago */}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credenciais do Mercado Pago</label>
                        <input type="password" placeholder="Access Token" value={formData.mercado_pago_credentials?.accessToken || ''} onChange={handleCredentialsChange} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-orange-300" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantEditorModal;
