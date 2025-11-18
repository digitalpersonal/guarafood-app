import { supabase, supabaseAnon, handleSupabaseError } from './api';
import type { Restaurant, MenuCategory, Addon, Promotion, MenuItem, Combo, Coupon, Banner, RestaurantCategory } from '../types';
import { GoogleGenAI } from '@google/genai';

// --- Helper: Normalize DB Data to CamelCase ---
// This ensures that even if the DB returns snake_case (e.g. delivery_fee), 
// the application logic receives camelCase (deliveryFee).
const normalizeRestaurant = (data: any): Restaurant => {
    if (!data) return data;
    return {
        ...data,
        deliveryFee: data.deliveryFee ?? data.delivery_fee,
        deliveryTime: data.deliveryTime ?? data.delivery_time,
        openingHours: data.openingHours ?? data.opening_hours,
        closingHours: data.closingHours ?? data.closing_hours,
        imageUrl: data.imageUrl ?? data.image_url,
        paymentGateways: data.paymentGateways ?? data.payment_gateways,
        operatingHours: data.operatingHours ?? data.operating_hours,
        // mercado_pago_credentials matches types.ts, so we keep it as is or map it if needed
        mercado_pago_credentials: data.mercado_pago_credentials ?? data.mercadoPagoCredentials
    };
};

// --- Data Fetching Functions ---

/**
 * PUBLIC: Fetches restaurants for the customer view.
 * CRITICAL: Explicitly removes sensitive credentials (mercado_pago_credentials) 
 * to prevent leaking private keys to the client browser.
 */
export const fetchRestaurants = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants' });
    
    const rawData = (data || []).filter(restaurant => restaurant.name !== 'Bella Pizza');
    
    return rawData.map(r => {
        const normalized = normalizeRestaurant(r);
        // SECURITY: Remove sensitive credentials for public view
        if (normalized.mercado_pago_credentials) {
            delete normalized.mercado_pago_credentials;
        }
        return normalized;
    });
};

/**
 * SECURE: Fetches all restaurants for the Admin Dashboard.
 * Uses the authenticated 'supabase' client and includes all fields.
 */
export const fetchRestaurantsSecure = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants (secure)' });
    
    // Admin sees all data, no filtering or stripping.
    return (data || []).map(normalizeRestaurant);
};

/**
 * PUBLIC: Fetches a single restaurant by ID.
 * CRITICAL: Explicitly removes sensitive credentials.
 */
export const fetchRestaurantById = async (id: number): Promise<Restaurant> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant' });
    if (!data) throw new Error('Restaurant not found');
    
    const normalized = normalizeRestaurant(data);
    // SECURITY: Remove sensitive credentials for public fetch
    if (normalized.mercado_pago_credentials) {
        delete normalized.mercado_pago_credentials;
    }
    return normalized;
};

/**
 * SECURE: Fetches a single restaurant for the Merchant Settings panel.
 * Uses the authenticated 'supabase' client and includes credentials.
 */
export const fetchRestaurantByIdSecure = async (id: number): Promise<Restaurant> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant details' });
    if (!data) throw new Error('Restaurant not found');
    return normalizeRestaurant(data);
};

export const fetchRestaurantCategories = async (): Promise<RestaurantCategory[]> => {
    const { data, error } = await supabaseAnon.from('restaurant_categories').select('*').order('name');
    
    if (error) {
         console.warn('Failed to fetch restaurant categories, utilizing default list.', error);
         // Fallback defaults if table doesn't exist or connection fails
         return [
            { id: 1, name: 'Lanches' },
            { id: 2, name: 'Pizza' },
            { id: 3, name: 'Japonesa' },
            { id: 4, name: 'Brasileira' },
            { id: 5, name: 'Açaí' },
            { id: 6, name: 'Doces & Bolos' },
            { id: 7, name: 'Marmita' },
            { id: 8, name: 'Bebidas' },
            { id: 9, name: 'Padaria' },
            { id: 10, name: 'Supermercado' },
            { id: 11, name: 'Farmácia' },
            { id: 12, name: 'Pet Shop' },
            { id: 13, name: 'Sorvetes' },
            { id: 14, name: 'Pastel' }
        ];
    }
    return data as RestaurantCategory[];
};

