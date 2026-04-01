

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, MenuCategory, MenuItem, Combo, Addon, Promotion } from './types';
import { fetchRestaurants, fetchMenuForRestaurant, fetchAddonsForRestaurant, fetchRestaurantById } from './services/databaseService';
import { AuthProvider, useAuth } from './services/authService';
import { forceSystemUpdate } from './utils/systemUpdate';
import { getInitializationError, getErrorMessage } from './services/api';
import { isRestaurantOpen, shuffleRestaurants } from './utils/restaurantUtils';

import RestaurantCard from './components/RestaurantCard';
import Spinner from './components/Spinner';
import MenuItemCard from './components/MenuItemCard';
import ComboCard from './components/ComboCard';
import Cart from './components/Cart';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import OrderManagement from './components/OrderManagement';
import HomePromotionalBanner from './components/HomePromotionalBanner';
import { CartProvider } from './hooks/useCart';
import { AnimationProvider } from './hooks/useAnimation';
import { NotificationProvider } from './hooks/useNotification';
import OptimizedImage from './components/OptimizedImage';
import OrderTracker from './components/OrderTracker';
import BottomBannerCarousel from './components/BottomBannerCarousel';
import CustomerOrders from './components/CustomerOrders';
import HelpCenter from './components/HelpCenter';
import HeaderGlobal from './components/HeaderGlobal';
import Footer from './components/Footer';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const FunnelIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
);

const categoryIcons: Record<string, React.ReactNode> = {
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
    'Todos': '✨'
};

