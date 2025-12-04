import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Restaurant, MenuCategory, MenuItem, Combo, Addon, Promotion } from './types';
import { fetchRestaurants, fetchMenuForRestaurant, fetchAddonsForRestaurant } from './services/databaseService';
import { AuthProvider, useAuth } from './services/authService';
import { getInitializationError, getErrorMessage } from './services/api';

import RestaurantCard from './components/RestaurantCard';
import Spinner from './components/Spinner';
import MenuItemCard from './components/MenuItemCard';
import ComboCard from './components/ComboCard';
import Cart from './components/Cart';
import { Logo } from './components/Logo';
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


const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.4-1.4l-1.188-.648 1.188-.648a2.25 2.25 0 011.4-1.4l.648-1.188.648 1.188a2.25 2.25 0 01-1.4 1.4z" />
    </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.838-5.514a1.875 1.875 0 00-1.096-2.296l-5.61-1.87A1.875 1.875 0 009.218 6H5.25a.75.75 0 00-.75.75v11.25a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75V14.25z" />
    </svg>
);

const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// Helper to convert "HH:MM" string to minutes from midnight
const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper to create valid HTML IDs from category names
const slugify = (text: string) => `category-${text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;

const checkTimeRange = (currentTime: number, openStr: string, closeStr: string): boolean => {
    if (!openStr || !closeStr) return false;
    const openTime = timeToMinutes(openStr);
    const closeTime = timeToMinutes(closeStr);

    if (closeTime < openTime) {
        // Overnight shift (e.g. 18:00 to 02:00)
        return currentTime >= openTime || currentTime < closeTime;
    }
    return currentTime >= openTime && currentTime < closeTime;
};

const isRestaurantOpen = (restaurant: Restaurant): boolean => {
    const { operatingHours, openingHours, closingHours } = restaurant;
    const now = new Date();
    const currentDay = now.getDay(); // 0 for Sunday
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // New logic using detailed operating hours
    if (operatingHours && operatingHours.length === 7) {
        
        // 1. Check Previous Day for Overnight shifts that extend into today
        const prevDayIndex = currentDay === 0 ? 6 : currentDay - 1;
        const prevDayHours = operatingHours[prevDayIndex];
        
        if (prevDayHours && prevDayHours.isOpen) {
             // Check Shift 1 overflow
             if (prevDayHours.closes && prevDayHours.opens) {
                 const openMins = timeToMinutes(prevDayHours.opens);
                 const closeMins = timeToMinutes(prevDayHours.closes);
                 if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                     return true;
                 }
             }
             // Check Shift 2 overflow
             if (prevDayHours.closes2 && prevDayHours.opens2) {
                 const openMins = timeToMinutes(prevDayHours.opens2);
                 const closeMins = timeToMinutes(prevDayHours.closes2);
                 if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                     return true;
                 }
             }
        }

        // 2. Check Today's Hours
        const todayHours = operatingHours[currentDay];
        if (!todayHours || !todayHours.isOpen) {
            return false;
        }
        
        try {
            // Check Shift 1
            const isOpenShift1 = checkTimeRange(currentTimeInMinutes, todayHours.opens, todayHours.closes);
            
            // Check Shift 2 (if exists)
            const isOpenShift2 = todayHours.opens2 && todayHours.closes2 
                ? checkTimeRange(currentTimeInMinutes, todayHours.opens2, todayHours.closes2)
                : false;

            return isOpenShift1 || isOpenShift2;

        } catch (e) {
            console.error("Error parsing detailed restaurant hours:", restaurant.name, e);
            return true; // Fallback to open
        }
    }

    // Fallback logic for old data structure
    if (!openingHours || !closingHours) {
        return true; // Assume open if data is missing
    }
    try {
       return checkTimeRange(currentTimeInMinutes, openingHours, closingHours);
    } catch (e) {
        console.error("Error parsing simple restaurant hours:", restaurant.name, e);
        return true;
    }
};

const RestaurantMenu: React.FC<{ restaurant: Restaurant, onBack: () => void }> = ({ restaurant, onBack }) => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [dailyPromotions, setDailyPromotions] = useState<(MenuItem | Combo)[]>([]);
    const [dailySpecials, setDailySpecials] = useState<MenuItem[]>([]);
    const [weeklySpecials, setWeeklySpecials] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [allPizzas, setAllPizzas] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});


    useEffect(() => {
        const loadMenu = async () => {
            try {
                setIsLoading(true);
                const [menuData, addonsData] = await Promise.all([
                    fetchMenuForRestaurant(restaurant),
                    fetchAddonsForRestaurant(restaurant),
                ]);

                setAllPizzas(menuData.flatMap(c => c.items).filter(item => item.isPizza));
                
                const specials = menuData.flatMap(category => category.items).filter(item => item.isDailySpecial);
                setDailySpecials(specials);
                
                const weeklyPromos = menuData.flatMap(category => category.items).filter(item => item.isWeeklySpecial);
                setWeeklySpecials(weeklyPromos);
                
                const menuWithoutSpecials = menuData
                    .map(category => ({
                        ...category,
                        items: category.items.filter(item => !item.isDailySpecial && !item.isWeeklySpecial),
                    }))
                    .filter(category => category.items.length > 0 || (category.combos && category.combos.length > 0));

                setMenu(menuWithoutSpecials);
                setAddons(addonsData);

                const promotedItems = menuData
                    .flatMap(category => [...category.items, ...(category.combos || [])])
                    .filter(item => !!item.activePromotion);
                setDailyPromotions(promotedItems);

                if (menuWithoutSpecials.length > 0) {
                    setActiveCategory(slugify(menuWithoutSpecials[0].name));
                }
            } catch (err) {
                setError('Falha ao carregar o cardápio. Por favor, tente recarregar a página.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadMenu();
    }, [restaurant]);

    useEffect(() => {
        if (isLoading || menu.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveCategory(entry.target.id);
                    }
                });
            },
            {
                rootMargin: "-80px 0px -40% 0px",
                threshold: 0,
            }
        );

        const refs = categoryRefs.current;
        Object.values(refs).forEach((ref) => {
            if (ref instanceof Element) {
                observer.observe(ref);
            }
        });

        return () => {
            Object.values(refs).forEach((ref) => {
                if (ref instanceof Element) {
                    observer.unobserve(ref);
                }
            });
        };
    }, [isLoading, menu]);

    const handleNavClick = (categoryName: string) => {
        const id = slugify(categoryName);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            element.classList.add('highlight-scroll');
            setTimeout(() => {
                element.classList.remove('highlight-scroll');
            }, 1500);
        }
    };

    return (
        <div className="w-full">
            {/* HEADER: Gradiente Escuro + Logo Centralizada */}
            <div className="relative h-40 sm:h-52 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                {/* Abstract Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{ 
                    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                    backgroundSize: '20px 20px' 
                }}></div>
                
                {/* Centered Logo Container */}
                <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl p-1 flex-shrink-0 border-4 border-white/20 overflow-hidden">
                         <OptimizedImage 
                            src={restaurant.imageUrl} 
                            alt={restaurant.name} 
                            priority={true}
                            className="w-full h-full rounded-full"
                            objectFit="contain" // Garante que a logo apareça INTEIRA dentro do círculo branco
                        />
                    </div>
                </div>

                <button onClick={onBack} className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-full p-2 shadow-md hover:bg-white transition-colors z-20">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                </button>
            </div>

            <div className="p-4 bg-white rounded-t-2xl -mt-4 relative z-20 text-center border-b shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-gray-600 mt-1 text-sm font-medium uppercase tracking-wide">{restaurant.category}</p>
                {restaurant.description && <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">{restaurant.description}</p>}
            </div>
            
            {!isLoading && restaurant.category === 'Supermercado' && weeklySpecials.length > 0 && (
                <div className="p-4 bg-green-50 border-b-2 border-t-2 border-green-200">
                    <h2 className="text-2xl font-bold mb-4 text-green-700 flex items-center gap-2">
                        <ShoppingCartIcon className="w-6 h-6" />
                        Promoções da Semana
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {weeklySpecials.map(item =>
                            <MenuItemCard key={`weekly-special-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} />
                        )}
                    </div>
                </div>
            )}

            {!isLoading && dailySpecials.length > 0 && (
                <div className="p-4 bg-blue-50 border-b-2 border-t-2 border-blue-200">
                    <h2 className="text-2xl font-bold mb-4 text-blue-700 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6" />
                        Destaque do Dia
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {dailySpecials.map(item =>
                            <MenuItemCard key={`special-item-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} />
                        )}
                    </div>
                </div>
            )}

            {!isLoading && dailyPromotions.length > 0 && (
                <div className="p-4 bg-orange-50 border-b-2 border-t-2 border-orange-200">
                    <h2 className="text-2xl font-bold mb-4 text-orange-700 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6" />
                        Promoções do Dia!
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {dailyPromotions.map(item => 'menuItemIds' in item 
                            ? <ComboCard key={`promo-combo-${item.id}`} combo={item} menuItems={menu.flatMap(c => c.items)} /> 
                            : <MenuItemCard key={`promo-item-${item.id}`} item={item} allPizzas={allPizzas} allAddons={addons} />
                        )}
                    </div>
                </div>
            )}
            
            {/* NEW: CouponDisplay component */}
            {!isLoading && restaurant.id && <CouponDisplay restaurantId={restaurant.id} />}

            {!isLoading && !error && menu.length > 0 && (
                <div className="sticky top-0 z-30 bg-white shadow-sm">
                    <div className="flex space-x-3 overflow-x-auto p-3 border-b">
                        {menu.map((category) => {
                            const categoryId = slugify(category.name);
                            return (
                                <button
                                    key={category.name}
                                    onClick={() => handleNavClick(category.name)}
                                    className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
                                        activeCategory === categoryId
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {category.iconUrl && <img src={category.iconUrl} alt={category.name} className="w-5 h-5 object-contain" />}
                                    {category.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="p-4">
                 {isLoading ? <Spinner message="Carregando cardápio..." /> : error ? <p className="text-red-500 text-center p-8 bg-red-50 rounded-lg">{error}</p> : (
                    <div className="space-y-8">
                        {menu.length === 0 && (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-lg font-medium">O cardápio está sendo preparado!</p>
                                <p className="text-gray-400 text-sm mt-1">Visite novamente em breve.</p>
                            </div>
                        )}
                        {menu.map((category) => {
                            const categoryId = slugify(category.name);
                            return (
                                <div
                                    key={category.name}
                                    id={categoryId}
                                    ref={(el) => (categoryRefs.current[categoryId] = el)}
                                    className="scroll-mt-20 rounded-lg"
                                >
                                    <h2 className="text-2xl font-bold mb-4 px-2 pt-2 flex items-center gap-3">
                                        {category.iconUrl && <img src={category.iconUrl} alt={category.name} className="w-8 h-8 object-contain" />}
                                        {category.name}
                                    </h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {category.combos?.map(combo => <ComboCard key={`combo-${combo.id}`} combo={combo} menuItems={menu.flatMap(c => c.items)} />)}
                                        {category.items.map(item => <MenuItemCard key={item.id} item={item} allPizzas={allPizzas} allAddons={addons} />)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const CustomerView: React.FC<{
    onGoToLogin: () => void;
    onGoToHistory: () => void;
}> = ({ onGoToLogin, onGoToHistory }) => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    // Changed: Support multi-select categories. Default 'Todos' means no filter/all.
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Todos']);
    const [showOpenOnly, setShowOpenOnly] = useState(false);

    // Use a fixed header image to avoid API quota issues.
    const [headerImage, setHeaderImage] = useState<string>('https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch restaurants
                const restaurantsData = await fetchRestaurants();
                setRestaurants(restaurantsData);

                // Check URL for restaurant ID parameter (?r=15)
                const urlParams = new URLSearchParams(window.location.search);
                const restaurantIdParam = urlParams.get('r');
                if (restaurantIdParam) {
                    const id = parseInt(restaurantIdParam, 10);
                    if (!isNaN(id)) {
                        const targetRestaurant = restaurantsData.find(r => r.id === id);
                        if (targetRestaurant) {
                            setSelectedRestaurant(targetRestaurant);
                        }
                    }
                }

            } catch (err: any) {
                // Determine error message
                let message = 'Falha ao buscar restaurantes.';
                if (typeof err === 'string') message = err;
                else if (err.message) message = err.message;
                
                setError(message);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []); // Empty dependency array means it runs once on mount

    const categories = useMemo(() => {
        const allCategories = restaurants.flatMap(r => r.category ? r.category.split(',').map(c => c.trim()) : []);
        return ['Todos', ...Array.from(new Set(allCategories))];
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(restaurant => {
            // Updated filtering logic for multi-select and comma-separated categories
            const restaurantCategories = restaurant.category ? restaurant.category.split(',').map(c => c.trim()) : [];
            const matchesCategory = selectedCategories.includes('Todos') || selectedCategories.length === 0 || selectedCategories.some(sel => restaurantCategories.includes(sel));
            
            const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesOpenFilter = !showOpenOnly || isRestaurantOpen(restaurant);
            return matchesCategory && matchesSearch && matchesOpenFilter;
        });
    }, [restaurants, searchTerm, selectedCategories, showOpenOnly]);

    const handleBannerClick = (targetType: 'restaurant' | 'category', targetValue: string) => {
        if (targetType === 'restaurant') {
            const targetRestaurant = restaurants.find(r => r.name === targetValue);
            if (targetRestaurant) {
                setSelectedRestaurant(targetRestaurant);
            } else {
                console.warn(`Banner clicked for non-existent restaurant: ${targetValue}`);
            }
        } else if (targetType === 'category') {
            // Check if the category exists in the available list
            const targetCategory = categories.find(c => c === targetValue);
            if (targetCategory) {
                // For banners, we just set the single category
                setSelectedCategories([targetCategory]);
                // Also clear search term to ensure category is visible
                setSearchTerm('');
            } else {
                console.warn(`Banner clicked for non-existent category: ${targetValue}`);
            }
        }
    };

    const handleCategoryClick = (category: string) => {
        if (category === 'Todos') {
            setSelectedCategories(['Todos']);
            return;
        }

        setSelectedCategories(prev => {
            // If "Todos" was selected, clear it and start fresh with the clicked category
            if (prev.includes('Todos')) {
                return [category];
            }

            // Toggle logic
            if (prev.includes(category)) {
                const newSelection = prev.filter(c => c !== category);
                // If we deselected everything, go back to "Todos"
                return newSelection.length === 0 ? ['Todos'] : newSelection;
            } else {
                return [...prev, category];
            }
        });
    };

    const handleBackToHome = () => {
        setSelectedRestaurant(null);
        // Clear URL param without refreshing
        window.history.replaceState({}, '', window.location.pathname);
    };


    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><Spinner message="Buscando os melhores restaurantes..." /></div>;
    }
    
    // Display global error (e.g., failed to fetch restaurants)
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Erro de Conexão</h2>
                    <p className="text-gray-600 text-sm mb-6 break-words">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    if (selectedRestaurant) {
        return (
            <>
                <RestaurantMenu restaurant={selectedRestaurant} onBack={handleBackToHome} />
                <Cart restaurant={selectedRestaurant} />
            </>
        );
    }

    return (
        <>
            <header className="p-4 sticky top-0 bg-orange-600 shadow-md z-20">
                 <div className="flex justify-between items-center">
                  <Logo />
                  <div className="flex items-center gap-2">
                      <button onClick={onGoToHistory} className="flex items-center space-x-1 text-sm font-semibold text-white p-2 rounded-lg hover:bg-orange-700 transition-colors" title="Meus Pedidos">
                          <ClockIcon className="w-6 h-6"/>
                      </button>
                      <button onClick={onGoToLogin} className="flex items-center space-x-2 text-sm font-semibold text-white p-2 rounded-lg hover:bg-orange-700 transition-colors">
                          <UserCircleIcon className="w-6 h-6"/>
                          <span className="hidden sm:inline">Acessar Painel</span>
                      </button>
                  </div>
                </div>
            </header>

            <main className="pb-16"> {/* Add padding bottom for OrderTracker */}
                <div
                    className="relative p-6 sm:p-10 text-center border-b border-orange-100 min-h-[250px] flex flex-col justify-center overflow-hidden"
                    role="banner"
                >
                    {/* Replaced backgroundImage with OptimizedImage for better performance and lazy loading control */}
                    <div className="absolute inset-0 bg-[#fff7ed]">
                        {headerImage && (
                            <OptimizedImage 
                                src={headerImage} 
                                alt="Fundo GuaraFood" 
                                priority={true} 
                                className="w-full h-full"
                                objectFit="cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-white">Sua fome pede, GuaraFood entrega.</h1>
                        <p className="max-w-2xl mx-auto mb-6 text-gray-100">Uma praça de alimentação completa na palma da sua mão.</p>
                        <div className="relative max-w-xl mx-auto w-full">
                            <input
                                type="text"
                                placeholder="Buscar por nome do restaurante..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-3 pl-10 border rounded-full bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                                aria-label="Buscar restaurantes"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                <HomePromotionalBanner onBannerClick={handleBannerClick} />

                <div className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                        <h2 className="text-xl font-semibold">Categorias</h2>
                        <label htmlFor="open-toggle" className="flex items-center cursor-pointer flex-shrink-0">
                            <span className="mr-3 text-sm font-medium text-gray-900">Abertos agora</span>
                            <div className="relative">
                                <input id="open-toggle" type="checkbox" className="sr-only peer" checked={showOpenOnly} onChange={e => setShowOpenOnly(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </div>
                        </label>
                    </div>
                    <div className="flex space-x-3 overflow-x-auto pb-3 -mx-4 px-4">
                        {categories.map(category => {
                            const isSelected = selectedCategories.includes(category);
                            return (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryClick(category)}
                                    className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transform transition-all duration-200 ease-in-out hover:scale-105 ${
                                        isSelected
                                            ? 'bg-orange-600 text-white shadow-lg' 
                                            : 'bg-white text-gray-700 border hover:shadow-md'
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4">
                    <h2 className="text-xl font-semibold mb-3">Restaurantes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRestaurants.map(restaurant => {
                            const isOpen = isRestaurantOpen(restaurant);
                            return <RestaurantCard key={restaurant.id} restaurant={restaurant} onClick={() => setSelectedRestaurant(restaurant)} isOpen={isOpen} />;
                        })}
                    </div>
                    {filteredRestaurants.length === 0 && <p className="text-center text-gray-500 col-span-full py-8">Nenhum restaurante encontrado.</p>}
                </div>
                
                {/* Tracker Overlay */}
                <OrderTracker />
            </main>
             <Cart restaurant={selectedRestaurant} />
        </>
    );
};


type ViewState = 'customer' | 'login' | 'history';

const AppContent: React.FC = () => {
    const [view, setView] = useState<ViewState>('customer');
    const { currentUser, loading, authError } = useAuth();

    const handleBackToCustomerView = () => setView('customer');

    const renderContent = () => {
        if (authError) {
            return (
                <div className="h-screen flex items-center justify-center p-4 bg-red-50">
                    <div className="max-w-xl w-full text-center bg-white p-8 rounded-lg shadow-lg">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro de Autenticação</h1>
                        <p className="text-gray-600 mb-4">Ocorreu um problema ao verificar suas credenciais.</p>
                        <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-700 overflow-x-auto mb-6">
                            {authError}
                        </div>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('guara-food-user-profile');
                                window.location.reload();
                            }}
                            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors w-full"
                        >
                            Sair e Tentar Novamente
                        </button>
                    </div>
                </div>
            );
        }

        if (loading) {
            return <div className="h-screen flex items-center justify-center"><Spinner message="Carregando..." /></div>;
        }

        if (currentUser) {
            if (currentUser.role === 'admin') {
                return <AdminDashboard onBack={handleBackToCustomerView} />;
            }
            if (currentUser.role === 'merchant') {
                return <OrderManagement onBack={handleBackToCustomerView} />;
            }
        }
        
        if (view === 'login') {
            return <LoginScreen onLoginSuccess={() => {
                setView('customer');
            }} onBack={handleBackToCustomerView} />;
        }

        if (view === 'history') {
            return <CustomerOrders onBack={handleBackToCustomerView} />;
        }
        
        return <CustomerView onGoToLogin={() => setView('login')} onGoToHistory={() => setView('history')} />;
    };

    return (
        <div className="container mx-auto max-w-7xl bg-white md:bg-gray-50 min-h-screen">
            {renderContent()}
        </div>
    );
};

const App: React.FC = () => {
    const supabaseError = getInitializationError();

    if (supabaseError) {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-orange-50">
                <div className="max-w-md w-full text-center bg-white p-8 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-orange-600 mb-4">Erro de Configuração</h1>
                    <p className="text-gray-600 mb-4">
                        Não foi possível conectar ao banco de dados.
                    </p>
                    <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-700 overflow-x-auto mb-6">
                        {supabaseError.message}
                    </div>
                    <p className="text-sm text-gray-500">Verifique o arquivo <code>config.ts</code>.</p>
                </div>
            </div>
        );
    }

    return (
        <NotificationProvider>
            <AnimationProvider>
                <CartProvider>
                    <AuthProvider>
                        <AppContent />
                    </AuthProvider>
                </CartProvider>
            </AnimationProvider>
        </NotificationProvider>
    );
};

export default App;