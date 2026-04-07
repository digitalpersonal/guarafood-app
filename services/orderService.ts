
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
        subtotal: data.subtotal,
        deliveryFee: data.delivery_fee,
        payment_id: data.payment_id,
        payment_details: data.payment_details,
        paymentStatus: data.payment_status || 'paid',
        tableNumber: data.table_number || data.customer_address?.tableNumber,
        comandaNumber: data.comanda_number || data.customer_address?.comandaNumber || data.payment_details?.comandaNumber,
        paymentHistory: data.payment_history || data.payment_details?.history || [],
        mensalistaId: data.mensalista_id || data.payment_details?.mensalistaId,
        waiterName: data.waiter_name || data.payment_details?.waiterName,
        serviceCharge: data.service_charge || data.payment_details?.serviceCharge,
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
    subtotal?: number;
    deliveryFee?: number;
    changeFor?: number;
    tableNumber?: string;
    comandaNumber?: string;
    status?: OrderStatus;
    mensalistaId?: string;
    waiterName?: string;
    serviceCharge?: number;
}

export const createOrder = async (orderData: NewOrderData): Promise<Order> => {
    const isTable = !!orderData.tableNumber;
    
    const addressWithSachetPreference = {
        ...orderData.customerAddress,
        wantsSachets: orderData.wantsSachets === true,
        tableNumber: orderData.tableNumber,
        comandaNumber: orderData.comandaNumber
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
        subtotal: orderData.subtotal,
        delivery_fee: orderData.deliveryFee,
        change_for: orderData.changeFor,
        table_number: orderData.tableNumber,
        status: orderData.status || 'Novo Pedido', 
        payment_status: isTable ? 'pending' : 'paid',
        timestamp: new Date().toISOString(),
        payment_details: {
            waiterName: orderData.waiterName,
            serviceCharge: orderData.serviceCharge,
            mensalistaId: orderData.mensalistaId,
            comandaNumber: orderData.comandaNumber
        }
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

export const recordOrderPayment = async (orderId: string, payment: PaymentEntry, newTotalPaid: number, originalTotal: number, mensalistaId?: string | null): Promise<Order> => {
    // Busca o histórico atual
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    
    const history = currentOrder?.payment_details?.history || [];
    const newHistory = [...history, payment];
    
    const isFullyPaid = newTotalPaid >= originalTotal - 0.01; // Tolerance for float precision
    const paymentStatus = isFullyPaid ? 'paid' : 'partial';

    const updateData: any = { 
        payment_status: paymentStatus
    };

    updateData.payment_details = {
        ...(currentOrder?.payment_details || {}),
        history: newHistory
    };

    if (mensalistaId) {
        updateData.payment_details.mensalistaId = mensalistaId;
    }

    const { data, error } = await supabase.from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

    handleSupabaseError({ error, customMessage: 'Failed to record payment' });
    return normalizeOrder(data);
};

export const deleteOrderPayment = async (orderId: string, paymentIndex: number): Promise<Order> => {
    // Busca o histórico atual
    const { data: currentOrder } = await supabase.from('orders').select('payment_details, total_price').eq('id', orderId).single();
    
    const history = currentOrder?.payment_details?.history || [];
    const paymentToDelete = history[paymentIndex];
    
    if (!paymentToDelete) throw new Error('Pagamento não encontrado.');

    const newHistory = history.filter((_: any, i: number) => i !== paymentIndex);
    
    const newTotalPaid = newHistory.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const originalTotal = currentOrder.total_price;
    
    const isFullyPaid = newTotalPaid >= originalTotal - 0.01;
    const paymentStatus = newTotalPaid <= 0 ? 'pending' : (isFullyPaid ? 'paid' : 'partial');

    const updateData: any = { 
        payment_status: paymentStatus
    };

    updateData.payment_details = {
        ...(currentOrder?.payment_details || {}),
        history: newHistory
    };

    const { data, error } = await supabase.from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

    handleSupabaseError({ error, customMessage: 'Failed to delete payment' });
    return normalizeOrder(data);
};

export const updateOrderDetails = async (
    orderId: string,
    updatedDetails: {
        items: CartItem[];
        totalPrice: number;
        subtotal: number;
        paymentMethod?: string; 
        customerName?: string;
        customerPhone?: string;
        discountAmount?: number;
        mensalistaId?: string | null;
        waiterName?: string;
        serviceCharge?: number;
    }
): Promise<Order> => {
    // Fetch current order to get old total price
    const { data: currentOrder } = await supabase.from('orders').select('total_price').eq('id', orderId).single();

    const payload: any = {
        items: updatedDetails.items,
        total_price: updatedDetails.totalPrice,
        subtotal: updatedDetails.subtotal,
        payment_method: updatedDetails.paymentMethod,
    };

    if (updatedDetails.customerName !== undefined) payload.customer_name = updatedDetails.customerName;
    if (updatedDetails.customerPhone !== undefined) payload.customer_phone = updatedDetails.customerPhone;
    if (updatedDetails.discountAmount !== undefined) payload.discount_amount = updatedDetails.discountAmount;
    
    // Update payment_details for fields that don't have dedicated columns
    if (updatedDetails.mensalistaId !== undefined || updatedDetails.waiterName !== undefined || updatedDetails.serviceCharge !== undefined) {
        const { data: currentOrderData } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
        const currentPaymentDetails = currentOrderData?.payment_details || {};
        
        payload.payment_details = {
            ...currentPaymentDetails,
            ...(updatedDetails.mensalistaId !== undefined && { mensalistaId: updatedDetails.mensalistaId }),
            ...(updatedDetails.waiterName !== undefined && { waiterName: updatedDetails.waiterName }),
            ...(updatedDetails.serviceCharge !== undefined && { serviceCharge: updatedDetails.serviceCharge }),
        };
    }

    const { data, error } = await supabase.from('orders').update(payload).eq('id', orderId).select().single();
    handleSupabaseError({ error, customMessage: 'Failed to update order details' });

    // Recalculate payment status based on history and new total price
    const history = data.payment_history || data.payment_details?.history || [];
    const totalPaid = history.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const isFullyPaid = totalPaid >= updatedDetails.totalPrice - 0.01;
    const paymentStatus = isFullyPaid ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');
    
    if (data.payment_status !== paymentStatus) {
        await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
        data.payment_status = paymentStatus;
    }

    return normalizeOrder(data);
};

export const fetchOpenTableOrders = async (restaurantId: number, tableNumber: string): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'Aguardando Pagamento')
            .or(`table_number.eq.${tableNumber},customer_address->>tableNumber.eq.${tableNumber}`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching table orders:", error);
            return [];
        }

        return (data || []).map(normalizeOrder);
    } catch (e) {
        console.error("Exception fetching table orders:", e);
        return [];
    }
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
    if (!itemsToPrint || itemsToPrint.length === 0) {
        console.warn('Attempted to print empty kitchen order.');
        return;
    }
    // 1. Fetch current order to update items
    const { data: currentOrder } = await supabase.from('orders').select('payment_details, items').eq('id', orderId).single();
    if (!currentOrder) throw new Error('Pedido não encontrado.');

    const currentDetails = currentOrder.payment_details || {};
    const currentQueue = currentDetails.print_queue || [];
    const currentItems = currentOrder.items || [];
    
    // 2. Mark items as printed in the order's items list
    // We identify items by their unique ID (CartItem.id)
    const itemsToPrintIds = new Set(itemsToPrint.map(i => i.id));
    const updatedItems = currentItems.map((item: CartItem) => {
        if (itemsToPrintIds.has(item.id)) {
            return { ...item, kitchenPrinted: true };
        }
        return item;
    });

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
    
    const { error } = await supabase.from('orders').update({ 
        payment_details: newDetails,
        items: updatedItems
    }).eq('id', orderId);
    
    handleSupabaseError({ error, customMessage: 'Failed to request kitchen print' });
    
    // Trigger manual sync for all listeners
    window.dispatchEvent(new Event('guarafood:update-orders'));
};

export const requestAdminPrint = async (orderId: string, itemsToPrint: CartItem[]): Promise<void> => {
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    const currentDetails = currentOrder?.payment_details || {};
    const currentQueue = currentDetails.print_queue || [];
    
    const newRequest = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        items: itemsToPrint,
        status: 'pending',
        type: 'admin'
    };
    
    const newDetails = {
        ...currentDetails,
        print_queue: [...currentQueue, newRequest]
    };
    
    const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
    handleSupabaseError({ error, customMessage: 'Failed to request admin print' });
};

export const requestBillPrint = async (orderId: string): Promise<void> => {
    const { data: currentOrder } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
    const currentDetails = currentOrder?.payment_details || {};
    const currentQueue = currentDetails.print_queue || [];
    
    const newRequest = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'full'
    };
    
    const newDetails = {
        ...currentDetails,
        print_queue: [...currentQueue, newRequest]
    };
    
    const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
    handleSupabaseError({ error, customMessage: 'Failed to request bill print' });
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
