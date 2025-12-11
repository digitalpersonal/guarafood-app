
import { supabase, handleSupabaseError } from './api';
import type { Restaurant, MenuCategory, Addon, Promotion, MenuItem, Combo, Coupon, Banner, RestaurantCategory, Expense } from '../types';

// ==============================================================================
// 🔄 NORMALIZADORES (Banco de Dados -> App)
// ==============================================================================

// Normalizer for public views (Masks sensitive data)
const normalizeRestaurant = (data: any): Restaurant => {
    if (!data) return data;
    const hasMpToken = !!data.mercado_pago_credentials?.accessToken;
    return {
        id: data.id,
        name: data.name,
        category: data.category,
        description: data.description,
        deliveryTime: data.delivery_time,
        rating: data.rating,
        imageUrl: data.image_url,
        paymentGateways: data.payment_gateways || [],
        address: data.address,
        phone: data.phone,
        openingHours: data.opening_hours,
        closingHours: data.closing_hours,
        deliveryFee: data.delivery_fee,
        operatingHours: data.operating_hours,
        // Mask the token for public view, but indicate it exists
        mercado_pago_credentials: { accessToken: hasMpToken ? "PROTECTED" : "" },
        manualPixKey: data.manual_pix_key,
        hasPixConfigured: hasMpToken || (!!data.manual_pix_key)
    };
};

// Normalizer for Admin/Settings (Keeps sensitive data)
const normalizeRestaurantSecure = (data: any): Restaurant => {
    if (!data) return data;
    return {
        id: data.id,
        name: data.name,
        category: data.category,
        description: data.description,
        deliveryTime: data.delivery_time,
        rating: data.rating,
        imageUrl: data.image_url,
        paymentGateways: data.payment_gateways || [],
        address: data.address,
        phone: data.phone,
        openingHours: data.opening_hours,
        closingHours: data.closing_hours,
        deliveryFee: data.delivery_fee,
        operatingHours: data.operating_hours,
        mercado_pago_credentials: data.mercado_pago_credentials || { accessToken: '' },
        manualPixKey: data.manual_pix_key,
        hasPixConfigured: (!!data.mercado_pago_credentials?.accessToken) || (!!data.manual_pix_key)
    };
};

const normalizeCategory = (data: any): MenuCategory => ({
    ...data,
    restaurantId: data.restaurant_id,
    displayOrder: data.display_order,
    iconUrl: data.icon_url
});

const normalizeItem = (data: any): MenuItem => ({
    ...data,
    restaurantId: data.restaurant_id,
    categoryId: data.category_id,
    imageUrl: data.image_url,
    originalPrice: data.original_price,
    isPizza: data.is_pizza,
    isAcai: data.is_acai,
    isMarmita: data.is_marmita,
    marmitaOptions: data.marmita_options,
    freeAddonCount: data.free_addon_count,
    availableAddonIds: data.available_addon_ids,
    isDailySpecial: data.is_daily_special,
    isWeeklySpecial: data.is_weekly_special,
    availableDays: data.available_days,
    displayOrder: data.display_order
});

const normalizeCombo = (data: any): Combo => ({
    ...data,
    restaurantId: data.restaurant_id,
    categoryId: data.category_id,
    imageUrl: data.image_url,
    originalPrice: data.original_price,
    menuItemIds: data.menu_item_ids
});

const normalizeAddon = (data: any): Addon => ({
    ...data,
    restaurantId: data.restaurant_id
});

const normalizePromotion = (data: any): Promotion => ({
    ...data,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    targetType: data.target_type,
    targetIds: data.target_ids,
    startDate: data.start_date,
    endDate: data.end_date,
    restaurantId: data.restaurant_id
});

const normalizeCoupon = (data: any): Coupon => ({
    ...data,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    minOrderValue: data.min_order_value,
    expirationDate: data.expiration_date,
    isActive: data.is_active,
    restaurantId: data.restaurant_id
});

const normalizeBanner = (data: any): Banner => ({
    ...data,
    imageUrl: data.image_url,
    ctaText: data.cta_text,
    targetType: data.target_type,
    targetValue: data.target_value
});

const normalizeExpense = (data: any): Expense => ({
    ...data,
    restaurantId: data.restaurant_id
});

const normalizeRestaurantCategory = (data: any): RestaurantCategory => data;

