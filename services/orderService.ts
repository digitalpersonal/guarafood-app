

import type { Order, OrderStatus, CartItem } from '../types';
import { supabase, handleSupabaseError } from './api';

// --- Real-time Order Subscription ---
export const subscribeToOrders = (callback: (orders: Order[]) => void, restaurantId?: number): (() => void) => {
    // Initial fetch
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
                filter: restaurantId ? `restaurantId=eq.${restaurantId}` : undefined 
            },
            (payload) => {
                console.log('Realtime change received!', payload);
                // Refetch all orders for simplicity to ensure consistency
                fetchOrders(restaurantId).then(callback).catch(console.error);
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to orders for restaurant ${restaurantId ?? 'ALL'}`);
            }
            if (err) {
                console.error(`Subscription error for restaurant ${restaurantId ?? 'ALL'}:`, err);
            }
        });

    // Return an unsubscribe function
    return () => {
        console.log(`Unsubscribing from orders for restaurant ${restaurantId ?? 'ALL'}`);
        supabase.removeChannel(channel);
    };
};


export const fetchOrders = async (restaurantId?: number): Promise<Order[]> => {
    let query = supabase.from('orders').select('*');
    if (restaurantId) {
        query = query.eq('restaurantId', restaurantId);
    }
    const { data, error } = await query.order('timestamp', { ascending: false });
    handleSupabaseError({ error, customMessage: 'Failed to fetch orders' });
    return data as Order[];
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
    const newOrderPayload = {
        ...orderData,
        status: 'Novo Pedido' as OrderStatus,
        timestamp: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('orders').insert(newOrderPayload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create order' });
    return data as Order;
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update order status' });
    return data as Order;
};


// The real-time order simulator is no longer needed as we are using Supabase Realtime.
export const startOrderSimulator = () => {
    console.log("Order simulator is deprecated. Using Supabase Realtime.");
};

export const stopOrderSimulator = () => {
     console.log("Order simulator is deprecated. Using Supabase Realtime.");
};