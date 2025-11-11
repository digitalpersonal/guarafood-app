

import React, { useState, useEffect } from 'react';
import type { Restaurant } from '../types';
import ImageUploader from './ImageUploader';
import { useNotification } from '../hooks/useNotification';


interface RestaurantEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (restaurantData: Omit<Restaurant, 'id'> | Restaurant) => void;
    existingRestaurant: Restaurant | null;
}

// FIX: Type definition to handle the structure of mercado_pago_credentials
type FormData = Omit<Restaurant, 'id' | 'mercado_pago_credentials'> & {
    mercado_pago_credentials?: { accessToken: string };
};


const RestaurantEditorModal: React.FC<RestaurantEditorModalProps> = ({ isOpen, onClose, onSave, existingRestaurant }) => {
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
    const [newGateway, setNewGateway] = useState('');
    const [error, setError] = useState('');

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


    const handleImageUpdate = (newUrl: string) => {
        setFormData(prev => ({ ...prev, imageUrl: newUrl }));
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.category || !formData.address || !formData.phone) {
            setError('Nome, Categoria, Endereço e Telefone são obrigatórios.');
            return;
        }

        if (existingRestaurant) {
             onSave({ ...formData, id: existingRestaurant.id });
        } else {
             onSave(formData);
        }
    };

    if (!isOpen) return null;

    const imagePromptSuggestion = `A vibrant and appealing photo for a restaurant named '${formData.name || 'our restaurant'}' in the category '${formData.category || 'food'}'. Professional food photography style, appetizing, high-resolution.`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{existingRestaurant ? 'Editar Restaurante' : 'Adicionar Novo Restaurante'}</h2>
                
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
                    
                    <ImageUploader
                        imageUrl={formData.imageUrl}
                        onImageUpdate={handleImageUpdate}
                        promptSuggestion={imagePromptSuggestion}
                    />

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

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestaurantEditorModal;