import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, MenuCategory, MenuItem, Combo, Addon, Promotion } from './types';
import { fetchRestaurants, fetchMenuForRestaurant, fetchAddonsForRestaurant } from './services/databaseService';
import { AuthProvider, useAuth } from './services/authService';
import { getInitializationError, getErrorMessage } from './services/api';
import { isRestaurantOpen } from './utils/restaurantUtils';

import RestaurantCard from './components/RestaurantCard';
import Spinner from './components/Spinner';
import MenuItemCard from './components/MenuItemCard';
import ComboCard from './components/ComboCard';
import Cart from './components/Cart';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import OrderManagement from './components/OrderManagement';
import CouponDisplay from './components/CouponDisplay';
import HomePromotionalBanner from './components/HomePromotionalBanner';
import { CartProvider } from './hooks/useCart';
import { AnimationProvider } from './hooks/useAnimation';
import { NotificationProvider } from './hooks/useNotification';
import OptimizedImage from './components/OptimizedImage';
import OrderTracker from './components/OrderTracker';
import CustomerOrders from './components/CustomerOrders';
import HeaderGlobal from './components/HeaderGlobal';
import Footer from './components/Footer';

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
    'Pastelaria': '🥟',
    'Doces': '🍰',
    'Bebidas': '🥤',
    'Saudável': '🥗',
    'Italiana': '🍝',
    'Marmita': '🍱',
    'Supermercado': '🛒',
    'Todos': '✨'
};

