
import type { Order, OrderStatus, CartItem } from '../types';
import { supabase, handleSupabaseError } from './api';

// Mapeia do Banco (snake_case) para o App (camelCase)
const normalizeOrder = (data: any): Order => {
    const wantsSachets = data.customer_address?.wantsSachets === true;

    return {
        id: data.id,
        order_number: data.order_number, 
        timestamp: data.timestamp || data.created_at,
        status: data.status,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerAddress: data.customer_address,
        wantsSachets: wantsSachets,
        items: data.items,
        totalPrice: data.total_price,
        restaurantId: data.restaurant_id,
        restaurantName: data.restaurant_name,
        restaurantAddress: data.restaurant_address,
        restaurantPhone: data.restaurant_phone,
        paymentMethod: data.payment_method,
        couponCode: data.coupon_code,
        discountAmount: data.discount_amount,
        subtotal: data.subtotal,
        deliveryFee: data.delivery_fee,
        payment_id: data.payment_id,
        payment_details: data.payment_details,
        paymentStatus: data.payment_status || (data.payment_method === 'Marcar na minha conta' ? 'pending' : 'paid')
    };
};

export const subscribeToOrders = (
    callback: (orders: Order[]) => void, 
    restaurantId?: number,
    onStatusChange?: (status: string) => void
): (() => void) => {
    let isMounted = true;

    const refreshData = async () => {
        if (!isMounted) return;
        try {
            const orders = await fetchOrders(restaurantId, { limit: 200 });
            if (isMounted) callback(orders);
        } catch (e) {
            console.error("Erro ao atualizar pedidos via polling:", e);
        }
    };

    // Canal Estático para estabilidade
    const channelName = restaurantId ? `orders_store_${restaurantId}` : `orders_global_admin`;
    
    // Garantir que não existam múltiplos canais pendentes para o mesmo recurso
    const existingChannels = supabase.getChannels().filter(ch => ch.name === channelName);
    existingChannels.forEach(ch => supabase.removeChannel(ch));

    const channel = supabase.channel(channelName)
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'orders', 
                filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined 
            },
            () => {
                // Atualização imediata ao detectar mudança
                refreshData();
            }
        )
        .subscribe((status) => {
            if (isMounted && onStatusChange) {
                onStatusChange(status);
            }
        });

    // Carga inicial rápida
    refreshData();

    return () => {
        isMounted = false;
        supabase.removeChannel(channel);
    };
};

export const fetchOrders = async (restaurantId?: number, options?: { limit?: number }): Promise<Order[]> => {
    let query = supabase.from('orders').select('*');
    if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
    }
    
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) {
        handleSupabaseError({ error, customMessage: 'Failed to fetch orders' });
        return [];
    }
    
    return (data || []).map(normalizeOrder);
};

export interface NewOrderData {
    customerName: string;
    customerPhone: string;
    customerAddress: {
        zipCode: string;
        street: string;
        number: string;
        neighborhood: string;
        complement?: string;
    };
    wantsSachets?: boolean;
    items: CartItem[];
    totalPrice: number;
    restaurantId: number;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    paymentMethod: string;
    couponCode?: string;
    discountAmount?: number;
    subtotal?: number;
    deliveryFee?: number;
}

export const createOrder = async (orderData: NewOrderData): Promise<Order> => {
    const isDebt = orderData.paymentMethod === 'Marcar na minha conta';
    
    const addressWithSachetPreference = {
        ...orderData.customerAddress,
        wantsSachets: orderData.wantsSachets === true
    };
    
    const newOrderPayload = {
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_address: addressWithSachetPreference,
        items: orderData.items,
        total_price: orderData.totalPrice,
        restaurant_id: orderData.restaurantId,
        restaurant_name: orderData.restaurantName,
        restaurant_address: orderData.restaurantAddress,
        restaurant_phone: orderData.restaurantPhone,
        payment_method: orderData.paymentMethod,
        coupon_code: orderData.couponCode,
        discount_amount: orderData.discountAmount,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.deliveryFee,
        status: 'Novo Pedido', 
        payment_status: isDebt ? 'pending' : 'paid',
        timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert(newOrderPayload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create order' });
    
    window.dispatchEvent(new Event('guarafood:update-orders'));
    
    return normalizeOrder(data);
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update order status' });
    return normalizeOrder(data);
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'paid' | 'pending'): Promise<void> => {
    const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
    handleSupabaseError({ error, customMessage: 'Failed to update payment status' });
};

export const updateOrderDetails = async (
    orderId: string,
    updatedDetails: {
        items: CartItem[];
        totalPrice: number;
        subtotal: number;
        discountAmount?: number;
        paymentMethod?: string; 
    }
): Promise<Order> => {
    const payload = {
        items: updatedDetails.items,
        total_price: updatedDetails.totalPrice,
        subtotal: updatedDetails.subtotal,
        discount_amount: updatedDetails.discountAmount,
        payment_method: updatedDetails.paymentMethod,
    };
    const { data, error } = await supabase.from('orders').update(payload).eq('id', orderId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update order details' });
    return normalizeOrder(data);
};
