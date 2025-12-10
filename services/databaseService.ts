
import { supabase, supabaseAnon, handleSupabaseError } from './api';
import type { Restaurant, MenuCategory, Addon, Promotion, MenuItem, Combo, Coupon, Banner, RestaurantCategory, Expense } from '../types';

// ==============================================================================
// 🔄 NORMALIZADORES (Banco de Dados -> App)
// ==============================================================================

const normalizeRestaurant = (data: any): Restaurant => {
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
        mercado_pago_credentials: data.mercado_pago_credentials,
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
    isDailySpecial: data.is_daily_special,
    isWeeklySpecial: data.is_weekly_special,
    availableDays: data.available_days,
    availableAddonIds: data.available_addon_ids,
    customizationOptions: data.customization_options,
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
    restaurantId: data.restaurant_id,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    targetType: data.target_type,
    targetIds: data.target_ids,
    startDate: data.start_date,
    endDate: data.end_date
});

const normalizeCoupon = (data: any): Coupon => ({
    ...data,
    restaurantId: data.restaurant_id,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    minOrderValue: data.min_order_value,
    expirationDate: data.expiration_date,
    isActive: data.is_active
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


// ==============================================================================
// 🛠️ FUNÇÕES DE SERVIÇO
// ==============================================================================

// --- RESTAURANTS ---

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants' });
    
    return (data || [])
        .map(r => {
            const normalized = normalizeRestaurant(r);
            if (normalized.mercado_pago_credentials) {
                delete normalized.mercado_pago_credentials;
            }
            return normalized;
        });
};

export const fetchRestaurantsSecure = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase.from('restaurants').select('*');
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurants (secure)' });
    return (data || []).map(normalizeRestaurant);
};

export const fetchRestaurantById = async (id: number): Promise<Restaurant> => {
    const { data, error } = await supabaseAnon.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant' });
    if (!data) throw new Error('Restaurant not found');
    
    const normalized = normalizeRestaurant(data);
    if (normalized.mercado_pago_credentials) {
        delete normalized.mercado_pago_credentials;
    }
    return normalized;
};

export const fetchRestaurantByIdSecure = async (id: number): Promise<Restaurant> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    handleSupabaseError({ error, customMessage: 'Failed to fetch restaurant details' });
    if (!data) throw new Error('Restaurant not found');
    return normalizeRestaurant(data);
};

export const updateRestaurant = async (id: number, restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    const payload: any = {};
    if (restaurantData.name !== undefined) payload.name = restaurantData.name;
    if (restaurantData.category !== undefined) payload.category = restaurantData.category;
    if (restaurantData.deliveryTime !== undefined) payload.delivery_time = restaurantData.deliveryTime;
    if (restaurantData.rating !== undefined) payload.rating = restaurantData.rating;
    if (restaurantData.imageUrl !== undefined) payload.image_url = restaurantData.imageUrl;
    if (restaurantData.paymentGateways !== undefined) payload.payment_gateways = restaurantData.paymentGateways;
    if (restaurantData.address !== undefined) payload.address = restaurantData.address;
    if (restaurantData.phone !== undefined) payload.phone = restaurantData.phone;
    if (restaurantData.openingHours !== undefined) payload.opening_hours = restaurantData.openingHours;
    if (restaurantData.closingHours !== undefined) payload.closing_hours = restaurantData.closingHours;
    if (restaurantData.deliveryFee !== undefined) payload.delivery_fee = restaurantData.deliveryFee;
    if (restaurantData.operatingHours !== undefined) payload.operating_hours = restaurantData.operatingHours;
    if (restaurantData.mercado_pago_credentials !== undefined) payload.mercado_pago_credentials = restaurantData.mercado_pago_credentials;
    if (restaurantData.manualPixKey !== undefined) payload.manual_pix_key = restaurantData.manualPixKey;

    const { data, error } = await supabase.from('restaurants').update(payload).eq('id', id).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update restaurant' });
    return normalizeRestaurant(data);
};

export const deleteRestaurant = async (id: number): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-restaurant-and-user', {
        body: { restaurantId: id },
    });

     if (error) {
        console.warn("Edge function failed, falling back to direct SQL delete.", error);
        const { error: dbError } = await supabase.from('restaurants').delete().eq('id', id);
        if (dbError) handleSupabaseError({ error: dbError, customMessage: 'Failed to delete restaurant' });
    }
};

