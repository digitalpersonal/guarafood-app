
import React, { useState, useEffect } from 'react';
import type { Banner, Restaurant, RestaurantCategory } from '../types';
import { 
    fetchBanners, 
    createBanner, 
    updateBanner, 
    deleteBanner,
    fetchRestaurantsSecure,
    fetchRestaurantCategories
} from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);

interface BannerEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    existingBanner: Banner | null;
    restaurants: Restaurant[];
    categories: RestaurantCategory[];
}

const BannerEditorModal: React.FC<BannerEditorModalProps> = ({ isOpen, onClose, onSaveSuccess, existingBanner, restaurants, categories }) => {
    const [formData, setFormData] = useState<Partial<Banner>>({
        title: '',
        description: '',
        imageUrl: '',
        ctaText: 'Ver Mais',
        targetType: 'category',
        targetValue: '',
        active: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useNotification();

    useEffect(() => {
        if (existingBanner) {
            setFormData(existingBanner);
        } else {
            setFormData({
                title: '',
                description: '',
                imageUrl: '',
                ctaText: 'Ver Mais',
                targetType: 'category',
                targetValue: categories.length > 0 ? categories[0].name : '',
                active: true
            });
        }
    }, [existingBanner, isOpen, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.title || !formData.imageUrl || !formData.targetValue) {
            setError("Por favor preencha os campos obrigatórios.");
            setIsSaving(false);
            return;
        }

        try {
            if (existingBanner) {
                await updateBanner(existingBanner.id, formData);
                addToast({ message: 'Banner atualizado!', type: 'success' });
            } else {
                await createBanner(formData as Omit<Banner, 'id'>);
                addToast({ message: 'Banner criado!', type: 'success' });
            }
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold">{existingBanner ? 'Editar Banner' : 'Novo Banner'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input name="title" value={formData.title} onChange={handleChange} required className="w-full p-2 border rounded mt-1" placeholder="Ex: Festival de Pizza" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descrição</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded mt-1" placeholder="Ex: As melhores pizzas com 20% de desconto" rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">URL da Imagem</label>
                        <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} required className="w-full p-2 border rounded mt-1" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Texto do Botão (CTA)</label>
                        <input name="ctaText" value={formData.ctaText} onChange={handleChange} required className="w-full p-2 border rounded mt-1" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Link</label>
                            <select name="targetType" value={formData.targetType} onChange={handleChange} className="w-full p-2 border rounded mt-1">
                                <option value="category">Categoria</option>
                                <option value="restaurant">Restaurante</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Destino</label>
                            <select name="targetValue" value={formData.targetValue} onChange={handleChange} className="w-full p-2 border rounded mt-1" required>
                                <option value="" disabled>Selecione...</option>
                                {formData.targetType === 'restaurant' 
                                    ? restaurants.map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                                    : categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                }
                            </select>
                            {restaurants.length === 0 && formData.targetType === 'restaurant' && (
                                <p className="text-xs text-red-500 mt-1">Nenhum restaurante carregado.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center mt-2">
                        <input type="checkbox" id="active" name="active" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="h-4 w-4 text-orange-600 rounded" />
                        <label htmlFor="active" className="ml-2 text-sm text-gray-900">Banner Ativo</label>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const MarketingManagement: React.FC = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const { addToast, confirm } = useNotification();

    const loadData = async () => {
        setIsLoading(true);
        
        // Using Promise.allSettled to allow partial loading of data
        // This prevents one failure (e.g. restaurants) from blocking the whole page
        const results = await Promise.allSettled([
            fetchBanners(),
            fetchRestaurantsSecure(),
            fetchRestaurantCategories()
        ]);

        const [bannersResult, restaurantsResult, categoriesResult] = results;

        // Handle Banners
        if (bannersResult.status === 'fulfilled') {
            setBanners(bannersResult.value);
        } else {
            console.error("Failed to fetch banners:", bannersResult.reason);
            addToast({ message: 'Aviso: Não foi possível carregar os banners existentes.', type: 'error' });
        }

        // Handle Restaurants
        if (restaurantsResult.status === 'fulfilled') {
            setRestaurants(restaurantsResult.value);
        } else {
            console.error("Failed to fetch restaurants:", restaurantsResult.reason);
            addToast({ message: 'Aviso: Não foi possível carregar a lista de restaurantes.', type: 'error' });
        }

        // Handle Categories
        if (categoriesResult.status === 'fulfilled') {
            setCategories(categoriesResult.value);
        } else {
            console.error("Failed to fetch categories:", categoriesResult.reason);
            // No toast needed, usually defaults fall back inside the service
        }

        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (banner: Banner | null) => {
        setEditingBanner(banner);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            title: 'Excluir Banner',
            message: 'Tem certeza que deseja remover este banner?',
            confirmText: 'Excluir',
            isDestructive: true
        });

        if (confirmed) {
            try {
                await deleteBanner(id);
                addToast({ message: 'Banner excluído.', type: 'info' });
                loadData();
            } catch (err) {
                addToast({ message: 'Erro ao excluir.', type: 'error' });
            }
        }
    };

    if (isLoading) return <Spinner message="Carregando banners..." />;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Banners da Tela Inicial</h2>
                <button 
                    onClick={() => handleOpenModal(null)}
                    className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                >
                    + Novo Banner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map(banner => (
                    <div key={banner.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="h-40 bg-gray-200 relative">
                             <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                             {!banner.active && (
                                 <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                     <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">INATIVO</span>
                                 </div>
                             )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-lg truncate">{banner.title}</h3>
                            <p className="text-sm text-gray-500 truncate">{banner.description}</p>
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                <span>Link: {banner.targetType === 'category' ? 'Categoria' : 'Restaurante'}</span>
                                <span className="font-medium text-gray-600 truncate max-w-[100px]">{banner.targetValue}</span>
                            </div>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg p-1 shadow-sm">
                            <button onClick={() => handleOpenModal(banner)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><EditIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {banners.length === 0 && (
                <p className="text-center text-gray-500 py-10">Nenhum banner cadastrado.</p>
            )}

            {isModalOpen && (
                <BannerEditorModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSaveSuccess={loadData}
                    existingBanner={editingBanner}
                    restaurants={restaurants}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default MarketingManagement;