// ==============================================================================
// 🏢 RESTAURANTS
// ==============================================================================

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants' });
    return (data || []).map(normalizeRestaurant);
};

// Admin version - sees secrets
export const fetchRestaurantsSecure = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants (secure)' });
    return (data || []).map(normalizeRestaurantSecure);
};

export const fetchRestaurantById = async (id: number): Promise<Restaurant | null> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant' });
    return data ? normalizeRestaurant(data) : null;
};

// Owner/Admin version - sees secrets
export const fetchRestaurantByIdSecure = async (id: number): Promise<Restaurant | null> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant details' });
    return data ? normalizeRestaurantSecure(data) : null;
};

export const updateRestaurant = async (id: number, updates: Partial<Restaurant>): Promise<Restaurant> => {
    // Map camelCase to snake_case for DB
    const dbUpdates: any = { ...updates };
    
    if (updates.deliveryTime) dbUpdates.delivery_time = updates.deliveryTime;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.paymentGateways) dbUpdates.payment_gateways = updates.paymentGateways;
    if (updates.openingHours) dbUpdates.opening_hours = updates.openingHours;
    if (updates.closingHours) dbUpdates.closing_hours = updates.closingHours;
    if (updates.deliveryFee) dbUpdates.delivery_fee = updates.deliveryFee;
    if (updates.mercado_pago_credentials) dbUpdates.mercado_pago_credentials = updates.mercado_pago_credentials;
    if (updates.operatingHours) dbUpdates.operating_hours = updates.operatingHours;
    if (updates.manualPixKey) dbUpdates.manual_pix_key = updates.manualPixKey;

    // Remove camelCase keys to avoid errors if strict mode
    delete dbUpdates.deliveryTime;
    delete dbUpdates.imageUrl;
    delete dbUpdates.paymentGateways;
    delete dbUpdates.openingHours;
    delete dbUpdates.closingHours;
    delete dbUpdates.deliveryFee;
    delete dbUpdates.operatingHours;
    delete dbUpdates.manualPixKey;
    delete dbUpdates.hasPixConfigured;

    const { data, error } = await supabase
        .from('restaurants')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error && error.code === '42501') {
         throw new Error("Permissão negada. Você não é o dono deste restaurante ou seu login expirou.");
    }

    handleSupabaseError({ error, customMessage: 'Failed to update restaurant' });
    return normalizeRestaurantSecure(data);
};

export const deleteRestaurant = async (id: number): Promise<void> => {
    // Note: We use the Edge Function for this usually to cleanup users, but direct DB delete works if Cascade is set
    const { error } = await supabase.functions.invoke('delete-restaurant-and-user', {
        body: { restaurantId: id }
    });
    
    if (error) {
        // Fallback to direct DB delete if function fails
        const { error: dbError } = await supabase.from('restaurants').delete().eq('id', id);
        handleSupabaseError({ error: dbError, customMessage: 'Failed to delete restaurant' });
    }
};

// ==============================================================================
// 📂 RESTAURANT CATEGORIES
// ==============================================================================

export const fetchRestaurantCategories = async (): Promise<RestaurantCategory[]> => {
    const { data, error } = await supabase.from('restaurant_categories').select('*').order('name');
    handleSupabaseError({ error, customMessage: 'Failed to fetch categories' });
    return (data || []).map(normalizeRestaurantCategory);
};

export const createRestaurantCategory = async (name: string): Promise<void> => {
    const { error } = await supabase.from('restaurant_categories').insert({ name });
    handleSupabaseError({ error, customMessage: 'Failed to create category' });
};

export const deleteRestaurantCategory = async (id: number): Promise<void> => {
    const { error } = await supabase.from('restaurant_categories').delete().eq('id', id);
    handleSupabaseError({ error, customMessage: 'Failed to delete category' });
};

// ==============================================================================
// 🖼️ BANNERS
// ==============================================================================

export const fetchBanners = async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from('banners').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch banners' });
    return (data || []).map(normalizeBanner);
};

export const fetchActiveBanners = async (): Promise<Banner[]> => {
    const { data, error } = await supabase.from('banners').select('*').eq('active', true);
    handleSupabaseError({ error, customMessage: 'Failed to fetch active banners' });
    return (data || []).map(normalizeBanner);
};

