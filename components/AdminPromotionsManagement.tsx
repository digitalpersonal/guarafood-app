import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Promotion, Restaurant, MenuItem, Combo, MenuCategory } from '../types';
import { 
    fetchRestaurantsSecure,
    fetchPromotionsForRestaurant,
    createPromotion,
    updatePromotion,
    deletePromotion,
    fetchMenuForRestaurant
} from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import { getErrorMessage } from '../services/api';
import PromotionEditorModal from './PromotionEditorModal';
import Spinner from './Spinner';
import { formatPromoDays } from '../utils/promoUtils';

interface AdminPromotionsManagementProps {
    initialRestaurantId?: number | null;
}

export const AdminPromotionsManagement: React.FC<AdminPromotionsManagementProps> = ({ 
    initialRestaurantId = null 
}) => {
    const { addToast, confirm } = useNotification();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | 'ALL'>(initialRestaurantId || 'ALL');
    const [promotionsMap, setPromotionsMap] = useState<Record<number, Promotion[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE_TODAY' | 'UPSELL' | 'DISCOUNT'>('ALL');

    // State for modal
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [targetRestaurantForModal, setTargetRestaurantForModal] = useState<number | null>(null);
    const [modalMenuItems, setModalMenuItems] = useState<MenuItem[]>([]);
    const [modalCombos, setModalCombos] = useState<Combo[]>([]);
    const [modalCategories, setModalCategories] = useState<MenuCategory[]>([]);
    const [isLoadingModalData, setIsLoadingModalData] = useState(false);

    // Load all restaurants
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const rests = await fetchRestaurantsSecure();
            setRestaurants(rests);

            // Fetch promotions for all restaurants
            const map: Record<number, Promotion[]> = {};
            await Promise.all(
                rests.map(async (r) => {
                    try {
                        const promos = await fetchPromotionsForRestaurant(r.id);
                        map[r.id] = promos;
                    } catch (err) {
                        console.warn(`Erro ao buscar promoções do restaurante ${r.id}:`, err);
                        map[r.id] = [];
                    }
                })
            );
            setPromotionsMap(map);
        } catch (error) {
            console.error('Falha ao carregar promoções no painel do administrador:', error);
            addToast({ message: `Erro ao carregar dados: ${getErrorMessage(error)}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (initialRestaurantId) {
            setSelectedRestaurantId(initialRestaurantId);
        }
    }, [initialRestaurantId]);

    // Check if promotion is active today
    const isPromoActiveToday = (promo: Promotion) => {
        const now = new Date();
        const todayDay = now.getDay();
        now.setHours(0, 0, 0, 0);

        const start = new Date(promo.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(promo.endDate);
        end.setHours(23, 59, 59, 999);

        const inDate = now >= start && now <= end;
        if (!inDate) return false;

        if (promo.availableDays && promo.availableDays.length > 0) {
            return promo.availableDays.includes(todayDay);
        }
        return true;
    };

    // Flatten promotions for display
    const displayedPromotions = useMemo(() => {
        const list: { promo: Promotion; restaurant: Restaurant }[] = [];

        restaurants.forEach(rest => {
            if (selectedRestaurantId !== 'ALL' && rest.id !== selectedRestaurantId) {
                return;
            }
            const promos = promotionsMap[rest.id] || [];
            promos.forEach(p => {
                list.push({ promo: p, restaurant: rest });
            });
        });

        return list.filter(({ promo, restaurant }) => {
            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = promo.name.toLowerCase().includes(term);
                const matchDesc = promo.description?.toLowerCase().includes(term);
                const matchRest = restaurant.name.toLowerCase().includes(term);
                const matchUpsell = promo.upsellTitle?.toLowerCase().includes(term);
                if (!matchName && !matchDesc && !matchRest && !matchUpsell) {
                    return false;
                }
            }

            // Type / Status filter
            if (filterType === 'ACTIVE_TODAY' && !isPromoActiveToday(promo)) {
                return false;
            }
            if (filterType === 'UPSELL' && promo.discountType !== 'UPSELL') {
                return false;
            }
            if (filterType === 'DISCOUNT' && promo.discountType === 'UPSELL') {
                return false;
            }

            return true;
        });
    }, [restaurants, promotionsMap, selectedRestaurantId, searchTerm, filterType]);

    // Total statistics
    const stats = useMemo(() => {
        let total = 0;
        let activeToday = 0;
        let upsellCount = 0;
        const participatingRests = new Set<number>();

        Object.entries(promotionsMap).forEach(([rIdStr, promosList]) => {
            const promos = (promosList || []) as Promotion[];
            if (promos.length > 0) {
                participatingRests.add(Number(rIdStr));
            }
            promos.forEach(p => {
                total++;
                if (isPromoActiveToday(p)) activeToday++;
                if (p.discountType === 'UPSELL') upsellCount++;
            });
        });

        return {
            total,
            activeToday,
            upsellCount,
            participatingRestaurants: participatingRests.size
        };
    }, [promotionsMap]);

    // Handle Open Promotion Modal
    const handleOpenPromoModal = async (promo: Promotion | null, restId?: number) => {
        const targetRestId = restId || (selectedRestaurantId !== 'ALL' ? selectedRestaurantId : (restaurants[0]?.id || null));
        if (!targetRestId) {
            addToast({ message: 'Nenhum restaurante disponível para criar promoção.', type: 'warning' });
            return;
        }

        setTargetRestaurantForModal(targetRestId);
        setEditingPromo(promo);
        setIsLoadingModalData(true);

        try {
            // Fetch categories and items for the targeted restaurant
            const menuCats = await fetchMenuForRestaurant(targetRestId, true);
            const items = menuCats.flatMap(c => c.items || []);
            const combos = menuCats.flatMap(c => c.combos || []);

            setModalCategories(menuCats);
            setModalMenuItems(items);
            setModalCombos(combos);
            setIsPromoModalOpen(true);
        } catch (err) {
            console.error('Erro ao buscar dados do cardápio do restaurante para a promoção:', err);
            addToast({ message: `Erro ao carregar cardápio: ${getErrorMessage(err)}`, type: 'error' });
        } finally {
            setIsLoadingModalData(false);
        }
    };

    // Save Promotion
    const handleSavePromo = async (promoData: Omit<Promotion, 'id' | 'restaurantId'>) => {
        if (!targetRestaurantForModal) return;
        try {
            if (editingPromo) {
                await updatePromotion(targetRestaurantForModal, editingPromo.id, promoData);
                addToast({ message: 'Promoção atualizada com sucesso!', type: 'success' });
            } else {
                await createPromotion(targetRestaurantForModal, promoData);
                addToast({ message: 'Promoção criada com sucesso!', type: 'success' });
            }

            // Refresh promotions for this restaurant
            const updated = await fetchPromotionsForRestaurant(targetRestaurantForModal);
            setPromotionsMap(prev => ({ ...prev, [targetRestaurantForModal]: updated }));
            setIsPromoModalOpen(false);
            setEditingPromo(null);
        } catch (error) {
            console.error('Erro ao salvar promoção:', error);
            addToast({ message: `Erro ao salvar promoção: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    // Delete Promotion
    const handleDeletePromo = async (restaurantId: number, promoId: number, promoName: string) => {
        const confirmed = await confirm({
            title: 'Excluir Promoção',
            message: `Tem certeza que deseja excluir a promoção "${promoName}"?`,
            confirmText: 'Excluir Promoção',
            isDestructive: true
        });

        if (!confirmed) return;

        try {
            await deletePromotion(restaurantId, promoId);
            addToast({ message: 'Promoção excluída com sucesso.', type: 'info' });
            const updated = await fetchPromotionsForRestaurant(restaurantId);
            setPromotionsMap(prev => ({ ...prev, [restaurantId]: updated }));
        } catch (error) {
            console.error('Erro ao excluir promoção:', error);
            addToast({ message: `Erro ao excluir: ${getErrorMessage(error)}`, type: 'error' });
        }
    };

    if (isLoading) {
        return <Spinner message="Carregando promoções dos restaurantes..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🎁</span>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
                                Promoções e Campanhas de Venda
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Crie e gerencie ofertas com <strong>Compre e Leve por +R$</strong>, descontos percentuais, horários específicos e dias da semana.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handleOpenPromoModal(null)}
                            disabled={isLoadingModalData}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <span>🎁</span>
                            <span>Criar Nova Promoção</span>
                        </button>
                    </div>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-black text-orange-900 uppercase block">Total de Promoções</span>
                        <span className="text-xl font-black text-orange-700">{stats.total}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-black text-emerald-900 uppercase block">Ativas Hoje</span>
                        <span className="text-xl font-black text-emerald-700">{stats.activeToday}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-black text-amber-900 uppercase block">Compre e Leve (+R$)</span>
                        <span className="text-xl font-black text-amber-700">{stats.upsellCount}</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-black text-blue-900 uppercase block">Lojas com Ofertas</span>
                        <span className="text-xl font-black text-blue-700">{stats.participatingRestaurants}</span>
                    </div>
                </div>

                {/* Filter and Restaurant Selector Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Restaurante:</span>
                            <select
                                value={selectedRestaurantId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedRestaurantId(val === 'ALL' ? 'ALL' : Number(val));
                                }}
                                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="ALL">🌟 Todos os Restaurantes ({restaurants.length})</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} ({promotionsMap[r.id]?.length || 0} promoções)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Chips */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'ALL' 
                                        ? 'bg-orange-600 text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Todas
                            </button>
                            <button
                                onClick={() => setFilterType('ACTIVE_TODAY')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'ACTIVE_TODAY' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                🔥 Ativas Hoje
                            </button>
                            <button
                                onClick={() => setFilterType('UPSELL')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'UPSELL' 
                                        ? 'bg-amber-600 text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                🎁 Compre e Leve (+R$)
                            </button>
                            <button
                                onClick={() => setFilterType('DISCOUNT')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    filterType === 'DISCOUNT' 
                                        ? 'bg-purple-600 text-white shadow-xs' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                % / R$ Desconto
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar promoção ou loja..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* List of Promotions */}
            {displayedPromotions.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <span className="text-4xl block">🎁</span>
                    <h3 className="text-lg font-black text-gray-800">
                        Nenhuma promoção encontrada
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        {searchTerm 
                            ? 'Nenhum resultado corresponde à sua pesquisa. Tente limpar os filtros.' 
                            : 'Você pode criar promoções como Compre e Leve (ex: Pizza Broto por +R$ 14,99 nos fins de semana) ou descontos em categorias específicas.'}
                    </p>
                    <button
                        onClick={() => handleOpenPromoModal(null)}
                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md inline-flex items-center gap-2"
                    >
                        <span>➕</span>
                        <span>Criar Nova Promoção Agora</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedPromotions.map(({ promo, restaurant }) => {
                        const activeToday = isPromoActiveToday(promo);
                        const isUpsell = promo.discountType === 'UPSELL';

                        return (
                            <div 
                                key={`${restaurant.id}-${promo.id}`} 
                                className="bg-white rounded-2xl border-2 border-gray-100 hover:border-orange-200 transition-all p-5 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative group"
                            >
                                <div className="space-y-3">
                                    {/* Top Bar with Restaurant & Status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                <span>🏬</span>
                                                <span className="truncate max-w-[150px]">{restaurant.name}</span>
                                            </span>

                                            {activeToday ? (
                                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                    ATIVA HOJE
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                    FORA DO HORÁRIO / DIA
                                                </span>
                                            )}

                                            {isUpsell ? (
                                                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                                                    🎁 COMPRE E LEVE POR +R$
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                                                    {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `R$ ${promo.discountValue} OFF`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleOpenPromoModal(promo, restaurant.id)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                title="Editar Promoção"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeletePromo(restaurant.id, promo.id, promo.name)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                title="Excluir Promoção"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Promotion Title & Description */}
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 leading-snug">
                                            {promo.name}
                                        </h3>
                                        {promo.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                {promo.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Upsell Special Box */}
                                    {isUpsell && (
                                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-amber-900 uppercase">
                                                    Item Adicional Ofertado:
                                                </span>
                                                <span className="text-xs font-black text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                                                    + R$ {Number(promo.upsellPrice || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-800">
                                                {promo.upsellTitle || 'Oferta Especial'}
                                            </p>
                                            {promo.upsellOptions && promo.upsellOptions.length > 0 && (
                                                <div className="text-[11px] text-gray-600 flex items-center gap-1 flex-wrap pt-0.5">
                                                    <span className="font-bold text-gray-500">Opções/Sabores:</span>
                                                    {promo.upsellOptions.map((opt, oIdx) => (
                                                        <span key={oIdx} className="bg-white border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-700">
                                                            {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Details Grid: Days, Times, Dates */}
                                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-gray-500">
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase">Dias Válidos:</span>
                                            <span className="font-bold text-gray-700">
                                                {formatPromoDays(promo.availableDays)}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase">Horário:</span>
                                            <span className="font-bold text-gray-700">
                                                {promo.availableStartTime && promo.availableEndTime 
                                                    ? `${promo.availableStartTime} às ${promo.availableEndTime}` 
                                                    : 'O dia todo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Validity dates */}
                                <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between text-[10px] text-gray-400">
                                    <span>
                                        📅 {new Date(promo.startDate).toLocaleDateString('pt-BR')} até {new Date(promo.endDate).toLocaleDateString('pt-BR')}
                                    </span>
                                    <button
                                        onClick={() => handleOpenPromoModal(promo, restaurant.id)}
                                        className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                                    >
                                        Gerenciar Oferta →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Promotion Editor Modal */}
            {isPromoModalOpen && targetRestaurantForModal && (
                <PromotionEditorModal
                    isOpen={isPromoModalOpen}
                    onClose={() => {
                        setIsPromoModalOpen(false);
                        setEditingPromo(null);
                    }}
                    onSave={handleSavePromo}
                    existingPromotion={editingPromo}
                    menuItems={modalMenuItems}
                    combos={modalCombos}
                    categories={modalCategories}
                />
            )}
        </div>
    );
};

export default AdminPromotionsManagement;
