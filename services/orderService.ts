
import type { Order, OrderStatus, CartItem, PaymentEntry } from '../types';
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
        changeFor: data.change_for || data.payment_details?.changeFor,
        couponCode: data.coupon_code,
        discountAmount: data.discount_amount,
        subtotal: data.subtotal,
        deliveryFee: data.delivery_fee,
        payment_id: data.payment_id,
        payment_details: data.payment_details,
        paymentStatus: data.payment_status || 'paid',
        tableNumber: data.table_number || data.customer_address?.tableNumber,
        paymentHistory: data.payment_history || data.payment_details?.history || []
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
            // Aumentado limite no polling também para consistência
            const orders = await fetchOrders(restaurantId, { limit: 1000 });
            if (isMounted) callback(orders);
        } catch (e) {
            console.error("Erro ao atualizar pedidos via polling:", e);
        }
    };

    // Canal Estático para estabilidade
    const channelName = restaurantId ? `orders_store_${restaurantId}` : `orders_global_admin`;
    
    // Garantir que não existam múltiplos canais pendentes
    const existingChannels = supabase.getChannels().filter(ch => (ch as any).topic === channelName || (ch as any).name === channelName);
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
                refreshData();
            }
        )
        .subscribe((status) => {
            if (isMounted && onStatusChange) {
                onStatusChange(status);
            }
        });

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
    
    // Se não houver limite definido, usamos 5000 como segurança alta, mas limitando para evitar crash.
    const finalLimit = options?.limit || 5000;
    query = query.limit(finalLimit);

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
    changeFor?: number;
    tableNumber?: string;
    status?: OrderStatus;
}

export const createOrder = async (orderData: NewOrderData): Promise<Order> => {
    const isTable = !!orderData.tableNumber;
    
    const addressWithSachetPreference = {
        ...orderData.customerAddress,
        wantsSachets: orderData.wantsSachets === true,
        tableNumber: orderData.tableNumber
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
        change_for: orderData.changeFor,
        table_number: orderData.tableNumber,
        status: orderData.status || 'Novo Pedido', 
        payment_status: isTable ? 'pending' : 'paid',
        timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert(newOrderPayload).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to create order', tableName: 'orders' });
    
    window.dispatchEvent(new Event('guarafood:update-orders'));
    
    return normalizeOrder(data);
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update order status' });
    
    // Trigger manual sync for all listeners
    window.dispatchEvent(new Event('guarafood:update-orders'));
    
    return normalizeOrder(data);
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'paid' | 'pending' | 'partial'): Promise<void> => {
    const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
    handleSupabaseError({ error, customMessage: 'Failed to update payment status' });
    
    // Trigger manual sync for all listeners
    window.dispatchEvent(new Event('guarafood:update-orders'));
};

export const recordOrderPayment = async (orderId: string, payment: PaymentEntry, newTotalPaid: number, originalTotal: number): Promise<Order> => {
    // Busca o histórico atual (usando payment_details como fallback seguro)
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    
    const currentDetails = currentOrder?.payment_details || {};
    const history = currentDetails.history || [];
    const newHistory = [...history, payment];
    
    const isFullyPaid = newTotalPaid >= originalTotal;
    const paymentStatus = isFullyPaid ? 'paid' : 'partial';

    const newPaymentDetails = {
        ...currentDetails,
        history: newHistory
    };

    const { data, error } = await supabase.from('orders')
        .update({ 
            payment_details: newPaymentDetails,
            payment_status: paymentStatus
        })
        .eq('id', orderId)
        .select()
        .single();

    handleSupabaseError({ error, customMessage: 'Failed to record payment' });
    return normalizeOrder(data);
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

export const fetchOpenTableOrder = async (restaurantId: number, tableNumber: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'Aguardando Pagamento')
            .contains('customer_address', { tableNumber: tableNumber })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Error fetching table order:", error);
            return null;
        }

        return data ? normalizeOrder(data) : null;
    } catch (e) {
        console.error("Exception fetching table order:", e);
        return null;
    }
};

export const clearTodayTableOrders = async (restaurantId: number): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: ordersToDelete, error: fetchError } = await supabase
        .from('orders')
        .select('id, customer_address')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayIso);
        
    if (fetchError) {
        handleSupabaseError({ error: fetchError, customMessage: 'Failed to fetch orders for cleanup' });
        return;
    }

    const idsToDelete = ordersToDelete
        .filter((o: any) => o.customer_address && o.customer_address.tableNumber)
        .map((o: any) => o.id);

    if (idsToDelete.length === 0) return;

    const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', idsToDelete);

    handleSupabaseError({ error: deleteError, customMessage: 'Failed to clear table orders' });
    
    window.dispatchEvent(new Event('guarafood:update-orders'));
};

export const requestKitchenPrint = async (orderId: string, itemsToPrint: CartItem[]): Promise<void> => {
    // We'll use a specific field in the order to signal print request
    // Since we can't easily add tables, we'll use a JSONB field 'print_requests' in 'additional_info' or similar if available,
    // or just append to a 'print_queue' field in 'payment_details' (hacky but works without schema change)
    // Actually, let's use the 'items' field itself. We can add a 'printStatus' to items.
    // But updating items might conflict with other updates.
    
    // Better approach: Use a dedicated 'print_status' column if it existed.
    // Let's assume we can update 'payment_details' to include a print queue.
    
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    const currentDetails = currentOrder?.payment_details || {};
    const currentQueue = currentDetails.print_queue || [];
    
    const newRequest = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        items: itemsToPrint,
        status: 'pending',
        type: 'kitchen'
    };
    
    const newDetails = {
        ...currentDetails,
        print_queue: [...currentQueue, newRequest]
    };
    
    const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
    handleSupabaseError({ error, customMessage: 'Failed to request kitchen print' });
};

export const markPrintJobAsDone = async (orderId: string, jobId: string): Promise<void> => {
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    const currentDetails = currentOrder?.payment_details || {};
    const currentQueue = currentDetails.print_queue || [];
    
    const newQueue = currentQueue.map((job: any) => 
        job.id === jobId ? { ...job, status: 'printed', printedAt: new Date().toISOString() } : job
    );
    
    const newDetails = {
        ...currentDetails,
        print_queue: newQueue
    };
    
    const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
    if (error) console.error("Failed to mark print job as done", error);
};
