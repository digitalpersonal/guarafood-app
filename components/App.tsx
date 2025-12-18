import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, MenuCategory, MenuItem, Combo, Addon, Promotion } from '../types';
import { fetchRestaurants, fetchMenuForRestaurant, fetchAddonsForRestaurant } from '../services/databaseService';
import { AuthProvider, useAuth } from '../services/authService';
import { getInitializationError, getErrorMessage } from '../services/api';
import { isRestaurantOpen } from '../utils/restaurantUtils';

import RestaurantCard from './RestaurantCard';
import Spinner from './Spinner';
import MenuItemCard from './MenuItemCard';
import ComboCard from './ComboCard';
import Cart from './Cart';
import LoginScreen from './LoginScreen';
import AdminDashboard from './AdminDashboard';
import OrderManagement from './OrderManagement';
import CouponDisplay from './CouponDisplay';
import HomePromotionalBanner from './HomePromotionalBanner';
import { CartProvider } from '../hooks/useCart';
import { AnimationProvider } from '../hooks/useAnimation';
import { NotificationProvider } from '../hooks/useNotification';
import OptimizedImage from './OptimizedImage';
import OrderTracker from './OrderTracker';
import CustomerOrders from './CustomerOrders';
import HeaderGlobal from './HeaderGlobal';
import Footer from './Footer';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const FunnelIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
);

const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001z" />
    </svg>
);

const categoryIcons: Record<string, string> = {
    'Lanches': '🍔',
    'Pizza': '🍕',
    'Açaí': '🍧',
    'Japonesa': '🍣',
    'Brasileira': '🍛',
    'Doces': '🍰',
    'Bebidas': '🥤',
    'Saudável': '🥗',
    'Italiana': '🍝',
    'Marmita': '🍱',
    'Supermercado': '🛒',
    'Todos': '✨',
    'Favoritos': '❤️'
};