const slugify = (text: string) => `category-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;

const categoryBackgrounds: Record<string, string> = {
    'Lanches': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=1000&auto=format&fit=crop',
    'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop',
    'Açaí': 'https://images.unsplash.com/photo-1590301157890-4810ed352733?q=80&w=1000&auto=format&fit=crop',
    'Japonesa': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000&auto=format&fit=crop',
    'Sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000&auto=format&fit=crop',
    'Brasileira': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1000&auto=format&fit=crop',
    'Doces': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=1000&auto=format&fit=crop',
    'Bebidas': 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?q=80&w=1000&auto=format&fit=crop',
    'Saudável': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop',
    'Italiana': 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=1000&auto=format&fit=crop',
    'Marmita': 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=1000&auto=format&fit=crop',
    'Supermercado': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
    'Hambúrguer': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=1000&auto=format&fit=crop',
    'Churrasco': 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop',
    'Sorvetes': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?q=80&w=1000&auto=format&fit=crop',
};

const RestaurantMenu: React.FC<{ restaurant: Restaurant, onBack: () => void }> = ({ restaurant, onBack }) => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [dailySpecials, setDailySpecials] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [allPizzas, setAllPizzas] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [categoryNameMap, setCategoryNameMap] = useState<Map<number, string>>(new Map());

    const bgImage = useMemo(() => {
        if (restaurant.bannerImageUrl) return restaurant.bannerImageUrl;
        
        const cats = restaurant.category ? restaurant.category.split(',').map(c => c.trim()) : [];
        for (const cat of cats) {
            if (categoryBackgrounds[cat]) return categoryBackgrounds[cat];
        }
        return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop'; // Default food bg
    }, [restaurant.category, restaurant.bannerImageUrl]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const loadMenu = async () => {
            try {
                setIsLoading(true);
                const [menuData, addonsData] = await Promise.all([
                    fetchMenuForRestaurant(restaurant.id, true), 
                    fetchAddonsForRestaurant(restaurant.id),
                ]);

                const newCategoryNameMap = new Map<number, string>();
                menuData.forEach(cat => newCategoryNameMap.set(cat.id, cat.name));
                setCategoryNameMap(newCategoryNameMap);

                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                const startTime = restaurant.marmitaStartTime || '10:00';
                const endTime = restaurant.marmitaEndTime || '15:30';
                const isLunchTime = currentTime >= startTime && currentTime <= endTime;

                const allItems = menuData.flatMap(c => c.items);
                
                // Destaques (Featured items) aparecem sempre no topo
                const featuredItems = allItems.filter(item => item.isDailySpecial);
                setDailySpecials(featuredItems);
                setAllPizzas(allItems.filter(item => item.isPizza));
                
                const filteredMenu = menuData.map(cat => ({
                    ...cat,
                    items: cat.items.filter(item => {
                        // Se for marmita e não for horário de almoço, não exibe
                        if (item.isMarmita && !isLunchTime) return false;
                        
                        // Não exibe os destaques nas categorias normais para evitar duplicidade
                        if (item.isDailySpecial) return false;
                        
                        return true;
                    })
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
            <div className="relative h-40 sm:h-52 overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    <img 
                        src={bgImage} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl p-1 flex-shrink-0 overflow-hidden border-4 border-white/20">
                         <OptimizedImage src={restaurant.imageUrl} alt={restaurant.name} priority={true} className="w-full h-full rounded-full" objectFit="contain" />
                    </div>
                </div>
                <button onClick={onBack} className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-full p-2 shadow-md z-20 hover:scale-105 active:scale-95 transition-transform">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                </button>
            </div>

            <div className="p-4 bg-white rounded-t-2xl -mt-4 relative z-20 text-center border-b shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-gray-600 mt-1 text-sm font-medium uppercase tracking-wide">{restaurant.category}</p>
            </div>
            
            {dailySpecials.length > 0 && (
                 <div className="p-4 bg-yellow-50 border-b-4 border-yellow-200">
                    <h2 className="text-xl font-black text-yellow-800 uppercase mb-4">Destaques do Dia</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {dailySpecials.map(item => {
                            const categoryName = item.categoryId ? categoryNameMap.get(item.categoryId) : undefined;
                            return <MenuItemCard key={`destaque-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} categoryName={categoryName} />
                        })}
                    </div>
                 </div>
            )}

            {!isLoading && menu.length > 0 && (
                <div className="sticky top-[64px] z-30 bg-white shadow-md border-b border-gray-100">
                    <div className="flex space-x-3 overflow-x-auto p-3 no-scrollbar">
                        {menu.map((category) => (
                            <button key={category.name} onClick={() => handleNavClick(category.name)} className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${activeCategory === slugify(category.name) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <h1 className="text-xl font-black text-gray-400 animate-pulse">Carregando cardápio...</h1>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {menu.map((category) => (
                            <div key={category.name} id={slugify(category.name)} className="scroll-mt-44 rounded-lg">
                                <h2 className="text-2xl font-bold mb-4">{category.name}</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {category.combos?.map(combo => <ComboCard key={`combo-${combo.id}`} combo={combo} menuItems={menu.flatMap(c => c.items)} />)}
                                    {category.items.map(item => <MenuItemCard key={item.id} item={item} allPizzas={allPizzas} allAddons={addons} categoryName={category.name} />)}
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
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Todos']);
    const [showOpenOnly, setShowOpenOnly] = useState(false);

    const loadInitialData = async () => {
        setIsLoading(true);
        setError(null);
        setDebugInfo("");
        try {
            console.log("CustomerView: Loading restaurants...");
            const data = await fetchRestaurants();
            console.log("CustomerView: Restaurants loaded:", data.length);
            
            if (data.length === 0) {
                console.warn("CustomerView: No restaurants returned from DB");
                setDebugInfo("O banco de dados retornou 0 registros.");
            }
            
            // Randomize the restaurants list for the home screen
            setRestaurants(shuffleRestaurants(data));
        } catch (err: any) { 
            console.error("CustomerView: Error loading restaurants:", err); 
            setError(err.message || "Erro ao carregar restaurantes. Por favor, tente novamente.");
            setDebugInfo(`Erro: ${err.message || "Desconhecido"}`);
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const availableCategories = useMemo(() => {
        const activeRestaurants = restaurants.filter(r => r.active !== false);
        const all = activeRestaurants.flatMap(r => r.category ? r.category.split(',').map(c => c.trim()) : []);
        return ['Todos', ...Array.from(new Set(all))];
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(restaurant => {
            // CRITICAL: Filter out suspended restaurants for customers
            if (restaurant.active === false) return false;

            const restaurantCats = restaurant.category ? restaurant.category.split(',').map(c => c.trim()) : [];
            const matchesCategory = selectedCategories.includes('Todos') || selectedCategories.some(c => restaurantCats.includes(c));
            const matchesOpen = !showOpenOnly || isRestaurantOpen(restaurant);
            return matchesCategory && matchesOpen;
        });
    }, [restaurants, selectedCategories, showOpenOnly]);

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

    if (error) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
                <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
                <button 
                    onClick={loadInitialData}
                    className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (selectedRestaurant) return (
        <>
            <RestaurantMenu restaurant={selectedRestaurant} onBack={() => onSelectRestaurant(null)} />
            <Cart restaurant={selectedRestaurant} />
        </>
    );

    return (
        <main className="pb-16 bg-white min-h-screen">
            <HomePromotionalBanner onBannerClick={(type, val) => {
                if (type === 'restaurant') {
                    const r = restaurants.find(res => res.name === val && res.active !== false);
                    if (r) onSelectRestaurant(r);
                } else { handleCategoryToggle(val); }
            }} />

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

            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 pb-4 sticky top-[60px] bg-white z-10 shadow-sm">
                <button 
                    onClick={() => setShowOpenOnly(!showOpenOnly)} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${showOpenOnly ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <FunnelIcon className="w-3 h-3" /> Abertos agora
                </button>
            </div>

            <div className="p-4 pt-6">
                <h2 className="text-xl font-black text-gray-800 mb-6">Escolha o lugar e faça seu pedido!</h2>
                
                {restaurants.length === 0 && !isLoading && !error && (
                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-800 text-sm font-bold flex flex-col items-center text-center">
                        <p>Atenção: Não conseguimos carregar nenhum restaurante do banco de dados.</p>
                        <p className="mt-1 text-[10px] opacity-70">Isso pode ser um problema de permissão (RLS) ou o banco está vazio.</p>
                        <button onClick={loadInitialData} className="mt-3 bg-amber-600 text-white px-4 py-1.5 rounded-full text-xs">Tentar Carregar Novamente</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRestaurants.map(restaurant => (
                        <RestaurantCard 
                            key={restaurant.id} 
                            restaurant={restaurant} 
                            onClick={() => onSelectRestaurant(restaurant)} 
                            isOpen={isRestaurantOpen(restaurant)} 
                        />
                    ))}
                </div>
                {filteredRestaurants.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-800 font-black text-xl mb-2">Nenhum restaurante encontrado.</p>
                        <p className="text-gray-500 mb-6 font-medium">Tente mudar os filtros ou recarregar a lista.</p>
                        <div className="flex flex-col gap-3 items-center">
                            <button 
                                onClick={loadInitialData} 
                                className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
                            >
                                Recarregar Lista
                            </button>
                            <button 
                                onClick={() => { setSelectedCategories(['Todos']); setShowOpenOnly(false); }} 
                                className="text-orange-600 font-black underline"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                        {debugInfo && (
                            <p className="mt-8 text-[10px] text-gray-300 font-mono">Debug: {debugInfo}</p>
                        )}
                    </div>
                )}
            </div>
            <Cart restaurant={selectedRestaurant} />
        </main>
    );
};

const AppContent: React.FC = () => {
    const [view, setView] = useState<'customer' | 'login' | 'history' | 'help' | 'admin' | 'merchant'>('customer');
    const { currentUser, loading, logout } = useAuth();
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('/version.json?t=' + Date.now());
                const data = await response.json();
                const currentVersion = data.version;
                const storedVersion = localStorage.getItem('app-version');

                if (storedVersion && storedVersion !== currentVersion) {
                    console.log(`NEW VERSION DETECTED: ${currentVersion}. RELOADING...`);
                    localStorage.setItem('app-version', currentVersion);
                    setIsUpdating(true);
                    setTimeout(() => {
                        forceSystemUpdate();
                    }, 3000);
                } else if (!storedVersion) {
                    localStorage.setItem('app-version', currentVersion);
                }
            } catch (err) {
                console.error('Failed to check version:', err);
            }
        };

        checkVersion();
        
        // Verifica atualizações a cada 15 minutos (900000 ms)
        const intervalId = setInterval(checkVersion, 900000);
        
        // Verifica atualizações sempre que a aba do navegador voltar a ficar ativa
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Handle force logout if needed
        const params = new URLSearchParams(window.location.search);
        if (params.get('forceLogout') === '1') {
            console.log("FORCE LOGOUT TRIGGERED VIA URL");
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = window.location.origin;
        }

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [selectedRestaurant?.id]);

    useEffect(() => {
        if (currentUser?.role === 'admin') setView('admin');
        else if (['merchant', 'waiter', 'manager'].includes(currentUser?.role || '')) setView('merchant');
        else {
            setView('customer');
            if (!currentUser) setSelectedRestaurant(null);
        }
    }, [currentUser]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [selectedRestaurant, view]);

    // Deep Link Logic: Check for restaurant ID in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const restaurantIdParam = params.get('r');
        if (restaurantIdParam) {
            const id = parseInt(restaurantIdParam, 10);
            if (!isNaN(id)) {
                fetchRestaurantById(id).then(res => {
                    // Only show if restaurant is active
                    if (res && res.active !== false) {
                        setSelectedRestaurant(res);
                    }
                }).catch(err => console.error("Deep link fetch error:", err));
            }
        }
    }, []);

    // Remove Splash Screen on mount
    useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, []);

    const renderContent = () => {
        if (loading) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
        if (view === 'admin') return <AdminDashboard onBack={() => setView('customer')} />;
        if (view === 'merchant') return (
            <OrderManagement 
                onViewStore={(r) => {
                    setSelectedRestaurant(r);
                    setView('customer');
                }} 
            />
        );
        if (view === 'login') return <LoginScreen onLoginSuccess={() => setView('customer')} onBack={() => setView('customer')} />;
        if (view === 'history') return <CustomerOrders onBack={() => setView('customer')} />;
        if (view === 'help') return <HelpCenter onBack={() => setView('customer')} />;
        return <CustomerView key={view} selectedRestaurant={selectedRestaurant} onSelectRestaurant={setSelectedRestaurant} />;
    };

    return (
        <>
            {isUpdating && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
                        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Atualizando GuaraFood</h2>
                        <p className="text-gray-600">Estamos preparando as novidades para você. O aplicativo irá reiniciar em instantes...</p>
                    </div>
                </div>
            )}
            <div className="container mx-auto max-w-7xl bg-white min-h-screen flex flex-col shadow-xl overflow-x-hidden pb-[var(--bottom-banner-height,0px)]">
                {view !== 'admin' && view !== 'merchant' && (
                    <HeaderGlobal 
                        onOrdersClick={() => setView('history')} 
                        onHomeClick={() => { setView('customer'); setSelectedRestaurant(null); }} 
                        onDashboardClick={() => {
                            if (currentUser?.role === 'admin') setView('admin');
                            else setView('merchant');
                        }}
                        onLogoutClick={logout}
                        userRole={currentUser?.role}
                    />
                )}
                <div className="flex-grow relative print-container">
                    {/* Version Indicator for Debugging */}
                    <div className="absolute top-0 right-0 p-1 text-[8px] text-gray-300 pointer-events-none z-50">
                        v1.0.4
                    </div>
                    {renderContent()}
                </div>
                {view !== 'admin' && view !== 'merchant' && (
                    <Footer 
                        onLoginClick={() => setView('login')} 
                        onHelpClick={() => setView('help')} 
                        onLogoutClick={logout}
                        userRole={currentUser?.role}
                    />
                )}
            </div>
            <OrderTracker />
            <BottomBannerCarousel isVisible={view === 'customer'} />
        </>
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