export const createBanner = async (banner: Omit<Banner, 'id'>): Promise<Banner> => {
    const payload = {
        title: banner.title,
        description: banner.description,
        image_url: banner.imageUrl,
        cta_text: banner.ctaText,
        target_type: banner.targetType,
        target_value: banner.targetValue,
        active: banner.active
    };
    const { data, error } = await supabase.from('banners').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create banner' });
    return normalizeBanner(data);
};

export const updateBanner = async (id: number, banner: Partial<Banner>): Promise<Banner> => {
    const payload: any = { ...banner };
    if (banner.imageUrl) payload.image_url = banner.imageUrl;
    if (banner.ctaText) payload.cta_text = banner.ctaText;
    if (banner.targetType) payload.target_type = banner.targetType;
    if (banner.targetValue) payload.target_value = banner.targetValue;
    
    delete payload.imageUrl;
    delete payload.ctaText;
    delete payload.targetType;
    delete payload.targetValue;

    const { data, error } = await supabase.from('banners').update(payload).eq('id', id).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update banner' });
    return normalizeBanner(data);
};

export const deleteBanner = async (id: number): Promise<void> => {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    handleSupabaseError({ error, customMessage: 'Failed to delete banner' });
};

// ==============================================================================
// 🍔 MENU MANAGEMENT
// ==============================================================================

export const fetchMenuForRestaurant = async (restaurantId: number, ignoreDayFilter = false): Promise<MenuCategory[]> => {
    // 1. Fetch Categories
    const { data: categoriesData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true });
    
    handleSupabaseError({ error: catError, customMessage: 'Failed to fetch menu categories' });

    // 2. Fetch Items
    const { data: itemsData, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true });

    handleSupabaseError({ error: itemError, customMessage: 'Failed to fetch menu items' });

    // 3. Fetch Combos
    const { data: combosData, error: comboError } = await supabase
        .from('combos')
        .select('*')
        .eq('restaurant_id', restaurantId);

    handleSupabaseError({ error: comboError, customMessage: 'Failed to fetch combos' });

    // 4. Fetch Active Promotions
    const today = new Date().toISOString();
    const { data: promosData, error: promoError } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .lte('start_date', today)
        .gte('end_date', today);

    // Don't throw on promo error, just log (table might not exist yet)
    if (promoError) console.warn("Could not fetch promotions:", promoError);

    const promotions = (promosData || []).map(normalizePromotion);
    const todayIndex = new Date().getDay();

    // 5. Structure Data
    const categories: MenuCategory[] = (categoriesData || []).map(normalizeCategory).map(category => {
        // Filter items for this category
        let items = (itemsData || [])
            .map(normalizeItem)
            .filter(item => item.categoryId === category.id);

        // Filter by availability (unless ignoring, e.g. for admin editor)
        if (!ignoreDayFilter) {
            items = items.filter(item => 
                !item.availableDays || 
                item.availableDays.length === 0 || 
                item.availableDays.includes(todayIndex)
            );
        }

        // Apply Promotions to Items
        items = items.map(item => {
            const activePromo = promotions.find(p => p.targetType === 'ITEM' && p.targetIds.includes(item.id));
            if (activePromo) {
                let newPrice = item.price;
                if (activePromo.discountType === 'PERCENTAGE') {
                    newPrice = item.price * (1 - activePromo.discountValue / 100);
                } else {
                    newPrice = Math.max(0, item.price - activePromo.discountValue);
                }
                return { ...item, price: newPrice, originalPrice: item.price, activePromotion: activePromo };
            }
            return item;
        });

        // Filter combos for this category
        let categoryCombos = (combosData || [])
            .map(normalizeCombo)
            .filter(combo => combo.categoryId === category.id);

        // Apply Promotions to Combos
        categoryCombos = categoryCombos.map(combo => {
             const activePromo = promotions.find(p => p.targetType === 'COMBO' && p.targetIds.includes(combo.id));
             if (activePromo) {
                let newPrice = combo.price;
                if (activePromo.discountType === 'PERCENTAGE') {
                    newPrice = combo.price * (1 - activePromo.discountValue / 100);
                } else {
                    newPrice = Math.max(0, combo.price - activePromo.discountValue);
                }
                return { ...combo, price: newPrice, originalPrice: combo.price, activePromotion: activePromo };
            }
            return combo;
        });

        return {
            ...category,
            items,
            combos: categoryCombos
        };
    });

    return categories;
};