const slugify = (text: string) => `category-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;

const RestaurantMenu: React.FC<{ restaurant: Restaurant, onBack: () => void }> = ({ restaurant, onBack }) => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [marmitas, setMarmitas] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [allPizzas, setAllPizzas] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const isOpen = isRestaurantOpen(restaurant);

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

    // Lógica de espionagem de scroll para destacar categoria ativa
    useEffect(() => {
        if (isLoading || menu.length === 0) return;

        observer.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveCategory(entry.target.id);
                }
            });
        }, { rootMargin: '-100px 0px -70% 0px' });

        menu.forEach(category => {
            const el = document.getElementById(slugify(category.name));
            if (el) observer.current?.observe(el);
        });

        return () => observer.current?.disconnect();
    }, [isLoading, menu]);

    const handleNavClick = (categoryName: string) => {
        const id = slugify(categoryName);
        const element = document.getElementById(id);
        if (element) {
            const offset = 120; // Ajuste para não cobrir o título com a barra fixa
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const handleBackClick = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('r');
        window.history.pushState({}, '', url.toString());
        onBack();
    };

    return (
        <div className="w-full">
            <div className="relative h-40 sm:h-52 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl p-1 flex-shrink-0 overflow-hidden">
                         <OptimizedImage src={restaurant.imageUrl} alt={restaurant.name} priority={true} className="w-full h-full rounded-full" objectFit="contain" />
                    </div>
                </div>
                <button onClick={handleBackClick} className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-full p-2 shadow-md z-20 hover:scale-105 active:scale-95 transition-transform">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                </button>
            </div>

            <div className="p-4 bg-white rounded-t-2xl -mt-4 relative z-20 text-center border-b shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-gray-600 mt-1 text-sm font-medium uppercase tracking-wide">{restaurant.category}</p>
                {!isOpen && (
                    <div className="mt-2 inline-block bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        FECHADO NO MOMENTO
                    </div>
                )}
            </div>
            
            {!isLoading && marmitas.length > 0 && (
                 <div className="bg-gradient-to-r from-orange-100 to-yellow-50 p-4 border-b-4 border-orange-200">
                    <h2 className="text-xl font-black text-orange-800 uppercase mb-4">Hora do Almoço</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {marmitas.map(item => <MenuItemCard key={`marmita-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} isOpen={isOpen} />)}
                    </div>
                </div>
            )}

            {!isLoading && menu.length > 0 && (
                <div className="sticky top-[64px] z-30 bg-white shadow-md border-b border-gray-100">
                    <div className="flex space-x-3 overflow-x-auto p-3 no-scrollbar">
                        {menu.map((category) => (
                            <button 
                                key={category.name} 
                                onClick={() => handleNavClick(category.name)} 
                                className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeCategory === slugify(category.name) ? 'bg-orange-600 text-white scale-105 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4 min-h-screen">
                {isLoading ? <Spinner /> : (
                    <div className="space-y-12">
                        {menu.map((category) => (
                            <div key={category.name} id={slugify(category.name)} className="scroll-mt-44">
                                <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                    <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {category.combos?.map(combo => <ComboCard key={`combo-${combo.id}`} combo={combo} menuItems={menu.flatMap(c => c.items)} isOpen={isOpen} />)}
                                    {category.items.map(item => <MenuItemCard key={item.id} item={item} allPizzas={allPizzas} allAddons={addons} isOpen={isOpen} />)}
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
    const [activeCategory, setActiveCategory] = useState<string>('Todos'); // AGORA SELEÇÃO ÚNICA
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [favorites, setFavorites] = useState<number[]>([]);

    useEffect(() => {
        const savedFavorites = localStorage.getItem('guarafood-favorites');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        const loadInitialData = async () => {
            try {
                const data = await fetchRestaurants();
                setRestaurants(data);

                const params = new URLSearchParams(window.location.search);
                const rId = params.get('r');
                if (rId) {
                    const id = parseInt(rId, 10);
                    const found = data.find(r => r.id === id);
                    if (found) onSelectRestaurant(found);
                }
            } catch (err) { console.error(err); } finally { setIsLoading(false); }
        };
        loadInitialData();
    }, [onSelectRestaurant]);

    const availableCategories = useMemo(() => {
        const all = restaurants.flatMap(r => r.category ? r.category.split(',').map(c => c.trim()) : []);
        return ['Todos', ...Array.from(new Set(all))];
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(restaurant => {
            const restaurantCats = restaurant.category ? restaurant.category.split(',').map(c => c.trim()) : [];
            const matchesCategory = activeCategory === 'Todos' || restaurantCats.includes(activeCategory);
            const matchesFavorites = activeCategory !== 'Favoritos' || favorites.includes(restaurant.id);
            const matchesOpen = !showOpenOnly || isRestaurantOpen(restaurant);
            return matchesCategory && matchesFavorites && matchesOpen;
        });
    }, [restaurants, activeCategory, favorites, showOpenOnly]);

    const handleCategorySelect = (category: string) => {
        // Se clicar na que já está selecionada, volta para 'Todos'
        if (activeCategory === category) {
            setActiveCategory('Todos');
        } else {
            setActiveCategory(category);
        }
    };

    const handleRestaurantClick = (restaurant: Restaurant) => {
        const url = new URL(window.location.href);
        url.searchParams.set('r', restaurant.id.toString());
        window.history.pushState({}, '', url.toString());
        onSelectRestaurant(restaurant);
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
            <HomePromotionalBanner onBannerClick={(type, val) => {
                if (type === 'restaurant') {
                    const r = restaurants.find(res => res.name === val);
                    if (r) handleRestaurantClick(r);
                } else { handleCategorySelect(val); }
            }} />

            <div className="p-4 overflow-hidden">
                <h2 className="text-lg font-bold text-gray-800 mb-4 ml-1">O que você quer comer hoje?</h2>
                <div className="flex space-x-6 overflow-x-auto pb-4 no-scrollbar">
                    {availableCategories.map(category => {
                        const isSelected = activeCategory === category;
                        return (
                            <button 
                                key={category} 
                                onClick={() => handleCategorySelect(category)} 
                                className="flex flex-col items-center space-y-2 min-w-[70px] transition-transform active:scale-95"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md border-2 transition-all ${isSelected ? 'bg-orange-600 border-orange-500 scale-110 shadow-orange-200' : 'bg-white border-transparent'}`}>
                                    <span className={isSelected ? 'brightness-125' : ''}>{categoryIcons[category] || '🍽️'}</span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>{category}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 pb-4 sticky top-[60px] bg-white z-10 shadow-sm">
                <button 
                    onClick={() => setShowOpenOnly(!showOpenOnly)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${showOpenOnly ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <FunnelIcon className="w-3 h-3" /> Abertos agora
                </button>
                <button 
                    onClick={() => handleCategorySelect('Favoritos')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${activeCategory === 'Favoritos' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                    <HeartIcon className="w-3 h-3" /> Favoritos
                </button>
            </div>

            <div className="p-4 pt-6">
                <h2 className="text-xl font-black text-gray-800 mb-6">Escolha o lugar e faça seu pedido!</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRestaurants.map(restaurant => (
                        <RestaurantCard 
                            key={restaurant.id} 
                            restaurant={restaurant} 
                            onClick={() => handleRestaurantClick(restaurant)} 
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
                        <button onClick={() => { setActiveCategory('Todos'); setShowOpenOnly(false); }} className="mt-4 text-orange-600 font-black underline">Limpar Filtros</button>
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

    useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, []);

    const renderContent = () => {
        if (loading) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
        if (currentUser?.role === 'admin') return <AdminDashboard onBack={() => setView('customer')} />;
        if (currentUser?.role === 'merchant') return <OrderManagement onBack={() => setView('customer')} />;
        if (view === 'login') return <LoginScreen onLoginSuccess={() => setView('customer')} onBack={() => setView('customer')} />;
        if (view === 'history') return <CustomerOrders onBack={() => setView('customer')} />;
        return <CustomerView selectedRestaurant={selectedRestaurant} onSelectRestaurant={setSelectedRestaurant} />;
    };

    return (
        <div className="container mx-auto max-w-7xl bg-white min-h-screen flex flex-col shadow-xl overflow-x-hidden">
            <HeaderGlobal 
                onOrdersClick={() => setView('history')} 
                onHomeClick={() => { setView('customer'); setSelectedRestaurant(null); }} 
            />
            <div className="flex-grow relative print-container">
                {renderContent()}
            </div>
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