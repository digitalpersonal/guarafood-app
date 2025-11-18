
import { supabase, supabaseAnon, handleSupabaseError } from './api';
import type { Restaurant, MenuCategory, Addon, Promotion, MenuItem, Combo, Coupon, Banner } from '../types';
import { GoogleGenAI } from '@google/genai';


// --- Data Fetching Functions ---

// Helper to map DB snake_case to CamelCase for Restaurants
const mapDbToRestaurant = (dbData: any): Restaurant => ({
    id: dbData.id,
    name: dbData.name,
    category: dbData.category,
    deliveryTime: dbData.delivery_time || dbData.deliveryTime, 
    rating: dbData.rating,
    imageUrl: dbData.image_url || dbData.imageUrl,
    paymentGateways: dbData.payment_gateways || dbData.paymentGateways,
    address: dbData.address,
    phone: dbData.phone,
    openingHours: dbData.opening_hours || dbData.openingHours,
    closingHours: dbData.closing_hours || dbData.closingHours,
    deliveryFee: dbData.delivery_fee || dbData.deliveryFee,
    mercado_pago_credentials: dbData.mercado_pago_credentials,
    operatingHours: dbData.operating_hours || dbData.operatingHours
});

// Helper to map CamelCase to DB snake_case for Restaurants
const mapRestaurantToDb = (data: Partial<Restaurant>): any => {
    const mapped: any = { ...data };
    if (data.deliveryTime !== undefined) mapped.delivery_time = data.deliveryTime;
    if (data.imageUrl !== undefined) mapped.image_url = data.imageUrl;
    if (data.paymentGateways !== undefined) mapped.payment_gateways = data.paymentGateways;
    if (data.openingHours !== undefined) mapped.opening_hours = data.openingHours;
    if (data.closingHours !== undefined) mapped.closing_hours = data.closingHours;
    if (data.deliveryFee !== undefined) mapped.delivery_fee = data.deliveryFee;
    if (data.operatingHours !== undefined) mapped.operating_hours = data.operatingHours;
    
    // Clean up camelCase keys if snake_case was set
    delete mapped.deliveryTime;
    delete mapped.imageUrl;
    delete mapped.paymentGateways;
    delete mapped.openingHours;
    delete mapped.closingHours;
    delete mapped.deliveryFee;
    delete mapped.operatingHours;
    
    return mapped;
}

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants' });
    // Filter out example data as requested by the user.
    const restaurants = (data || []).filter(restaurant => restaurant.name !== 'Bella Pizza');
    return restaurants.map(mapDbToRestaurant);
};

export const fetchRestaurantById = async (id: number): Promise<Restaurant> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant' });
    if (!data) throw new Error('Restaurant not found');
    return mapDbToRestaurant(data);
};

export const fetchMenuForRestaurant = async (restaurant: Restaurant | number): Promise<MenuCategory[]> => {
    const restaurantId = typeof restaurant === 'number' ? restaurant : restaurant.id;
    const currentDay = new Date().getDay(); // 0=Sun, 1=Mon, etc.

    try {
        // This is the production-ready query. It fetches categories and all their related items and combos.
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

        // Filter menu items based on the day of the week
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
        // This is the production-ready query.
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

// Mock function to simulate fetching banners.
// In a real app, this would query a 'marketing_banners' table.
export const fetchActiveBanners = async (): Promise<Banner[]> => {
    // NOTE TO REVIEWER:
    // This is mock data. To make this dynamic, create a `marketing_banners` table in Supabase
    // with columns like: id, title, description, image_url, cta_text, target_type, target_value,
    // is_active, start_date, end_date.
    // Then, replace the mock return with a Supabase query:
    /*
    const { data, error } = await supabaseAnon
      .from('marketing_banners')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());
    handleSupabaseError({ error, customMessage: 'Failed to fetch banners' });
    return data || [];
    */

    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    return [
        {
            id: 1,
            title: "Festival de Pizza!",
            description: "As melhores pizzas da cidade com 20% de desconto. Peça agora!",
            imageUrl: "https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
            ctaText: "Ver Pizzarias",
            targetType: 'category',
            targetValue: 'Pizzaria'
        }
    ];
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

/**
 * Generates an image using the Imagen model from the Gemini API.
 * @param prompt The descriptive text for image generation.
 * @param aspectRatio The desired aspect ratio for the generated image.
 * @returns A base64 encoded image URL.
 */
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
// createRestaurant is now handled by a Supabase Edge Function for security
export const updateRestaurant = async (id: number, restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    const dbData = mapRestaurantToDb(restaurantData);
    const { data, error } = await supabase.from('restaurants').update(dbData).eq('id', id).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update restaurant' });
    return mapDbToRestaurant(data);
};

// deleteRestaurant is now handled by a Supabase Edge Function for security
export const deleteRestaurant = async (id: number): Promise<void> => {
    // The actual deletion logic is in the 'delete-restaurant-and-user' Edge Function.
    // This client-side function is now a wrapper for that invocation.
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
    // Do not throw on PGRST116 (no rows), just return null
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
    
    // Find or create category
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
    // Do not throw on PGRST116 (no rows)
    if (orderError && orderError.code !== 'PGRST116') {
      handleSupabaseError({ error: orderError, customMessage: 'Failed to determine category order' });
    }
    const newOrder = (maxOrder?.displayOrder ?? -1) + 1;

    const { data, error } = await supabase.from('menu_categories').insert({ name, restaurantId, displayOrder: newOrder, iconUrl }).select().single();
    
    // Handle race condition where category was created by another request.
    // 23505 is the postgres error code for unique_violation.
    if (error && error.code === '23505') {
        console.warn('Race condition detected when creating category, fetching existing one.', { name, restaurantId });
        const { data: existingCategory, error: fetchError } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurantId', restaurantId)
            .eq('name', name)
            .single();
        
        handleSupabaseError({ error: fetchError, customMessage: 'Failed to fetch category after race condition' });

        if (!existingCategory) {
            // This case is unlikely but possible if the other transaction rolls back. Throw an error.
            throw new Error('Failed to resolve category creation race condition.');
        }
        // Supabase returns a single object from .single(), which matches what we need.
        return { ...existingCategory, items: [], combos: [] };
    }
    
    handleSupabaseError({ error, customMessage: 'Failed to create category' });
    // The insert was successful, data is not null here.
    return { ...data!, items: [], combos: [] };
};

export const updateCategory = async (restaurantId: number, categoryId: number, newName: string, newIconUrl?: string | null): Promise<void> => {
    const payload: { name: string; iconUrl?: string | null } = { name: newName };
    // Only update iconUrl if explicitly provided (or set to null to clear)
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
