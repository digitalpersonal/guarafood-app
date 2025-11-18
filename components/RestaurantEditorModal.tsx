
import React, { useState, useEffect } from 'react';
import type { Restaurant, OperatingHours } from '../types';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/api'; // Import supabase client

interface RestaurantEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void; // Changed from onSave to onSaveSuccess
    existingRestaurant: Restaurant | null;
}

// FIX: Type definition to handle the structure of mercado_pago_credentials
type FormData = Omit<Restaurant, 'id'> & {
    // This makes the nested property optional as well
};

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PREDEFINED_PAYMENT_METHODS = [
    "Pix",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Dinheiro",
    "Marcar na minha conta"
];

// Function to generate default hours (all closed)
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
    // New state for merchant user creation
    const [merchantEmail, setMerchantEmail] = useState('');
    const [merchantPassword, setMerchantPassword] = useState('');

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [newGateway, setNewGateway] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);


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
            // Reset merchant fields for new restaurant
            setMerchantEmail('');
            setMerchantPassword('');
            setLogoPreview(null);
        }
        setLogoFile(null);
        setError('');
    }, [existingRestaurant, isOpen]);
    
    // Cleanup for image preview object URL
    useEffect(() => {
        return () => {
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'rating' || name === 'deliveryFee') ? parseFloat(value) : value }));
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview); // Clean up previous local URL
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

        // Additional validation for new restaurant with user
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
                // Public bucket: 'restaurant-logos', Path: {uuid}.{ext}
                const fileExt = logoFile.name.split('.').pop();
                const filePath = `public/${crypto.randomUUID()}.${fileExt}`;

                // If updating and there's an old logo, delete it
                if (existingRestaurant?.imageUrl) {
                    try {
                        const oldFilePath = new URL(existingRestaurant.imageUrl).pathname.split('/restaurant-logos/')[1];
                        if (oldFilePath) {
                           await supabase.storage.from('restaurant-logos').remove([oldFilePath]);
                        }
                    } catch (e) {
                        console.warn("Could not parse or remove old logo. It may not exist in storage.", e);
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
        
        // Generate summary for old fields
        const openDays = formData.operatingHours?.filter(d => d.isOpen) || [];
        const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
        const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

        // Map camelCase form data to snake_case database columns
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
            delivery_fee: formData.deliveryFee,
            mercado_pago_credentials: formData.mercado_pago_credentials,
            operating_hours: formData.operatingHours,
        };

        try {
            if (existingRestaurant) {
                // UPDATE existing restaurant - Call Supabase directly with mapped payload
                const { error: updateError } = await supabase.from('restaurants').update(dbPayload).eq('id', existingRestaurant.id);
                if (updateError) throw updateError;
                addToast({ message: 'Restaurante atualizado com sucesso!', type: 'success' });
            } else {
                // CREATE new restaurant and user - Try Edge Function first
                try {
                    const { data, error: functionError } = await supabase.functions.invoke('create-restaurant-with-user', {
                        body: {
                            restaurantData: dbPayload,
                            userData: { email: merchantEmail, password: merchantPassword }
                        },
                    });

                    if (functionError) throw functionError;
                    if (data?.error) throw new Error(data.error);

                    addToast({ message: 'Restaurante e usuário do lojista criados com sucesso!', type: 'success' });
                } catch (edgeError: any) {
                     console.warn("Edge function failed, likely due to environment. Falling back to direct insert.", edgeError);
                     
                     // FALLBACK: Insert restaurant directly using mapped payload
                     const { error: restError } = await supabase.from('restaurants').insert(dbPayload);
                     
                     if (restError) throw restError;
                     
                     addToast({ 
                         message: 'Restaurante criado! (Nota: O usuário do lojista não pôde ser criado automaticamente devido a erro no servidor).', 
                         type: 'info', 
                         duration: 6000 
                    });
                }
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error("Failed to save restaurant:", err);
            setError(`Erro ao salvar: ${err.message}`);
            addToast({ message: `Erro crítico ao salvar: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="restaurant-editor-modal-title">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 id="restaurant-editor-modal-title" className="text-2xl font-bold mb-4">{existingRestaurant ? 'Editar Restaurante' : 'Adicionar Novo Restaurante'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <div className="flex flex-col md:flex-row items-start gap-4">
                        <div className="flex-shrink-0">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview da Logo" className="w-24 h-24 rounded-md object-cover border" loading="lazy" />
                            ) : (
                                <div className="w-24 h-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-sm text-center p-2 border">
                                    Logo
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                             <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-1">
                                Logomarca do Restaurante
                            </label>
                            <input
                                id="logoUpload"
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleLogoChange}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-orange-50 file:text-orange-700
                                    hover:file:bg-orange-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Envie um arquivo de imagem (PNG, JPG, WEBP).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Restaurante" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input name="category" value={formData.category} onChange={handleChange} placeholder="Categoria (ex: Italiana)" className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input name="address" value={formData.address} onChange={handleChange} placeholder="Endereço Completo" className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} placeholder="Tempo de Entrega" className="w-full p-3 border rounded-lg bg-gray-50 col-span-1"/>
                         <div className="col-span-1">
                            <label className="text-sm text-gray-500">Taxa de Entrega (R$)</label>
                            <input name="deliveryFee" type="number" value={formData.deliveryFee} onChange={handleChange} min="0" step="0.50" className="w-full p-2 border rounded-lg bg-gray-50"/>
                         </div>
                         <div className="col-span-1">
                            <label className="text-sm text-gray-500">Nota (1-5)</label>
                            <input name="rating" type="number" value={formData.rating} onChange={handleChange} min="1" max="5" step="0.1" className="w-full p-2 border rounded-lg bg-gray-50"/>
                         </div>
                    </div>
                    
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Horário de Funcionamento</h3>
                        <div className="space-y-3">
                            {(formData.operatingHours || []).map((day, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 border">
                                    <div className="col-span-4 flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`isopen-${index}`}
                                            checked={day.isOpen}
                                            onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                                        />
                                        <label htmlFor={`isopen-${index}`} className="font-semibold text-gray-700">{daysOfWeek[index]}</label>
                                    </div>
                                    <div className="col-span-4">
                                        <label htmlFor={`opens-${index}`} className="text-xs text-gray-500">Abre às</label>
                                        <input 
                                            id={`opens-${index}`}
                                            type="time" 
                                            value={day.opens}
                                            onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-1 border rounded-md disabled:bg-gray-200"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <label htmlFor={`closes-${index}`} className="text-xs text-gray-500">Fecha às</label>
                                        <input 
                                            id={`closes-${index}`}
                                            type="time" 
                                            value={day.closes}
                                            onChange={(e) => handleOperatingHoursChange(index, 'closes', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-1 border rounded-md disabled:bg-gray-200"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* NEW: Merchant user creation fields - only for new restaurants */}
                    {!existingRestaurant && (
                        <div className="border-t pt-4 space-y-3">
                             <h3 className="text-lg font-semibold text-gray-700">Criar Acesso para o Lojista</h3>
                             <p className="text-sm text-gray-500">Crie as credenciais para o proprietário do restaurante acessar o painel de gerenciamento de pedidos.</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                    type="email" 
                                    placeholder="Email do Lojista" 
                                    value={merchantEmail}
                                    onChange={(e) => setMerchantEmail(e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-gray-50"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Senha (mínimo 6 caracteres)" 
                                    value={merchantPassword}
                                    onChange={(e) => setMerchantPassword(e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-gray-50"
                                />
                             </div>
                        </div>
                    )}


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Formas de Pagamento</label>
                         <div className="p-3 border rounded-lg bg-gray-50 space-y-3">
                             <div className="flex flex-wrap gap-2 mb-3">
                                 {PREDEFINED_PAYMENT_METHODS.map(method => (
                                     <button
                                        key={method}
                                        onClick={() => togglePredefinedGateway(method)}
                                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                                            formData.paymentGateways.includes(method) 
                                                ? 'bg-orange-600 text-white border-orange-600' 
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                        }`}
                                     >
                                         {formData.paymentGateways.includes(method) ? '✓ ' : '+ '} {method}
                                     </button>
                                 ))}
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {formData.paymentGateways.map((gateway, index) => (
                                     <div key={index} className="flex items-center bg-gray-200 text-gray-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                                        <span>{gateway}</span>
                                        <button type="button" onClick={() => handleRemoveGateway(gateway)} className="ml-2 text-gray-500 hover:text-red-600 text-lg font-bold" aria-label={`Remover ${gateway}`}>
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newGateway}
                                    onChange={(e) => setNewGateway(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGateway())}
                                    placeholder="Outra forma (ex: Ticket)..."
                                    className="flex-grow p-2 border rounded-md bg-white"
                                />
                                <button type="button" onClick={handleAddGateway} className="bg-blue-600 text-white font-semibold px-4 rounded-md hover:bg-blue-700">
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="mercadoPagoToken" className="block text-sm font-medium text-gray-700 mb-1">
                            Credenciais do Mercado Pago
                        </label>
                        <input
                            id="mercadoPagoToken"
                            type="password"
                            placeholder="Access Token do Vendedor"
                            value={formData.mercado_pago_credentials?.accessToken || ''}
                            onChange={handleCredentialsChange}
                            className="w-full p-3 border rounded-lg bg-gray-50"
                        />
                         <p className="text-xs text-gray-500 mt-1">Essa chave permite que os pagamentos via Pix caiam diretamente na conta do comerciante.</p>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" disabled={isSaving}>
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-orange-300" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantEditorModal;