// --- CRUD OPERATIONS (Simplified for brevity, following same patterns) ---

export const createCategory = async (restaurantId: number, name: string): Promise<void> => {
    const { error } = await supabase.from('menu_categories').insert({ restaurant_id: restaurantId, name });
    handleSupabaseError({ error, customMessage: 'Failed to create category' });
};

export const updateCategory = async (restaurantId: number, id: number, name: string, iconUrl?: string | null): Promise<void> => {
    const { error } = await supabase
        .from('menu_categories')
        .update({ name, icon_url: iconUrl })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update category' });
};

export const deleteCategory = async (restaurantId: number, name: string): Promise<void> => {
    const { error } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId).eq('name', name);
    handleSupabaseError({ error, customMessage: 'Failed to delete category' });
};

export const updateCategoryOrder = async (restaurantId: number, categories: MenuCategory[]): Promise<void> => {
    const updates = categories.map((cat, index) => ({
        id: cat.id,
        restaurant_id: restaurantId,
        display_order: index
    }));
    const { error } = await supabase.from('menu_categories').upsert(updates);
    handleSupabaseError({ error, customMessage: 'Failed to update category order' });
};

export const createMenuItem = async (restaurantId: number, item: any): Promise<void> => {
    // First find category ID
    const { data: catData } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).eq('name', item.category).single();
    if (!catData) throw new Error(`Categoria ${item.category} não encontrada.`);

    const payload = {
        restaurant_id: restaurantId,
        category_id: catData.id,
        name: item.name,
        description: item.description,
        price: item.price,
        original_price: item.originalPrice,
        image_url: item.imageUrl,
        is_pizza: item.isPizza,
        is_acai: item.isAcai,
        is_marmita: item.isMarmita,
        marmita_options: item.marmitaOptions,
        available_addon_ids: item.availableAddonIds,
        sizes: item.sizes,
        is_daily_special: item.isDailySpecial,
        is_weekly_special: item.isWeeklySpecial,
        available_days: item.availableDays
    };
    const { error } = await supabase.from('menu_items').insert(payload);
    handleSupabaseError({ error, customMessage: 'Failed to create item' });
};

export const updateMenuItem = async (restaurantId: number, id: number, item: any): Promise<void> => {
    const { data: catData } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).eq('name', item.category).single();
    if (!catData) throw new Error(`Categoria ${item.category} não encontrada.`);

    const payload = {
        category_id: catData.id,
        name: item.name,
        description: item.description,
        price: item.price,
        original_price: item.originalPrice,
        image_url: item.imageUrl,
        is_pizza: item.isPizza,
        is_acai: item.isAcai,
        is_marmita: item.isMarmita,
        marmita_options: item.marmitaOptions,
        available_addon_ids: item.availableAddonIds,
        sizes: item.sizes,
        is_daily_special: item.isDailySpecial,
        is_weekly_special: item.isWeeklySpecial,
        available_days: item.availableDays
    };
    const { error } = await supabase.from('menu_items').update(payload).eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update item' });
};

export const deleteMenuItem = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete item' });
};

export const updateMenuItemOrder = async (restaurantId: number, items: MenuItem[]): Promise<void> => {
    const updates = items.map((item, index) => ({
        id: item.id,
        restaurant_id: restaurantId,
        display_order: index
    }));
    // Note: Upsert needs all required fields, but partial update might work if conflict resolution is set. 
    // Safer to just update individual fields if upsert fails on missing constraints.
    // For now assuming upsert works with ID.
    const { error } = await supabase.from('menu_items').upsert(updates, { onConflict: 'id' });
    handleSupabaseError({ error, customMessage: 'Failed to reorder items' });
};

// --- ADDONS ---
export const fetchAddonsForRestaurant = async (restaurantId: number): Promise<Addon[]> => {
    const { data, error } = await supabase.from('addons').select('*').eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to fetch addons' });
    return (data || []).map(normalizeAddon);
};

export const createAddon = async (restaurantId: number, addon: Partial<Addon>): Promise<void> => {
    const { error } = await supabase.from('addons').insert({ ...addon, restaurant_id: restaurantId });
    handleSupabaseError({ error, customMessage: 'Failed to create addon' });
};

export const updateAddon = async (restaurantId: number, id: number, addon: Partial<Addon>): Promise<void> => {
    const { error } = await supabase.from('addons').update(addon).eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update addon' });
};

