

import type { Order, OrderStatus, CartItem } from '../types.ts';
import { supabase, handleSupabaseError } from './api.ts';

// Mapeia do Banco (snake_case) para o App (camelCase)
const normalizeOrder = (data: any): Order => {
    return {
        id: data.id,
        timestamp: data.timestamp || data.created_at,
        status: data.status,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerAddress: data.customer_address,
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

export const subscribeToOrders = (callback: (orders: Order[]) => void, restaurantId?: number): (() => void) => {
    // Busca inicial
    fetchOrders(restaurantId).then(callback).catch(console.error);

    const channelName = restaurantId ? `public:orders:restaurantId=eq.${restaurantId}` : 'public:orders';
    const channel = supabase.channel(channelName);
    
    const subscription = channel
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'orders', 
                filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined 
            },
            (payload) => {
                console.log('Change received!', payload);
                fetchOrders(restaurantId).then(callback).catch(console.error);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const fetchOrders = async (restaurantId?: number): Promise<Order[]> => {
    let query = supabase.from('orders').select('*');
    if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
    }
    const { data, error } = await query.order('timestamp', { ascending: false });
    handleSupabaseError({ error, customMessage: 'Failed to fetch orders' });
    
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
    
    // CONVERSÃO IMPORTANTE: CamelCase (App) -> snake_case (Banco)
    const newOrderPayload = {
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_address: orderData.customerAddress,
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
        status: orderData.paymentMethod === 'Pix' ? 'Aguardando Pagamento' : 'Novo Pedido',
        payment_status: isDebt ? 'pending' : 'paid',
        timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert(newOrderPayload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create order' });
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
        paymentMethod?: string; // Allow changing payment method if it was "Marcar na minha conta" for example
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