export const fetchMenuForRestaurant = async (restaurant: Restaurant | number): Promise<MenuCategory[]> => {
    const restaurantId = typeof restaurant === 'number' ? restaurant : restaurant.id;
    const currentDay = new Date().getDay(); // 0=Sun, 1=Mon, etc.

    try {
        const { data: menuData, error } = await supabaseAnon
            .from('menu_categories')
            .select(`
                *,
                items:menu_items(*),
                combos(*)
            `)
            .eq('restaurant_id', restaurantId)
            .order('displayOrder', { ascending: true });

        handleSupabaseError({ error, customMessage: "Could not fetch the restaurant's menu" });

        const menuWithFilteredItems = (menuData || []).map((category: any) => ({
            ...category,
            items: (category.items || []).filter((item: MenuItem) => 
                !item.availableDays || item.availableDays.length === 0 || item.availableDays.includes(currentDay)
            )
        }));

        const promotions = await fetchPromotionsForRestaurant(restaurantId);
        return applyPromotionsToMenu(menuWithFilteredItems as MenuCategory[] || [], promotions);

    } catch (error: any) {
        console.error('Failed to fetch menu from Supabase', error);
        throw new Error(`Failed to fetch menu: ${error.message}`);
    }
};


export const fetchAddonsForRestaurant = async (restaurant: Restaurant | number): Promise<Addon[]> => {
     const restaurantId = typeof restaurant === 'number' ? restaurant : restaurant.id;
    try {
        const { data, error } = await supabaseAnon
            .from('addons')
            .select('*')
            .eq('restaurant_id', restaurantId);

        handleSupabaseError({ error, customMessage: "Could not fetch addons for the restaurant" });
        return data || [];
        
    } catch (error: any) {
        console.error('Failed to fetch addons from Supabase', error);
        throw new Error(`Failed to fetch addons: ${error.message}`);
    }
};

export const fetchActiveBanners = async (): Promise<Banner[]> => {
    const { data, error } = await supabaseAnon.from('banners').select('*').eq('active', true);
    if (error) {
        console.warn("Failed to fetch banners from DB, using fallback.");
        return [];
    }
    return data || [];
};

// --- GENERIC BANNER MANAGEMENT ---
export const fetchBanners = async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from('banners').select('*').order('id', { ascending: false });
    handleSupabaseError({ error, customMessage: 'Failed to fetch banners' });
    return data || [];
};

export const createBanner = async (bannerData: Omit<Banner, 'id'>): Promise<Banner> => {
    const { data, error } = await supabase.from('banners').insert(bannerData).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create banner' });
    return data;
};

export const updateBanner = async (id: number, bannerData: Partial<Banner>): Promise<Banner> => {
    const { data, error } = await supabase.from('banners').update(bannerData).eq('id', id).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update banner' });
    return data;
};

export const deleteBanner = async (id: number): Promise<void> => {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    handleSupabaseError({ error, customMessage: 'Failed to delete banner' });
};


// --- PROMOTION LOGIC ---
const applyPromotionsToMenu = (menu: MenuCategory[], promotions: Promotion[]): MenuCategory[] => {
    const now = new Date();
    const activePromotions = promotions.filter(promo => {
        const startDate = new Date(promo.startDate);
        const endDate = new Date(promo.endDate);
        return now >= startDate && now <= endDate;
    });

    if (activePromotions.length === 0) return menu;

    const applyPromotion = <T extends MenuItem | Combo>(item: T, promo: Promotion): T => {
        const originalPrice = item.price;
        let discountedPrice = originalPrice;
        if (promo.discountType === 'PERCENTAGE') {
            discountedPrice = originalPrice * (1 - promo.discountValue / 100);
        } else {
            discountedPrice = Math.max(0, originalPrice - promo.discountValue);
        }
        return {
            ...item,
            price: parseFloat(discountedPrice.toFixed(2)),
            originalPrice: originalPrice,
            activePromotion: promo,
        };
    };

    return menu.map(category => {
        return {
            ...category,
            items: category.items.map(item => {
                const itemPromo = activePromotions.find(p => p.targetType === 'ITEM' && p.targetIds.includes(item.id));
                const categoryPromo = activePromotions.find(p => p.targetType === 'CATEGORY' && p.targetIds.includes(category.name));
                const promo = itemPromo || categoryPromo;
                return promo ? applyPromotion(item, promo) : item;
            }),
            combos: category.combos?.map(combo => {
                 const comboPromo = activePromotions.find(p => p.targetType === 'COMBO' && p.targetIds.includes(combo.id));
                 const categoryPromo = activePromotions.find(p => p.targetType === 'CATEGORY' && p.targetIds.includes(category.name));
                 const promo = comboPromo || categoryPromo;
                return promo ? applyPromotion(combo, promo) : combo;
            }),
        };
    });
};

