
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import type { MenuItem, Combo, MenuCategory, Promotion, Coupon, Addon } from '../types';
import {
    fetchMenuForRestaurant,
    createCombo,
    updateCombo,
    deleteCombo,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryOrder,
    fetchPromotionsForRestaurant,
    createPromotion,
    updatePromotion,
    deletePromotion,
    fetchCouponsForRestaurant,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    fetchAddonsForRestaurant,
    createAddon,
    updateAddon,
    deleteAddon,
} from '../services/databaseService';
import Spinner from './Spinner';
import ComboEditorModal from './ComboEditorModal';
import MenuItemEditorModal from './MenuItemEditorModal';
import PromotionEditorModal from './PromotionEditorModal';
import CouponEditorModal from './CouponEditorModal';
import AddonEditorModal from './AddonEditorModal';
import { getErrorMessage } from '../services/api';

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
);
const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
);
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
);
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
);
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
);
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
);
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);


const MenuManagement: React.FC<{ restaurantId?: number, onBack?: () => void }> = ({ restaurantId: propRestaurantId, onBack }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modals State
    const [isComboModalOpen, setIsComboModalOpen] = useState(false);
    const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<{ item: MenuItem; categoryName: string } | null>(null);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);


    // Category editing state
    const [editingCategory, setEditingCategory] = useState<{ id: number; oldName: string; newName: string; newIconUrl: string | null } | null>(null);

    const restaurantId = propRestaurantId || currentUser?.restaurantId;

    const allMenuItems = menuCategories.flatMap(c => c.items);
    const allCombos = menuCategories.flatMap(c => c.combos || []);

    const loadData = useCallback(async () => {
        if (!restaurantId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const [menuData, promoData, couponData, addonData] = await Promise.all([
                fetchMenuForRestaurant(restaurantId),
                fetchPromotionsForRestaurant(restaurantId),
                fetchCouponsForRestaurant(restaurantId),
                fetchAddonsForRestaurant(restaurantId)
            ]);
            setMenuCategories(menuData);
            setPromotions(promoData);
            setCoupons(couponData);
            setAddons(addonData);
            setError(null);
        } catch (err) {
            console.error("Failed to load menu management data:", err);
            setError(`Falha ao carregar os dados do cardápio e promoções: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        // Prevent infinite loading if no ID
        if (restaurantId) {
            setIsLoading(true);
            loadData();
        } else {
            setIsLoading(false);
        }
    }, [loadData, restaurantId]);

    // --- Promotion Handlers ---
    const handleOpenPromoModal = (promo: Promotion | null = null) => {
        setEditingPromo(promo);
        setIsPromoModalOpen(true);
    };
    const handleSavePromo = async (promoData: Omit<Promotion, 'id' | 'restaurantId'>) => {
        if (!restaurantId) return;
        try {
            if (editingPromo) {
                await updatePromotion(restaurantId, editingPromo.id, promoData);
                 addToast({ message: 'Promoção atualizada!', type: 'success' });
            } else {
                await createPromotion(restaurantId, promoData);
                addToast({ message: 'Promoção criada!', type: 'success' });
            }
            setIsPromoModalOpen(false);
            await loadData();
        } catch (error) { 
            console.error("Failed to save promotion:", error);
            addToast({ message: `Erro ao salvar promoção: ${getErrorMessage(error)}`, type: 'error' });
        }
    };
     const handleDeletePromo = async (promoId: number) => {
        if (!restaurantId) return;
        const confirmed = await confirm({
            title: 'Excluir Promoção',
            message: 'Tem certeza que deseja excluir esta promoção?',
            confirmText: 'Excluir',
            isDestructive: true,
        });
        if (!confirmed) return;

        try {
            await deletePromotion(restaurantId, promoId);
            addToast({ message: 'Promoção excluída.', type: 'info' });
            await loadData();
        } catch (error) { 
            console.error("Failed to delete promotion:", error);
            addToast({ message: `Erro ao excluir promoção: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    // --- Coupon Handlers ---
    const handleOpenCouponModal = (coupon: Coupon | null = null) => {
        setEditingCoupon(coupon);
        setIsCouponModalOpen(true);
    };

    const handleSaveCoupon = async (couponData: Omit<Coupon, 'id' | 'restaurantId'>) => {
        if (!restaurantId) return;
        try {
            if (editingCoupon) {
                await updateCoupon(restaurantId, editingCoupon.id, couponData);
                addToast({ message: 'Cupom atualizado!', type: 'success' });
            } else {
                await createCoupon(restaurantId, couponData);
                addToast({ message: 'Cupom criado!', type: 'success' });
            }
            setIsCouponModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Failed to save coupon:", error);
            addToast({ message: `Erro ao salvar cupom: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    const handleDeleteCoupon = async (couponId: number) => {
        if (!restaurantId) return;
        const confirmed = await confirm({ title: 'Excluir Cupom', message: 'Tem certeza?', confirmText: 'Excluir', isDestructive: true });
        if (!confirmed) return;

        try {
            await deleteCoupon(restaurantId, couponId);
            addToast({ message: 'Cupom excluído.', type: 'info' });
            await loadData();
        } catch (error) {
            console.error("Failed to delete coupon:", error);
            addToast({ message: `Erro ao excluir cupom: ${getErrorMessage(error)}`, type: 'error' });
        }
    };
    
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => addToast({ message: `Código "${code}" copiado!`, type: 'success' }))
            .catch(err => addToast({ message: 'Falha ao copiar código.', type: 'error' }));
    };

    // --- ADDON HANDLERS ---
    const handleOpenAddonModal = (addon: Addon | null = null) => {
        setEditingAddon(addon);
        setIsAddonModalOpen(true);
    };

    const handleSaveAddon = async (addonData: Omit<Addon, 'id' | 'restaurantId'>) => {
        if (!restaurantId) {
            addToast({ message: 'Erro: ID do restaurante não encontrado. Recarregue a página.', type: 'error' });
            return;
        }
        try {
            if (editingAddon) {
                await updateAddon(restaurantId, editingAddon.id, addonData);
                addToast({ message: 'Adicional atualizado!', type: 'success' });
            } else {
                await createAddon(restaurantId, addonData);
                addToast({ message: 'Adicional criado!', type: 'success' });
            }
            setIsAddonModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Failed to save addon:", error);
            addToast({ message: `Erro ao salvar adicional: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    const handleDeleteAddon = async (addonId: number) => {
        if (!restaurantId) return;
        const confirmed = await confirm({ title: 'Excluir Adicional', message: 'Tem certeza?', confirmText: 'Excluir', isDestructive: true });
        if (!confirmed) return;

        try {
            await deleteAddon(restaurantId, addonId);
            addToast({ message: 'Adicional excluído.', type: 'info' });
            await loadData();
        } catch (error) {
            console.error("Failed to delete addon:", error);
            addToast({ message: `Erro ao excluir adicional: ${getErrorMessage(error)}`, type: 'error' });
        }
    };


    // --- Combo Handlers ---
    const handleOpenComboModal = (combo: Combo | null = null) => {
        setEditingCombo(combo);
        setIsComboModalOpen(true);
    };
    const handleSaveCombo = async (comboData: Omit<Combo, 'id' | 'restaurantId'>) => {
        if (!restaurantId) return;
        try {
            if (editingCombo) {
                await updateCombo(restaurantId, editingCombo.id, comboData);
                addToast({ message: 'Combo atualizado!', type: 'success' });
            } else {
                await createCombo(restaurantId, comboData);
                addToast({ message: 'Combo criado!', type: 'success' });
            }
            setIsComboModalOpen(false);
            await loadData();
        } catch (error) { 
            console.error("Failed to save combo:", error);
            addToast({ message: `Erro ao salvar combo: ${getErrorMessage(error)}`, type: 'error' });
        }
    };
    const handleDeleteCombo = async (comboId: number) => {
        if (!restaurantId) return;
        const confirmed = await confirm({ title: 'Excluir Combo', message: 'Tem certeza?', confirmText: 'Excluir', isDestructive: true });
        if (!confirmed) return;

        try {
            await deleteCombo(restaurantId, comboId);
            addToast({ message: 'Combo excluído.', type: 'info' });
            await loadData();
        } catch (error) {
            console.error("Failed to delete combo:", error);
            addToast({ message: `Erro ao excluir combo: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    // --- Menu Item Handlers ---
    const handleOpenItemModal = (item: MenuItem | null = null, categoryName: string = '') => {
        setEditingItem(item ? { item, categoryName } : null);
        setIsItemModalOpen(true);
    };
    const handleSaveItem = async (itemData: Omit<MenuItem, 'id' | 'restaurantId'>, category: string) => {
        if (!restaurantId) return;
        try {
            const payload = { ...itemData, category };
            if (editingItem) {
                await updateMenuItem(restaurantId, editingItem.item.id, payload);
                addToast({ message: 'Item atualizado!', type: 'success' });
            } else {
                await createMenuItem(restaurantId, payload);
                addToast({ message: 'Item criado!', type: 'success' });
            }
            setIsItemModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Failed to save menu item:", error);
            addToast({ message: `Erro ao salvar item: ${getErrorMessage(error)}`, type: 'error' });
        }
    };
    const handleDeleteItem = async (itemId: number) => {
        if (!restaurantId) return;
        const confirmed = await confirm({ title: 'Excluir Item', message: 'Tem certeza?', confirmText: 'Excluir', isDestructive: true });
        if (!confirmed) return;

        try {
            await deleteMenuItem(restaurantId, itemId);
            addToast({ message: 'Item excluído.', type: 'info' });
            await loadData();
        } catch (error) {
            console.error("Failed to delete menu item:", error);
            addToast({ message: `Erro ao excluir item: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    // --- Category Handlers ---
    const handleCreateCategory = async () => {
        const name = await prompt({
            title: "Nova Categoria",
            message: "Digite o nome da nova categoria (ex: Bebidas, Lanches):",
            placeholder: "Nome da categoria"
        });
        if (name?.trim() && restaurantId) {
            try {
                await createCategory(restaurantId, name.trim()); // No iconUrl for initial creation
                await loadData();
                addToast({ message: 'Categoria criada!', type: 'success' });
            } catch (error) {
                addToast({ message: `Erro: ${getErrorMessage(error)}`, type: 'error' });
            }
        }
    };

    const handleEditCategory = (category: MenuCategory) => {
        setEditingCategory({ 
            id: category.id,
            oldName: category.name,
            newName: category.name,
            newIconUrl: category.iconUrl || null // Initialize with existing iconUrl or null
        });
    };

    const handleSaveCategoryChanges = async () => {
        if (!editingCategory || !restaurantId) return;
        const { id, oldName, newName, newIconUrl } = editingCategory;
        if (newName.trim() === '' || (newName === oldName && newIconUrl === (menuCategories.find(c => c.id === id)?.iconUrl || null))) {
            setEditingCategory(null); // No changes made
            return;
        }
        try {
            await updateCategory(restaurantId, id, newName.trim(), newIconUrl);
            setEditingCategory(null);
            await loadData();
            addToast({ message: 'Categoria atualizada!', type: 'success' });
        } catch (error) {
            addToast({ message: `Erro ao salvar categoria: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        const category = menuCategories.find(c => c.name === categoryName);
        if (!category || category.items.length > 0 || (category.combos || []).length > 0) {
            addToast({ message: "Apenas categorias vazias podem ser excluídas.", type: 'error' });
            return;
        }
        if (!restaurantId) return;

        const confirmed = await confirm({
            title: 'Excluir Categoria',
            message: `Tem certeza que deseja excluir a categoria "${categoryName}"?`,
            confirmText: 'Excluir',
            isDestructive: true,
        });
        if (confirmed) {
            try {
                await deleteCategory(restaurantId, categoryName);
                await loadData();
            } catch (error) {
                addToast({ message: `Erro ao excluir: ${getErrorMessage(error)}`, type: 'error' });
            }
        }
    };
    const handleReorderCategory = async (index: number, direction: 'up' | 'down') => {
        const newOrder = [...menuCategories];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newOrder.length) return;
        [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]; // Swap
        setMenuCategories(newOrder); // Optimistic update
        try {
            if (!restaurantId) return;
            await updateCategoryOrder(restaurantId, newOrder);
        } catch (error) {
            addToast({ message: 'Erro ao reordenar. A lista será atualizada.', type: 'error' });
            loadData(); // Revert on failure
        }
    };


    if (isLoading) return <Spinner message="Carregando cardápio..." />;
    if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;

    const isPromoActiveToday = (promo: Promotion) => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const startDate = new Date(promo.startDate);
        startDate.setHours(0,0,0,0);
        const endDate = new Date(promo.endDate);
        endDate.setHours(23,59,59,999);
        return now >= startDate && now <= endDate;
    }

    const isCouponActive = (coupon: Coupon) => {
        const now = new Date();
        const expirationDate = new Date(coupon.expirationDate);
        expirationDate.setHours(23, 59, 59, 999);
        return coupon.isActive && now <= expirationDate;
    };

    return (
        <main className="p-4 space-y-8">
            {onBack && (
                <div className="flex items-center space-x-2 mb-4">
                    <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">Gerenciar Cardápio do Restaurante</h2>
                </div>
            )}

            {/* --- PROMOTIONS --- */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Promoções de Itens</h2>
                    <button onClick={() => handleOpenPromoModal()} className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 w-full sm:w-auto">
                        Criar Promoção
                    </button>
                </div>
                 {promotions.length > 0 ? (
                    <div className="space-y-3">
                        {promotions.map(promo => (
                            <div key={promo.id} className="bg-gray-50 p-3 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                <div>
                                    <div className="flex items-center gap-3">
                                        {isPromoActiveToday(promo) && <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">ATIVA HOJE</span>}
                                        <h4 className="font-bold text-gray-900">{promo.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">
                                        {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                                    <button onClick={() => handleOpenPromoModal(promo)} className="p-2 text-gray-500 hover:text-blue-600"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-10 bg-gray-100 rounded-lg"><p className="text-gray-500">Nenhuma promoção de item cadastrada.</p></div>
                 )}
            </div>

            {/* --- COUPONS --- */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Cupons de Desconto</h2>
                    <button onClick={() => handleOpenCouponModal()} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 w-full sm:w-auto">
                        Criar Cupom
                    </button>
                </div>
                 {coupons.length > 0 ? (
                    <div className="space-y-3">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="bg-gray-50 p-4 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${isCouponActive(coupon) ? 'bg-green-500' : 'bg-gray-500'}`}>{isCouponActive(coupon) ? 'ATIVO' : 'INATIVO'}</span>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-bold text-gray-900 font-mono tracking-wider">{coupon.code}</h4>
                                            <button onClick={() => handleCopyCode(coupon.code)} className="p-1 text-gray-400 hover:text-blue-600" title="Copiar código">
                                                <ClipboardIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600">{coupon.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `R$ ${coupon.discountValue.toFixed(2)} OFF`}
                                        {coupon.minOrderValue && ` | Pedido Mínimo: R$ ${coupon.minOrderValue.toFixed(2)}`}
                                        | Expira em: {new Date(coupon.expirationDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                                    <button onClick={() => handleOpenCouponModal(coupon)} className="p-2 text-gray-500 hover:text-blue-600" title="Editar Cupom"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-gray-500 hover:text-red-600" title="Excluir Cupom"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-10 bg-gray-100 rounded-lg"><p className="text-gray-500">Nenhum cupom cadastrado.</p></div>
                 )}
            </div>

            {/* --- ADDONS --- */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Banco de Adicionais</h2>
                    <button onClick={() => handleOpenAddonModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-auto">
                        Criar Adicional
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Crie aqui os ingredientes extras (ex: Bacon, Ovo, Queijo) que poderão ser adicionados aos seus lanches e pizzas. Depois, edite cada item para selecionar quais adicionais ele aceita.
                </p>
                {addons.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {addons.map(addon => (
                            <div key={addon.id} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-900">{addon.name}</h4>
                                    <p className="text-sm text-gray-600">R$ {addon.price.toFixed(2)}</p>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => handleOpenAddonModal(addon)} className="p-1.5 text-gray-500 hover:text-blue-600"><EditIcon className="w-4 h-4"/></button>
                                    <button onClick={() => handleDeleteAddon(addon.id)} className="p-1.5 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-100 rounded-lg"><p className="text-gray-500">Nenhum adicional cadastrado.</p></div>
                )}
            </div>

            {/* --- COMBOS --- */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Combos</h2>
                    {/* The button was moved to the top of the menu items section for better accessibility */}
                </div>
                {allCombos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allCombos.map(combo => (
                            <div key={combo.id} className="bg-gray-50 p-4 rounded-lg border">
                                <img src={combo.imageUrl} alt={combo.name} className="w-full h-32 object-cover rounded-md mb-3" loading="lazy" />
                                <h3 className="font-bold text-lg">{combo.name}</h3>
                                <div className="text-xs text-gray-600 border-t pt-2 mt-2">
                                    <div className="space-y-2 mt-1">
                                        {combo.menuItemIds.map(id => allMenuItems.find(item => item.id === id)).filter(Boolean).map(item => (
                                            <div key={item!.id} className="flex items-center space-x-2">
                                                <img src={item!.imageUrl} alt={item!.name} className="w-6 h-6 rounded-full object-cover" loading="lazy"/>
                                                <span className="text-gray-700">{item!.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button onClick={() => handleOpenComboModal(combo)} className="p-2 text-gray-500 hover:text-blue-600"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteCombo(combo.id)} className="p-2 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-100 rounded-lg"><p className="text-gray-500">Nenhum combo cadastrado.</p></div>
                )}
            </div>

            {/* --- MENU ITEMS & CATEGORIES --- */}
            <div>
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Itens do Cardápio</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => handleOpenItemModal(null)} disabled={menuCategories.length === 0} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-auto disabled:bg-blue-400 disabled:cursor-not-allowed">
                            Criar Item
                        </button>
                        <button onClick={() => handleOpenComboModal(null)} disabled={menuCategories.flatMap(c => c.items).length === 0} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 w-full sm:w-auto disabled:bg-yellow-300 disabled:cursor-not-allowed">
                            Criar Combo
                        </button>
                        <button onClick={handleCreateCategory} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 w-full sm:w-auto">
                            Criar Categoria
                        </button>
                    </div>
                </div>

                {menuCategories.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-10 text-center border-2 border-dashed border-gray-300">
                        <div className="text-gray-400 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Seu cardápio está vazio</h3>
                        <p className="text-gray-600 mb-6">Para adicionar itens (como pizzas, lanches ou bebidas), você precisa criar uma categoria primeiro.</p>
                        <button 
                            onClick={handleCreateCategory}
                            className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 shadow-lg animate-pulse"
                        >
                            + Criar Primeira Categoria
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {menuCategories.map((category, index) => (
                            <div key={category.id} className="bg-white rounded-lg shadow-md">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-t-lg border-b">
                                    <div className="flex items-center gap-2 flex-grow">
                                        <div className="flex flex-col">
                                            <button onClick={() => handleReorderCategory(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-gray-500 hover:text-black"><ChevronUpIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleReorderCategory(index, 'down')} disabled={index === menuCategories.length - 1} className="disabled:opacity-20 text-gray-500 hover:text-black"><ChevronDownIcon className="w-5 h-5"/></button>
                                        </div>
                                        {editingCategory?.id === category.id ? (
                                            <div className="flex flex-col w-full max-w-sm gap-2">
                                                <input 
                                                    type="text" 
                                                    value={editingCategory.newName} 
                                                    onChange={(e) => setEditingCategory({...editingCategory, newName: e.target.value})}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCategoryChanges()}
                                                    autoFocus
                                                    className="text-xl font-bold p-1 border rounded-md"
                                                    placeholder="Nome da Categoria"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={editingCategory.newIconUrl || ''} 
                                                    onChange={(e) => setEditingCategory({...editingCategory, newIconUrl: e.target.value})}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCategoryChanges()}
                                                    className="text-sm p-1 border rounded-md"
                                                    placeholder="URL do Ícone (Opcional)"
                                                />
                                            </div>
                                        ) : (
                                            <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                                                {category.iconUrl && <img src={category.iconUrl} alt={category.name} className="w-6 h-6 object-contain" />}
                                                {category.name}
                                            </h3>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {editingCategory?.id === category.id ? (
                                            <>
                                                <button onClick={handleSaveCategoryChanges} className="p-2 text-green-600 hover:text-green-800"><CheckIcon className="w-5 h-5"/></button>
                                                <button onClick={() => setEditingCategory(null)} className="p-2 text-red-600 hover:text-red-800"><XIcon className="w-5 h-5"/></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEditCategory(category)} className="p-2 text-gray-500 hover:text-blue-600"><EditIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteCategory(category.name)} disabled={category.items.length > 0 || (category.combos || []).length > 0} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed" title={category.items.length > 0 ? "Esvazie a categoria para excluí-la" : "Excluir categoria"}><TrashIcon className="w-5 h-5"/></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    {category.items.length > 0 ? (
                                        <table className="w-full text-sm text-left text-gray-600">
                                            <tbody>
                                                {category.items.map(item => (
                                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-4">
                                                            <div className="font-semibold text-gray-900">{item.name}</div>
                                                            <div className="text-xs text-gray-500">{item.description}</div>
                                                        </td>
                                                        <td className="p-4 font-semibold text-right">R$ {item.price.toFixed(2)}</td>
                                                        <td className="p-4">
                                                            <div className="flex justify-end space-x-2">
                                                                <button onClick={() => handleOpenItemModal(item, category.name)} className="p-2 text-gray-500 hover:text-blue-600"><EditIcon className="w-5 h-5"/></button>
                                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-center py-6 text-gray-500 text-sm">Esta categoria está vazia.</p>
                                    )}
                                </div>
                                <div className="p-2 bg-gray-50 rounded-b-lg">
                                    <button onClick={() => handleOpenItemModal(null, category.name)} className="w-full text-center text-sm font-semibold text-blue-600 hover:bg-blue-100 p-2 rounded-md">
                                        + Adicionar Item a esta Categoria
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isComboModalOpen && <ComboEditorModal isOpen={isComboModalOpen} onClose={() => setIsComboModalOpen(false)} onSave={handleSaveCombo} existingCombo={editingCombo} menuItems={allMenuItems} />}
            {isItemModalOpen && restaurantId && <MenuItemEditorModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} onSave={handleSaveItem} existingItem={editingItem?.item} initialCategory={editingItem?.categoryName} restaurantCategories={menuCategories.map(c => c.name)} allAddons={addons} restaurantId={restaurantId} />}
            {isPromoModalOpen && <PromotionEditorModal isOpen={isPromoModalOpen} onClose={() => setIsPromoModalOpen(false)} onSave={handleSavePromo} existingPromotion={editingPromo} menuItems={allMenuItems} combos={allCombos} categories={menuCategories.map(c => c.name)}/>}
            {isCouponModalOpen && <CouponEditorModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} onSave={handleSaveCoupon} existingCoupon={editingCoupon} />}
            {isAddonModalOpen && <AddonEditorModal isOpen={isAddonModalOpen} onClose={() => setIsAddonModalOpen(false)} onSave={handleSaveAddon} existingAddon={editingAddon} />}
        </main>
    );
};

export default MenuManagement;