// --- RESTAURANT CATEGORIES ---

export const fetchRestaurantCategories = async (): Promise<RestaurantCategory[]> => {
    const { data, error } = await supabaseAnon.from('restaurant_categories').select('*').order('name');
    if (error) {
         console.warn('Using default categories due to fetch error:', error);
         return [
            { id: 1, name: 'Lanches' }, { id: 2, name: 'Pizza' }, { id: 3, name: 'Japonesa' },
            { id: 4, name: 'Brasileira' }, { id: 5, name: 'Açaí' }
        ];
    }
    return data as RestaurantCategory[];
};

export const createRestaurantCategory = async (name: string): Promise<RestaurantCategory> => {
    const { data, error } = await supabase.from('restaurant_categories').insert({ name }).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create restaurant category' });
    return data;
};

export const deleteRestaurantCategory = async (id: number): Promise<void> => {
    const { error } = await supabase.from('restaurant_categories').delete().eq('id', id);
    handleSupabaseError({ error, customMessage: 'Failed to delete restaurant category' });
};

// --- MENU & ITEMS ---

export const fetchMenuForRestaurant = async (restaurant: Restaurant | number, ignoreDayFilter = false): Promise<MenuCategory[]> => {
    const restaurantId = typeof restaurant === 'number' ? restaurant : restaurant.id;
    
    try {
        // 1. BUSCAR TUDO
        const [categoriesRes, itemsRes, combosRes] = await Promise.all([
            supabaseAnon.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('display_order', { ascending: true }),
            // Order items by display_order, then id as fallback
            supabaseAnon.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('display_order', { ascending: true }).order('id', { ascending: true }),
            supabaseAnon.from('combos').select('*').eq('restaurant_id', restaurantId)
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        if (itemsRes.error) throw itemsRes.error;
        if (combosRes.error) throw combosRes.error;

        const categories = (categoriesRes.data || []).map(normalizeCategory);
        let allItems = (itemsRes.data || []).map(normalizeItem);
        const allCombos = (combosRes.data || []).map(normalizeCombo);

        // --- FILTRO DE EMERGÊNCIA ---
        allItems = allItems.filter(item => {
            const name = item.name.toLowerCase();
            const isGhostItem = name.includes('pastel') && name.includes('bacon') && name.includes('mussarela');
            return !isGhostItem;
        });
        // --------------------------------------------------------

        // 2. AGRUPAR ITENS
        const menuWithItems = categories.map(category => {
            const items = allItems.filter(item => item.categoryId === category.id);
            const combos = allCombos.filter(c => c.categoryId === category.id);
            return { ...category, items, combos };
        });

        // 3. RECUPERAR ÓRFÃOS
        const orphanedItems = allItems.filter(item => !item.categoryId || !categories.some(cat => cat.id === item.categoryId));
        const orphanedCombos = allCombos.filter(c => !c.categoryId || !categories.some(cat => cat.id === c.categoryId));
        
        if (orphanedItems.length > 0 || orphanedCombos.length > 0) {
             menuWithItems.push({
                id: 999999, 
                restaurantId: restaurantId,
                name: 'Itens Gerais / Recuperados', 
                items: orphanedItems,
                combos: orphanedCombos,
                displayOrder: 999
            });
        }

        // 4. FALLBACK
        if (categories.length === 0 && (allItems.length > 0 || allCombos.length > 0)) {
             return [{
                id: 888888,
                restaurantId: restaurantId,
                name: 'Cardápio Geral',
                items: allItems,
                combos: allCombos,
                displayOrder: 1
             }];
        }
        
        const promotions = await fetchPromotionsForRestaurant(restaurantId);
        return applyPromotionsToMenu(menuWithItems, promotions);

    } catch (error: any) {
        console.error('Failed to fetch menu:', error);
        return []; 
    }
};

export const fetchAddonsForRestaurant = async (restaurant: Restaurant | number): Promise<Addon[]> => { const restaurantId = typeof restaurant === 'number' ? restaurant : restaurant.id; try { const { data, error } = await supabaseAnon.from('addons').select('*').eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: "Could not fetch addons" }); return (data || []).map(normalizeAddon); } catch (error: any) { throw new Error(`Failed to fetch addons: ${error.message}`); } };
export const createAddon = async (restaurantId: number, addonData: any): Promise<Addon> => { const payload = { restaurant_id: restaurantId, name: addonData.name, price: addonData.price }; const { data, error } = await supabase.from('addons').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create addon' }); return normalizeAddon(data); };
export const updateAddon = async (restaurantId: number, addonId: number, addonData: any): Promise<Addon> => { const payload = { name: addonData.name, price: addonData.price }; const { data, error } = await supabase.from('addons').update(payload).eq('id', addonId).eq('restaurant_id', restaurantId).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update addon' }); return normalizeAddon(data); };
export const deleteAddon = async (restaurantId: number, addonId: number): Promise<void> => { const { error } = await supabase.from('addons').delete().eq('id', addonId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete addon' }); };
const createCategoryInternal = async (restaurantId: number, name: string) => { const { data: maxOrder } = await supabase.from('menu_categories').select('display_order').eq('restaurant_id', restaurantId).order('display_order', { ascending: false }).limit(1).maybeSingle(); const newOrder = (maxOrder?.display_order ?? -1) + 1; const { data, error } = await supabase.from('menu_categories').insert({ name: name.trim(), restaurant_id: restaurantId, display_order: newOrder }).select('id, name').single(); handleSupabaseError({ error, customMessage: 'Failed to create category internal' }); return data; };

export const createMenuItem = async (restaurantId: number, itemData: any): Promise<MenuItem> => { 
    const { category, ...rest } = itemData; 
    const cleanCategoryName = category.trim(); 
    let categoryId: number | null = null; 
    
    // Find category ID
    const { data: existingCat } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).ilike('name', cleanCategoryName).limit(1).maybeSingle(); 
    if (existingCat) { 
        categoryId = existingCat.id; 
    } else { 
        try { 
            const newCat = await createCategoryInternal(restaurantId, cleanCategoryName); 
            categoryId = newCat.id; 
        } catch (err: any) { 
            console.warn("Retrying category fetch...", err); 
            const { data: retryCat } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).ilike('name', cleanCategoryName).limit(1).maybeSingle(); 
            if (retryCat) categoryId = retryCat.id; 
        } 
    } 

    // Find next display order for items in this category
    const { data: maxItemOrder } = await supabase
        .from('menu_items')
        .select('display_order')
        .eq('restaurant_id', restaurantId)
        .eq('category_id', categoryId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    const newDisplayOrder = (maxItemOrder?.display_order ?? -1) + 1;

    const payload = { 
        restaurant_id: restaurantId, 
        category_id: categoryId, 
        name: rest.name, 
        description: rest.description, 
        price: rest.price, 
        original_price: rest.originalPrice, 
        image_url: rest.imageUrl, 
        is_pizza: rest.isPizza, 
        is_acai: rest.isAcai, 
        is_marmita: rest.isMarmita, 
        marmita_options: rest.marmitaOptions, 
        is_daily_special: rest.isDailySpecial, 
        is_weekly_special: rest.isWeeklySpecial, 
        available_days: rest.availableDays, 
        sizes: rest.sizes, 
        available_addon_ids: rest.availableAddonIds, 
        customization_options: rest.customizationOptions,
        display_order: newDisplayOrder 
    }; 
    
    const { data, error } = await supabase.from('menu_items').insert(payload).select().single(); 
    handleSupabaseError({ error, customMessage: 'Failed to create menu item' }); 
    return normalizeItem(data); 
};

export const updateMenuItem = async (restaurantId: number, itemId: number, itemData: any): Promise<MenuItem> => { const payload: any = {}; if (itemData.name) payload.name = itemData.name; if (itemData.description) payload.description = itemData.description; if (itemData.price) payload.price = itemData.price; if (itemData.originalPrice !== undefined) payload.original_price = itemData.originalPrice; if (itemData.imageUrl) payload.image_url = itemData.imageUrl; if (itemData.isPizza !== undefined) payload.is_pizza = itemData.isPizza; if (itemData.isAcai !== undefined) payload.is_acai = itemData.isAcai; if (itemData.isMarmita !== undefined) payload.is_marmita = itemData.isMarmita; if (itemData.marmitaOptions) payload.marmita_options = itemData.marmitaOptions; if (itemData.isDailySpecial !== undefined) payload.is_daily_special = itemData.isDailySpecial; if (itemData.isWeeklySpecial !== undefined) payload.is_weekly_special = itemData.isWeeklySpecial; if (itemData.availableDays) payload.available_days = itemData.availableDays; if (itemData.sizes) payload.sizes = itemData.sizes; if (itemData.availableAddonIds) payload.available_addon_ids = itemData.availableAddonIds; if (itemData.customizationOptions) payload.customization_options = itemData.customizationOptions; if (itemData.category) { const cleanCategoryName = itemData.category.trim(); let catId: number | null = null; const { data: existingCat } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).ilike('name', cleanCategoryName).limit(1).maybeSingle(); if (existingCat) { catId = existingCat.id; } else { try { const newCat = await createCategoryInternal(restaurantId, cleanCategoryName); catId = newCat.id; } catch (err) { const { data: retryCat } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurantId).ilike('name', cleanCategoryName).limit(1).maybeSingle(); if (retryCat) catId = retryCat.id; } } if (catId) payload.category_id = catId; } const { data, error } = await supabase.from('menu_items').update(payload).eq('id', itemId).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update menu item' }); return normalizeItem(data); };
export const deleteMenuItem = async (restaurantId: number, itemId: number): Promise<void> => { const { error } = await supabase.from('menu_items').delete().eq('id', itemId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete menu item' }); };
export const createCategory = async (restaurantId: number, name: string, iconUrl?: string | null): Promise<MenuCategory> => { const { data: maxOrder } = await supabase.from('menu_categories').select('display_order').eq('restaurant_id', restaurantId).order('display_order', { ascending: false }).limit(1).maybeSingle(); const newOrder = (maxOrder?.display_order ?? -1) + 1; const payload = { name: name.trim(), restaurant_id: restaurantId, display_order: newOrder, icon_url: iconUrl }; const { data, error } = await supabase.from('menu_categories').insert(payload).select().single(); if (error && error.code === '23505') { const { data: existing } = await supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).ilike('name', name.trim()).maybeSingle(); if (existing) return { ...normalizeCategory(existing), items: [], combos: [] }; } handleSupabaseError({ error, customMessage: 'Failed to create category' }); return { ...normalizeCategory(data), items: [], combos: [] }; };
export const updateCategory = async (restaurantId: number, categoryId: number, newName: string, newIconUrl?: string | null): Promise<void> => { const payload: any = { name: newName.trim() }; if (newIconUrl !== undefined) payload.icon_url = newIconUrl; const { error } = await supabase.from('menu_categories').update(payload).eq('id', categoryId); handleSupabaseError({ error, customMessage: 'Failed to update category' }); };
export const deleteCategory = async (restaurantId: number, name: string): Promise<void> => { const { error } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId).eq('name', name); handleSupabaseError({ error, customMessage: 'Failed to delete category' }); };

// Reordering Functions
export const updateCategoryOrder = async (restaurantId: number, categories: MenuCategory[]): Promise<void> => { 
    const updates = categories.map((category, index) => ({ 
        id: category.id, 
        display_order: index, 
        restaurant_id: restaurantId,
        name: category.name // Included to satisfy potential constraints, though not updated
    })); 
    // Uses upsert with onConflict on 'id' to act as an update
    const { error } = await supabase.from('menu_categories').upsert(updates, { onConflict: 'id' }); 
    handleSupabaseError({ error, customMessage: 'Failed to update category order' }); 
};

export const updateMenuItemOrder = async (restaurantId: number, items: MenuItem[]): Promise<void> => {
    const updates = items.map((item, index) => ({
        id: item.id,
        display_order: index,
        restaurant_id: restaurantId,
        // Include required fields to ensure upsert works smoothly even if logic tries to validate inputs
        name: item.name, 
        price: item.price,
        category_id: item.categoryId
    }));
    // Uses upsert with onConflict on 'id' to act as an update
    const { error } = await supabase.from('menu_items').upsert(updates, { onConflict: 'id' });
    handleSupabaseError({ error, customMessage: 'Failed to update item order' });
};

export const createCombo = async (restaurantId: number, comboData: any): Promise<Combo> => { const payload = { restaurant_id: restaurantId, name: comboData.name, description: comboData.description, price: comboData.price, image_url: comboData.imageUrl, menu_item_ids: comboData.menuItemIds }; const { data, error } = await supabase.from('combos').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create combo' }); return normalizeCombo(data); };
export const updateCombo = async (restaurantId: number, comboId: number, comboData: any): Promise<Combo> => { const payload: any = {}; if (comboData.name) payload.name = comboData.name; if (comboData.description) payload.description = comboData.description; if (comboData.price) payload.price = comboData.price; if (comboData.imageUrl) payload.image_url = comboData.imageUrl; if (comboData.menuItemIds) payload.menu_item_ids = comboData.menuItemIds; const { data, error } = await supabase.from('combos').update(payload).eq('id', comboId).eq('restaurant_id', restaurantId).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update combo' }); return normalizeCombo(data); };
export const deleteCombo = async (restaurantId: number, comboId: number): Promise<void> => { const { error } = await supabase.from('combos').delete().eq('id', comboId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete combo' }); };
export const fetchPromotionsForRestaurant = async (restaurantId: number): Promise<Promotion[]> => { const { data, error } = await supabaseAnon.from('promotions').select('*').eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to fetch promotions' }); return (data || []).map(normalizePromotion); };
export const createPromotion = async (restaurantId: number, promoData: any): Promise<Promotion> => { const payload = { restaurant_id: restaurantId, name: promoData.name, description: promoData.description, discount_type: promoData.discountType, discount_value: promoData.discountValue, target_type: promoData.targetType, target_ids: promoData.targetIds, start_date: promoData.startDate, end_date: promoData.endDate }; const { data, error } = await supabase.from('promotions').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create promotion' }); return normalizePromotion(data); };
export const updatePromotion = async (restaurantId: number, promoId: number, promoData: any): Promise<Promotion> => { const payload: any = {}; if (promoData.name) payload.name = promoData.name; if (promoData.description) payload.description = promoData.description; if (promoData.discountType) payload.discount_type = promoData.discountType; if (promoData.discountValue) payload.discount_value = promoData.discountValue; if (promoData.targetType) payload.target_type = promoData.targetType; if (promoData.targetIds) payload.target_ids = promoData.targetIds; if (promoData.startDate) payload.start_date = promoData.startDate; if (promoData.endDate) payload.end_date = promoData.endDate; const { data, error } = await supabase.from('promotions').update(payload).eq('id', promoId).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update promotion' }); return normalizePromotion(data); };
export const deletePromotion = async (restaurantId: number, promoId: number): Promise<void> => { const { error } = await supabase.from('promotions').delete().eq('id', promoId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete promotion' }); };
export const fetchCouponsForRestaurant = async (restaurantId: number): Promise<Coupon[]> => { const { data, error } = await supabaseAnon.from('coupons').select('*').eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to fetch coupons' }); return (data || []).map(normalizeCoupon); };
export const createCoupon = async (restaurantId: number, couponData: any): Promise<Coupon> => { const payload = { restaurant_id: restaurantId, code: couponData.code.toUpperCase(), description: couponData.description, discount_type: couponData.discountType, discount_value: couponData.discountValue, min_order_value: couponData.minOrderValue, expiration_date: couponData.expirationDate, is_active: couponData.isActive }; const { data, error } = await supabase.from('coupons').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create coupon' }); return normalizeCoupon(data); };
export const updateCoupon = async (restaurantId: number, couponId: number, couponData: any): Promise<Coupon> => { const payload: any = {}; if (couponData.code) payload.code = couponData.code.toUpperCase(); if (couponData.description) payload.description = couponData.description; if (couponData.discountType) payload.discount_type = couponData.discountType; if (couponData.discountValue) payload.discount_value = couponData.discountValue; if (couponData.minOrderValue !== undefined) payload.min_order_value = couponData.minOrderValue; if (couponData.expirationDate) payload.expiration_date = couponData.expirationDate; if (couponData.isActive !== undefined) payload.is_active = couponData.isActive; const { data, error } = await supabase.from('coupons').update(payload).eq('id', couponId).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update coupon' }); return normalizeCoupon(data); };
export const deleteCoupon = async (restaurantId: number, couponId: number): Promise<void> => { const { error } = await supabase.from('coupons').delete().eq('id', couponId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete coupon' }); };
export const validateCouponByCode = async (code: string, restaurantId: number): Promise<Coupon | null> => { const { data, error } = await supabaseAnon.from('coupons').select('*').eq('code', code.toUpperCase()).eq('restaurant_id', restaurantId).single(); if (error && error.code !== 'PGRST116') { handleSupabaseError({ error, customMessage: 'Failed to validate coupon' }); } return data ? normalizeCoupon(data) : null; };
export const fetchExpenses = async (restaurantId: number): Promise<Expense[]> => { const { data, error } = await supabase.from('expenses').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false }); handleSupabaseError({ error, customMessage: 'Failed to fetch expenses' }); return (data || []).map(normalizeExpense); };
export const createExpense = async (restaurantId: number, expenseData: Omit<Expense, 'id' | 'restaurantId'>): Promise<Expense> => { const payload = { restaurant_id: restaurantId, description: expenseData.description, amount: expenseData.amount, category: expenseData.category, date: expenseData.date }; const { data, error } = await supabase.from('expenses').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create expense' }); return normalizeExpense(data); };
export const deleteExpense = async (restaurantId: number, expenseId: number): Promise<void> => { const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('restaurant_id', restaurantId); handleSupabaseError({ error, customMessage: 'Failed to delete expense' }); };
export const fetchBanners = async (): Promise<Banner[]> => { const { data, error } = await supabase.from('banners').select('*').order('id', { ascending: false }); if (error) { console.warn("Error fetching banners:", error); return []; } return (data || []).map(normalizeBanner); };
export const fetchActiveBanners = async (): Promise<Banner[]> => { const { data, error } = await supabaseAnon.from('banners').select('*').eq('active', true); if (error) return []; return (data || []).map(normalizeBanner); };
export const createBanner = async (bannerData: any): Promise<Banner> => { const payload = { title: bannerData.title, description: bannerData.description, image_url: bannerData.imageUrl, cta_text: bannerData.ctaText, target_type: bannerData.targetType, target_value: bannerData.targetValue, active: bannerData.active }; const { data, error } = await supabase.from('banners').insert(payload).select().single(); handleSupabaseError({ error, customMessage: 'Failed to create banner' }); return normalizeBanner(data); };
export const updateBanner = async (id: number, bannerData: any): Promise<Banner> => { const payload: any = {}; if (bannerData.title) payload.title = bannerData.title; if (bannerData.description) payload.description = bannerData.description; if (bannerData.imageUrl) payload.image_url = bannerData.imageUrl; if (bannerData.ctaText) payload.cta_text = bannerData.ctaText; if (bannerData.targetType) payload.target_type = bannerData.targetType; if (bannerData.targetValue) payload.target_value = bannerData.targetValue; if (bannerData.active !== undefined) payload.active = bannerData.active; const { data, error } = await supabase.from('banners').update(payload).eq('id', id).select().single(); handleSupabaseError({ error, customMessage: 'Failed to update banner' }); return normalizeBanner(data); };
export const deleteBanner = async (id: number): Promise<void> => { const { error } = await supabase.from('banners').delete().eq('id', id); handleSupabaseError({ error, customMessage: 'Failed to delete banner' }); };

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
        const categoryPromo = activePromotions.find(p => p.targetType === 'CATEGORY' && p.targetIds.includes(category.name));

        return {
            ...category,
            items: category.items.map(item => {
                const itemPromo = activePromotions.find(p => p.targetType === 'ITEM' && p.targetIds.includes(item.id));
                const promo = itemPromo || categoryPromo;
                return promo ? applyPromotion(item, promo) : item;
            }),
            combos: category.combos?.map(combo => {
                 const comboPromo = activePromotions.find(p => p.targetType === 'COMBO' && p.targetIds.includes(combo.id));
                 const promo = comboPromo || categoryPromo;
                return promo ? applyPromotion(combo, promo) : combo;
            }),
        };
    });
};