const slugify = (text: string) => `category-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;

const RestaurantMenu: React.FC<{ restaurant: Restaurant, onBack: () => void }> = ({ restaurant, onBack }) => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [marmitas, setMarmitas] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [allPizzas, setAllPizzas] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    useEffect(() => {
        const loadMenu = async () => {
            try {
                setIsLoading(true);
                const [menuData, addonsData] = await Promise.all([
                    fetchMenuForRestaurant(restaurant.id, true), 
                    fetchAddonsForRestaurant(restaurant.id),
                ]);

                const now = new Date();
                const isLunchTime = now.getHours() < 15 || (now.getHours() === 15 && now.getMinutes() <= 30);

                const allItems = menuData.flatMap(c => c.items);
                setMarmitas(isLunchTime ? allItems.filter(item => item.isMarmita) : []);
                setAllPizzas(allItems.filter(item => item.isPizza));
                
                const filteredMenu = menuData.map(cat => ({
                    ...cat,
                    items: cat.items.filter(item => !item.isDailySpecial && !item.isWeeklySpecial && !item.isMarmita)
                })).filter(cat => cat.items.length > 0 || (cat.combos && cat.combos.length > 0));

                setMenu(filteredMenu);
                setAddons(addonsData);
                if (filteredMenu.length > 0) setActiveCategory(slugify(filteredMenu[0].name));
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadMenu();
    }, [restaurant]);

    const handleNavClick = (categoryName: string) => {
        const id = slugify(categoryName);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="w-full">
            <div className="relative h-40 sm:h-52 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl p-1 flex-shrink-0 overflow-hidden">
                         <OptimizedImage src={restaurant.imageUrl} alt={restaurant.name} priority={true} className="w-full h-full rounded-full" objectFit="contain" />
                    </div>
                </div>
                <button onClick={onBack} className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-full p-2 shadow-md z-20">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                </button>
            </div>

            <div className="p-4 bg-white rounded-t-2xl -mt-4 relative z-20 text-center border-b shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-gray-600 mt-1 text-sm font-medium uppercase tracking-wide">{restaurant.category}</p>
            </div>
            
            {!isLoading && marmitas.length > 0 && (
                 <div className="bg-gradient-to-r from-orange-100 to-yellow-50 p-4 border-b-4 border-orange-200">
                    <h2 className="text-xl font-black text-orange-800 uppercase mb-4">Hora do Almoço</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {marmitas.map(item => <MenuItemCard key={`marmita-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} />)}
                    </div>
                </div>
            )}

            {!isLoading && menu.length > 0 && (
                <div className="sticky top-[64px] z-40 bg-white shadow-md border-b border-gray-100">
                    <div className="flex space-x-3 overflow-x-auto p-3 no-scrollbar">
                        {menu.map((category) => (
                            <button key={category.name} onClick={() => handleNavClick(category.name)} className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${activeCategory === slugify(category.name) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4">
                {isLoading ? <Spinner /> : (
                    <div className="space-y-8">
                        {menu.map((category) => (
                            <div key={category.name} id={slugify(category.name)} className="scroll-mt-44 rounded-lg">
                                <h2 className="text-2xl font-bold mb-4">{category.name}</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {category.combos?.map(combo => <ComboCard key={`combo-${combo.id}`} combo={combo} menuItems={menu.flatMap(c => c.items)} />)}
                                    {category.items.map(item => <MenuItemCard key={item.id} item={item} allPizzas={allPizzas} allAddons={addons} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const CustomerView: React.FC<{ selectedRestaurant: Restaurant | null; onSelectRestaurant: (r: Restaurant | null) => void }> = ({ selectedRestaurant, onSelectRestaurant }) => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Todos']);
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [favorites, setFavorites] = useState<number[]>([]);

    useEffect(() => {
        const savedFavorites = localStorage.getItem('guarafood-favorites');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        const loadInitialData = async () => {
            try {
                const data = await fetchRestaurants();
                setRestaurants(data);
            } catch (err) { console.error(err); } finally { setIsLoading(false); }
        };
        loadInitialData();
    }, []);

    const availableCategories = useMemo(() => {
        const all = restaurants.flatMap(r => r.category ? r.category.split(',').map(c => c.trim()) : []);
        return ['Todos', ...Array.from(new Set(all))];
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(restaurant => {
            const restaurantCats = restaurant.category ? restaurant.category.split(',').map(c => c.trim()) : [];
            const matchesCategory = selectedCategories.includes('Todos') || selectedCategories.some(c => restaurantCats.includes(c));
            const matchesFavorites = !selectedCategories.includes('Favoritos') || favorites.includes(restaurant.id);
            const matchesOpen = !showOpenOnly || isRestaurantOpen(restaurant);
            return matchesCategory && matchesFavorites && matchesOpen;
        });
    }, [restaurants, selectedCategories, favorites, showOpenOnly]);

    const handleCategoryToggle = (category: string) => {
        if (category === 'Todos') { setSelectedCategories(['Todos']); return; }
        setSelectedCategories(prev => {
            const clean = prev.filter(c => c !== 'Todos');
            if (clean.includes(category)) {
                const filtered = clean.filter(c => c !== category);
                return filtered.length === 0 ? ['Todos'] : filtered;
            }
            return [...clean, category];
        });
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;

    if (selectedRestaurant) return (
        <>
            <RestaurantMenu restaurant={selectedRestaurant} onBack={() => onSelectRestaurant(null)} />
            <Cart restaurant={selectedRestaurant} />
        </>
    );

    return (
        <main className="pb-16 bg-white min-h-screen">
            {/* O Banner que você pediu - Agora com fallback garantido */}
            <HomePromotionalBanner onBannerClick={(type, val) => {
                if (type === 'restaurant') {
                    const r = restaurants.find(res => res.name === val);
                    if (r) onSelectRestaurant(r);
                } else { handleCategoryToggle(val); }
            }} />

            {/* Menu de Categorias Visual (Bolhas) */}
            <div className="p-4 overflow-hidden">
                <h2 className="text-lg font-bold text-gray-800 mb-4 ml-1">O que você quer comer hoje?</h2>
                <div className="flex space-x-6 overflow-x-auto pb-4 no-scrollbar">
                    {availableCategories.map(category => {
                        const isSelected = selectedCategories.includes(category);
                        return (
                            <button 
                                key={category} 
                                onClick={() => handleCategoryToggle(category)} 
                                className="flex flex-col items-center space-y-2 min-w-[70px] transition-transform active:scale-95"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md border-2 transition-all ${isSelected ? 'bg-orange-50 border-orange-500' : 'bg-white border-transparent'}`}>
                                    {categoryIcons[category] || '🍽️'}
                                </div>
                                <span className={`text-xs font-bold whitespace-nowrap ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>{category}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chips de Filtro Rápido */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 pb-4 sticky top-[60px] bg-white z-10">
                <button 
                    onClick={() => setShowOpenOnly(!showOpenOnly)} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${showOpenOnly ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <FunnelIcon className="w-3 h-3" /> Abertos agora
                </button>
                <button 
                    onClick={() => handleCategoryToggle('Favoritos')} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${selectedCategories.includes('Favoritos') ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <HeartIcon className="w-3 h-3" /> Favoritos
                </button>
            </div>

            <div className="p-4 pt-6">
                <h2 className="text-xl font-black text-gray-800 mb-6">Escolha o lugar, e faça seu pedido!</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRestaurants.map(restaurant => (
                        <RestaurantCard 
                            key={restaurant.id} 
                            restaurant={restaurant} 
                            onClick={() => onSelectRestaurant(restaurant)} 
                            isOpen={isRestaurantOpen(restaurant)} 
                            isFavorite={favorites.includes(restaurant.id)}
                            onToggleFavorite={(e) => {
                                e.stopPropagation();
                                const newFaves = favorites.includes(restaurant.id) ? favorites.filter(id => id !== restaurant.id) : [...favorites, restaurant.id];
                                setFavorites(newFaves);
                                localStorage.setItem('guarafood-favorites', JSON.stringify(newFaves));
                            }}
                        />
                    ))}
                </div>
                {filteredRestaurants.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold">Nenhum restaurante encontrado.</p>
                        <button onClick={() => { setSelectedCategories(['Todos']); setShowOpenOnly(false); }} className="mt-4 text-orange-600 font-black underline">Limpar Filtros</button>
                    </div>
                )}
            </div>
            <Cart restaurant={selectedRestaurant} />
        </main>
    );
};

const AppContent: React.FC = () => {
    const [view, setView] = useState<'customer' | 'login' | 'history'>('customer');
    const { currentUser, loading } = useAuth();
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

    const renderContent = () => {
        if (loading) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
        if (currentUser?.role === 'admin') return <AdminDashboard onBack={() => setView('customer')} />;
        if (currentUser?.role === 'merchant') return <OrderManagement onBack={() => setView('customer')} />;
        if (view === 'login') return <LoginScreen onLoginSuccess={() => setView('customer')} onBack={() => setView('customer')} />;
        if (view === 'history') return <CustomerOrders onBack={() => setView('customer')} />;
        return <CustomerView selectedRestaurant={selectedRestaurant} onSelectRestaurant={setSelectedRestaurant} />;
    };

    return (
        <div className="container mx-auto max-w-7xl bg-white min-h-screen flex flex-col shadow-xl">
            <HeaderGlobal onOrdersClick={() => setView('history')} onHomeClick={() => { setView('customer'); setSelectedRestaurant(null); }} />
            <div className="flex-grow relative print-container">{renderContent()}</div>
            <OrderTracker />
            <Footer onLoginClick={() => setView('login')} />
        </div>
    );
};

const App: React.FC = () => {
    const supabaseError = getInitializationError();
    if (supabaseError) return <div className="h-screen flex items-center justify-center p-4 text-center">Erro crítico de configuração do banco de dados.</div>;
    return (
        <NotificationProvider>
            <AnimationProvider>
                <CartProvider>
                    <AuthProvider><AppContent /></AuthProvider>
                </CartProvider>
            </AnimationProvider>
        </NotificationProvider>
    );
};

export default App;