export const deleteAddon = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('addons').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete addon' });
};

// --- COMBOS ---
export const createCombo = async (restaurantId: number, combo: any): Promise<void> => {
    const payload = {
        restaurant_id: restaurantId,
        name: combo.name,
        description: combo.description,
        price: combo.price,
        image_url: combo.imageUrl,
        menu_item_ids: combo.menuItemIds
    };
    const { error } = await supabase.from('combos').insert(payload);
    handleSupabaseError({ error, customMessage: 'Failed to create combo' });
};

export const updateCombo = async (restaurantId: number, id: number, combo: any): Promise<void> => {
    const payload = {
        name: combo.name,
        description: combo.description,
        price: combo.price,
        image_url: combo.imageUrl,
        menu_item_ids: combo.menuItemIds
    };
    const { error } = await supabase.from('combos').update(payload).eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update combo' });
};

export const deleteCombo = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('combos').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete combo' });
};

// --- PROMOTIONS ---
export const fetchPromotionsForRestaurant = async (restaurantId: number): Promise<Promotion[]> => {
    const { data, error } = await supabase.from('promotions').select('*').eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to fetch promotions', tableName: 'promotions' });
    return (data || []).map(normalizePromotion);
};

export const createPromotion = async (restaurantId: number, promo: any): Promise<void> => {
    const payload = {
        restaurant_id: restaurantId,
        name: promo.name,
        description: promo.description,
        discount_type: promo.discountType,
        discount_value: promo.discountValue,
        target_type: promo.targetType,
        target_ids: promo.targetIds,
        start_date: promo.startDate,
        end_date: promo.endDate
    };
    const { error } = await supabase.from('promotions').insert(payload);
    handleSupabaseError({ error, customMessage: 'Failed to create promotion' });
};

export const updatePromotion = async (restaurantId: number, id: number, promo: any): Promise<void> => {
    const payload = {
        name: promo.name,
        description: promo.description,
        discount_type: promo.discountType,
        discount_value: promo.discountValue,
        target_type: promo.targetType,
        target_ids: promo.targetIds,
        start_date: promo.startDate,
        end_date: promo.endDate
    };
    const { error } = await supabase.from('promotions').update(payload).eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update promotion' });
};

export const deletePromotion = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('promotions').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete promotion' });
};

// --- COUPONS ---
export const fetchCouponsForRestaurant = async (restaurantId: number): Promise<Coupon[]> => {
    const { data, error } = await supabase.from('coupons').select('*').eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to fetch coupons' });
    return (data || []).map(normalizeCoupon);
};

export const validateCouponByCode = async (code: string, restaurantId: number): Promise<Coupon | null> => {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('restaurant_id', restaurantId)
        .single();
    
    if (error || !data) return null;
    return normalizeCoupon(data);
};

export const createCoupon = async (restaurantId: number, coupon: any): Promise<void> => {
    const payload = {
        restaurant_id: restaurantId,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_order_value: coupon.minOrderValue,
        expiration_date: coupon.expirationDate,
        is_active: coupon.isActive
    };
    const { error } = await supabase.from('coupons').insert(payload);
    handleSupabaseError({ error, customMessage: 'Failed to create coupon' });
};

export const updateCoupon = async (restaurantId: number, id: number, coupon: any): Promise<void> => {
    const payload = {
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_order_value: coupon.minOrderValue,
        expiration_date: coupon.expirationDate,
        is_active: coupon.isActive
    };
    const { error } = await supabase.from('coupons').update(payload).eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to update coupon' });
};

export const deleteCoupon = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('coupons').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete coupon' });
};

// --- EXPENSES ---
export const fetchExpenses = async (restaurantId: number): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false });
    handleSupabaseError({ error, customMessage: 'Failed to fetch expenses' });
    return (data || []).map(normalizeExpense);
};

export const createExpense = async (restaurantId: number, expense: Omit<Expense, 'id' | 'restaurantId'>): Promise<Expense> => {
    const payload = {
        restaurant_id: restaurantId,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
    };
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create expense' });
    return normalizeExpense(data);
};

export const deleteExpense = async (restaurantId: number, id: number): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('restaurant_id', restaurantId);
    handleSupabaseError({ error, customMessage: 'Failed to delete expense' });
};