export const generateImage = async (
    prompt: string,
    aspectRatio: '1:1' | '16:9' | '4:3' | '3:4' | '9:16' = '16:9'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        },
    });

    const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Image generation failed to return an image.");
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};


// --- CRUD Operations ---

// Restaurants
export const updateRestaurant = async (id: number, restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    // Note: restaurantData is already camelCase. We send it as is, assuming DB handles camelCase based on previous errors.
    const { data, error } = await supabase.from('restaurants').update(restaurantData).eq('id', id).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update restaurant' });
    return normalizeRestaurant(data);
};

export const deleteRestaurant = async (id: number): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-restaurant-and-user', {
        body: { restaurantId: id },
    });
     if (error) {
        handleSupabaseError({ error, customMessage: 'Failed to invoke delete restaurant function' });
    }
};

// Promotions
export const fetchPromotionsForRestaurant = async (restaurantId: number): Promise<Promotion[]> => {
    const { data, error } = await supabaseAnon.from('promotions').select('*').eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to fetch promotions' });
    return data || [];
};

export const createPromotion = async (restaurantId: number, promoData: Omit<Promotion, 'id' | 'restaurantId'>): Promise<Promotion> => {
    const payload = { ...promoData, restaurantId };
    const { data, error } = await supabase.from('promotions').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create promotion' });
    return data;
};

