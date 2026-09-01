import React, { useState, useEffect } from 'react';
import type { FeaturedPromo, MenuItem, MenuCategory } from '../types';
import { fetchFeaturedPromos, createFeaturedPromo, updateFeaturedPromo, deleteFeaturedPromo, fetchMenuForRestaurant } from '../services/databaseService';
import { supabase } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import OptimizedImage from './OptimizedImage';

interface FeaturedPromoManagerProps {
    restaurantId: number;
}

export const FeaturedPromoManager: React.FC<FeaturedPromoManagerProps> = ({ restaurantId }) => {
    const [promos, setPromos] = useState<FeaturedPromo[]>([]);
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPromo, setCurrentPromo] = useState<Partial<FeaturedPromo>>({
        title: '',
        description: '',
        fixedPrice: 0,
        originalPrice: 0,
        imageUrl: '',
        itemIds: [],
        includeFreeDelivery: true,
        active: true
    });
    const [isUploading, setIsUploading] = useState(false);
    const { addToast } = useNotification();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedPromos, fetchedMenu] = await Promise.all([
                fetchFeaturedPromos(restaurantId, false),
                fetchMenuForRestaurant(restaurantId)
            ]);
            setPromos(fetchedPromos);
            setMenuCategories(fetchedMenu);
        } catch (error) {
            console.error("Error loading promo manager data:", error);
            addToast({ message: 'Erro ao carregar dados promocionais.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [restaurantId]);

    const handleOpenNew = () => {
        setCurrentPromo({
            title: '',
            description: '',
            fixedPrice: 0,
            originalPrice: 0,
            imageUrl: '',
            itemIds: [],
            includeFreeDelivery: true,
            active: true
        });
        setIsEditing(true);
    };

    const handleOpenEdit = (promo: FeaturedPromo) => {
        setCurrentPromo(promo);
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPromo.title || !currentPromo.fixedPrice) {
            addToast({ message: 'Preencha o Título e o Preço Fixo.', type: 'warning' });
            return;
        }

        try {
            if ('id' in currentPromo && currentPromo.id) {
                await updateFeaturedPromo(restaurantId, currentPromo.id, currentPromo);
                addToast({ message: 'Promoção atualizada com sucesso!', type: 'success' });
            } else {
                await createFeaturedPromo(restaurantId, currentPromo as any);
                addToast({ message: 'Promoção criada com sucesso!', type: 'success' });
            }
            setIsEditing(false);
            loadData();
        } catch (error: any) {
            console.error("Error saving featured promo:", error);
            addToast({ message: `Erro ao salvar: ${error.message || 'Erro desconhecido'}`, type: 'error' });
        }
    };

    const handleToggleActive = async (promo: FeaturedPromo) => {
        try {
            const updatedPromo = { ...promo, active: !promo.active };
            await updateFeaturedPromo(restaurantId, promo.id, updatedPromo);
            addToast({ message: `Promoção ${updatedPromo.active ? 'ativada' : 'desativada'} com sucesso!`, type: 'success' });
            loadData();
        } catch (error: any) {
            console.error("Error toggling promo status:", error);
            addToast({ message: 'Erro ao alterar status da promoção.', type: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja excluir esta promoção?')) return;
        try {
            await deleteFeaturedPromo(restaurantId, id);
            addToast({ message: 'Promoção removida.', type: 'success' });
            loadData();
        } catch (error) {
            addToast({ message: 'Erro ao remover promoção.', type: 'error' });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const fileName = `featured-promo-${Date.now()}.jpg`;
                const filePath = `${restaurantId}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                setCurrentPromo(prev => ({ ...prev, imageUrl: data.publicUrl }));
                addToast({ message: 'Imagem enviada com sucesso!', type: 'success' });
            } catch (err: any) {
                addToast({ message: `Erro ao enviar imagem: ${err.message}`, type: 'error' });
            } finally {
                setIsUploading(false);
            }
        }
    };

    const allItems: MenuItem[] = menuCategories.flatMap(cat => cat.items || []);

    if (isLoading) {
        return <div className="py-12 flex justify-center"><Spinner /></div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Banner e Promoção Destaque na Home</h2>
                    <p className="text-xs text-gray-500">Crie campanhas promocionais em destaque com preço único e frete grátis opcional.</p>
                </div>
                <button
                    onClick={handleOpenNew}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    + Nova Promoção Destaque
                </button>
            </div>

            {/* List of Promos */}
            {promos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">Nenhuma promoção destaque cadastrada ainda.</p>
                    <button onClick={handleOpenNew} className="mt-3 text-orange-600 font-bold text-xs underline">
                        Criar primeira promoção
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promos.map(promo => {
                        const isActive = promo.active !== false;
                        return (
                            <div 
                                key={promo.id} 
                                className={`border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                                    isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50/80 opacity-80 hover:opacity-100'
                                }`}
                            >
                                <div className="relative h-40 bg-gray-100">
                                    <OptimizedImage 
                                        src={promo.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'} 
                                        alt={promo.title} 
                                        className={`w-full h-full object-cover ${!isActive ? 'grayscale-[40%]' : ''}`} 
                                    />
                                    <div className="absolute top-3 left-3 bg-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow">
                                        R$ {promo.fixedPrice.toFixed(2)}
                                    </div>
                                    {promo.includeFreeDelivery && (
                                        <div className="absolute top-3 right-3 bg-green-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow">
                                            Frete Grátis
                                        </div>
                                    )}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                                            <span className="bg-gray-900/85 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow backdrop-blur-sm">
                                                ⏸ Oculto na Home (Inativo)
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 space-y-2 flex-grow">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-gray-900 text-base">{promo.title}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                            isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {isActive ? '● Ativo' : '○ Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{promo.description}</p>
                                    <p className="text-[11px] font-medium text-orange-600">
                                        {promo.itemIds.length} produtos participantes
                                    </p>
                                </div>
                                <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => handleToggleActive(promo)} 
                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                                            isActive 
                                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' 
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                        title={isActive ? 'Ocultar da tela inicial sem apagar' : 'Ativar e exibir na tela inicial'}
                                    >
                                        {isActive ? '⏸ Pausar Promoção' : '▶ Ativar na Home'}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEdit(promo)} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            Editar
                                        </button>
                                        <button onClick={() => handleDelete(promo.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Editor Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsEditing(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-950">
                                {'id' in currentPromo && currentPromo.id ? 'Editar Promoção Destaque' : 'Nova Promoção Destaque'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título do Destaque</label>
                                <input 
                                    type="text" 
                                    value={currentPromo.title || ''} 
                                    onChange={e => setCurrentPromo(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ex: Combo Família: Pizza + Refri 1L + Frete Grátis"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição</label>
                                <textarea 
                                    value={currentPromo.description || ''} 
                                    onChange={e => setCurrentPromo(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Ex: Escolha 1 sabor de pizza participante, acompanham refrigerante 1L e entrega grátis."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preço Fixo (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={currentPromo.fixedPrice || ''} 
                                        onChange={e => setCurrentPromo(prev => ({ ...prev, fixedPrice: parseFloat(e.target.value) || 0 }))}
                                        placeholder="59.90"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preço Original (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={currentPromo.originalPrice || ''} 
                                        onChange={e => setCurrentPromo(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                                        placeholder="85.00"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Imagem do Banner</label>
                                <div className="flex gap-3 items-center">
                                    <input 
                                        type="text" 
                                        value={currentPromo.imageUrl || ''} 
                                        onChange={e => setCurrentPromo(prev => ({ ...prev, imageUrl: e.target.value }))}
                                        placeholder="URL da imagem ou faça upload"
                                        className="flex-grow px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-3 rounded-xl transition-all flex-shrink-0">
                                        {isUploading ? 'Enviando...' : 'Enviar Foto'}
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            {/* Products selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                    Produtos Participantes (O cliente escolherá 1)
                                </label>
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                                    {allItems.map(item => {
                                        const isChecked = currentPromo.itemIds?.includes(item.id);
                                        return (
                                            <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        const currentIds = currentPromo.itemIds || [];
                                                        if (e.target.checked) {
                                                            setCurrentPromo(prev => ({ ...prev, itemIds: [...currentIds, item.id] }));
                                                        } else {
                                                            setCurrentPromo(prev => ({ ...prev, itemIds: currentIds.filter(id => id !== item.id) }));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                                />
                                                <span className="text-xs font-medium text-gray-800">{item.name} - R$ {item.price.toFixed(2)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={currentPromo.includeFreeDelivery ?? true} 
                                        onChange={e => setCurrentPromo(prev => ({ ...prev, includeFreeDelivery: e.target.checked }))}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-xs font-bold text-gray-700">Incluir Frete Grátis</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={currentPromo.active ?? true} 
                                        onChange={e => setCurrentPromo(prev => ({ ...prev, active: e.target.checked }))}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-xs font-bold text-gray-700">Ativo na Home</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow transition-all">
                                    Salvar Promoção
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
