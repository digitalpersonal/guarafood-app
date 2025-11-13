import React, { useState, useEffect } from 'react';
import type { Restaurant } from '../types';
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
    });
    // New state for merchant user creation
    const [merchantEmail, setMerchantEmail] = useState('');
    const [merchantPassword, setMerchantPassword] = useState('');

    const [newGateway, setNewGateway] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        if (existingRestaurant) {
            setFormData({
                ...existingRestaurant,
                mercado_pago_credentials: existingRestaurant.mercado_pago_credentials || { accessToken: '' }
            });
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
            });
            // Reset merchant fields for new restaurant
            setMerchantEmail('');
            setMerchantPassword('');
        }
        setError('');
    }, [existingRestaurant, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'rating' || name === 'deliveryFee') ? parseFloat(value) : value }));
    };

    const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            mercado_pago_credentials: { accessToken: value }
        }));
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
        try {
            if (existingRestaurant) {
                // UPDATE existing restaurant - Call Supabase directly
                const { error: updateError } = await supabase.from('restaurants').update(formData).eq('id', existingRestaurant.id);
                if (updateError) throw updateError;
                addToast({ message: 'Restaurante atualizado com sucesso!', type: 'success' });
            } else {
                // CREATE new restaurant and user - Invoke Edge Function
                const { data, error: functionError } = await supabase.functions.invoke('create-restaurant-with-user', {
                    body: {
                        restaurantData: formData,
                        userData: { email: merchantEmail, password: merchantPassword }
                    },
                });

                if (functionError) {
                   throw new Error(functionError.message);
                }
                if (data?.error) { // Handle errors returned from the function body
                    throw new Error(data.error);
                }

                addToast({ message: 'Restaurante e usuário do lojista criados com sucesso!', type: 'success' });
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error("Failed to save restaurant:", err);
            setError(`Erro ao salvar: ${err.message}`);
            addToast({ message: `Erro ao salvar restaurante: ${err.message}`, type: 'error' });
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-500">Horário de Abertura</label>
                            <input name="openingHours" type="time" value={formData.openingHours} onChange={handleChange} className="w-full p-2 border rounded-lg bg-gray-50"/>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Horário de Fechamento</label>
                            <input name="closingHours" type="time" value={formData.closingHours} onChange={handleChange} className="w-full p-2 border rounded-lg bg-gray-50"/>
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
                                    placeholder="Adicionar nova forma..."
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