export const updatePromotion = async (restaurantId: number, promoId: number, promoData: Partial<Promotion>): Promise<Promotion> => {
    const { data, error } = await supabase.from('promotions').update(promoData).eq('id', promoId).eq('restaurantId', restaurantId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update promotion' });
    return data;
};

export const deletePromotion = async (restaurantId: number, promoId: number): Promise<void> => {
    const { error } = await supabase.from('promotions').delete().eq('id', promoId).eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete promotion' });
};


// Coupons
export const fetchCouponsForRestaurant = async (restaurantId: number): Promise<Coupon[]> => {
    const { data, error } = await supabaseAnon.from('coupons').select('*').eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to fetch coupons' });
    return data || [];
};

export const createCoupon = async (restaurantId: number, couponData: Omit<Coupon, 'id' | 'restaurantId'>): Promise<Coupon> => {
    const payload = { ...couponData, restaurantId, code: couponData.code.toUpperCase() };
    const { data, error } = await supabase.from('coupons').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create coupon' });
    return data;
};

export const updateCoupon = async (restaurantId: number, couponId: number, couponData: Partial<Omit<Coupon, 'id' | 'restaurantId'>>): Promise<Coupon> => {
    const payload = { ...couponData };
    if (payload.code) {
        payload.code = payload.code.toUpperCase();
    }
    const { data, error } = await supabase.from('coupons').update(payload).eq('id', couponId).eq('restaurantId', restaurantId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update coupon' });
    return data;
};

export const deleteCoupon = async (restaurantId: number, couponId: number): Promise<void> => {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId).eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete coupon' });
};

export const validateCouponByCode = async (code: string, restaurantId: number): Promise<Coupon | null> => {
    const { data, error } = await supabaseAnon.from('coupons').select('*').eq('code', code.toUpperCase()).eq('restaurantId', restaurantId).single();
    if (error && error.code !== 'PGRST116') {
        handleSupabaseError({ error, customMessage: 'Failed to validate coupon' });
    }
    return data;
};


// Combos
export const createCombo = async (restaurantId: number, comboData: Omit<Combo, 'id' | 'restaurantId'>): Promise<Combo> => {
    const payload = { ...comboData, restaurantId };
    const { data, error } = await supabase.from('combos').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create combo' });
    return data;
};

export const updateCombo = async (restaurantId: number, comboId: number, comboData: Partial<Combo>): Promise<Combo> => {
    const { data, error } = await supabase.from('combos').update(comboData).eq('id', comboId).eq('restaurantId', restaurantId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update combo' });
    return data;
};

export const deleteCombo = async (restaurantId: number, comboId: number): Promise<void> => {
    const { error } = await supabase.from('combos').delete().eq('id', comboId).eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete combo' });
};

// Menu Items
export const createMenuItem = async (restaurantId: number, itemData: Omit<MenuItem, 'id' | 'restaurantId'> & { category?: string }): Promise<MenuItem> => {
    const { category, ...restOfItemData } = itemData;

    if (!category) {
        throw new Error("Category name is required to create a menu item.");
    }
    
    let { data: categoryData } = await supabase.from('menu_categories').select('id').eq('restaurantId', restaurantId).eq('name', category).single();
    if (!categoryData) {
        categoryData = (await createCategory(restaurantId, category));
    }

    const payload = { ...restOfItemData, restaurantId, category_id: categoryData!.id };
    const { data, error } = await supabase.from('menu_items').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create menu item' });
    return data;
};

export const updateMenuItem = async (restaurantId: number, itemId: number, itemData: Partial<MenuItem> & { category?: string }): Promise<MenuItem> => {
    const { category, ...restOfItemData } = itemData;
    let category_id = itemData.categoryId;

    if (category) {
        let { data: categoryData } = await supabase.from('menu_categories').select('id').eq('restaurantId', restaurantId).eq('name', category).single();
         if (!categoryData) {
            categoryData = (await createCategory(restaurantId, category));
        }
        category_id = categoryData!.id;
    }
    
    const payload = { ...restOfItemData, category_id };
    const { data, error } = await supabase.from('menu_items').update(payload).eq('id', itemId).eq('restaurantId', restaurantId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update menu item' });
    return data;
};

export const deleteMenuItem = async (restaurantId: number, itemId: number): Promise<void> => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId).eq('restaurantId', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete menu item' });
};

// Categories
export const createCategory = async (restaurantId: number, name: string, iconUrl?: string | null): Promise<MenuCategory> => {
    const { data: maxOrder, error: orderError } = await supabase.from('menu_categories').select('displayOrder').eq('restaurantId', restaurantId).order('displayOrder', { ascending: false }).limit(1).single();
    if (orderError && orderError.code !== 'PGRST116') {
      handleSupabaseError({ error: orderError, customMessage: 'Failed to determine category order' });
    }
    const newOrder = (maxOrder?.displayOrder ?? -1) + 1;

    const { data, error } = await supabase.from('menu_categories').insert({ name, restaurantId, displayOrder: newOrder, iconUrl }).select().single();
    
    if (error && error.code === '23505') {
        console.warn('Race condition detected when creating category, fetching existing one.', { name, restaurantId });
        const { data: existingCategory, error: fetchError } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurantId', restaurantId)
            .eq('name', name)
            .single();
        
        handleSupabaseError({ error: fetchError, customMessage: 'Failed to fetch category after race condition' });
        if (!existingCategory) throw new Error('Failed to resolve category creation race condition.');
        return { ...existingCategory, items: [], combos: [] };
    }
    
    handleSupabaseError({ error, customMessage: 'Failed to create category' });
    return { ...data!, items: [], combos: [] };
};

export const updateCategory = async (restaurantId: number, categoryId: number, newName: string, newIconUrl?: string | null): Promise<void> => {
    const payload: { name: string; iconUrl?: string | null } = { name: newName };
    if (newIconUrl !== undefined) {
        payload.iconUrl = newIconUrl && newIconUrl.trim() !== '' ? newIconUrl : null;
    }
    const { error } = await supabase.from('menu_categories').update(payload).eq('id', categoryId);
    handleSupabaseError({ error, customMessage: 'Failed to update category name or icon' });
};

export const deleteCategory = async (restaurantId: number, name: string): Promise<void> => {
    const { error } = await supabase.from('menu_categories').delete().eq('restaurantId', restaurantId).eq('name', name);
    handleSupabaseError({ error, customMessage: 'Failed to delete category' });
};

export const updateCategoryOrder = async (restaurantId: number, categories: MenuCategory[]): Promise<void> => {
    const updates = categories.map((category, index) => ({
        id: category.id,
        displayOrder: index,
    }));
    const { error } = await supabase.from('menu_categories').upsert(updates);
    handleSupabaseError({ error, customMessage: 'Failed to update category order' });
};

// Global Categories
// Duplicate fetchRestaurantCategories removed here

export const createRestaurantCategory = async (name: string): Promise<RestaurantCategory> => {
    const { data, error } = await supabase.from('restaurant_categories').insert({ name }).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create restaurant category' });
    return data;
};

export const deleteRestaurantCategory = async (id: number): Promise<void> => {
    const { error } = await supabase.from('restaurant_categories').delete().eq('id', id);
    handleSupabaseError({ error, customMessage: 'Failed to delete restaurant category' });
};
