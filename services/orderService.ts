
import type { Order, OrderStatus, CartItem, PaymentEntry } from '../types';
import { supabase, handleSupabaseError } from './api';
import { retryWithExponentialBackoff, type RetryOptions } from '../utils/retry';

// Mapeia do Banco (snake_case) para o App (camelCase)
const normalizeOrder = (data: any): Order => {
    const wantsSachets = data.customer_address?.wantsSachets === true;
    const fiscalMeta = data.payment_details?.fiscal;
    const fiscalStatus = data.fiscal_status || data.fiscalStatus || fiscalMeta?.status;
    const fiscalKey = data.fiscal_key || data.fiscalKey || fiscalMeta?.chave;
    const fiscalError = data.fiscal_message || data.fiscal_error || fiscalMeta?.mensagem;
    const fiscalExport = Boolean(
        data.fiscalExport ||
        data.fiscal_export ||
        fiscalMeta?.export ||
        fiscalStatus === 'autorizado' ||
        Boolean(fiscalKey)
    );

    return {
        id: data.id,
        order_number: data.order_number, 
        timestamp: data.timestamp || data.created_at,
        status: data.status,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerDocument: data.customer_cpf || data.customer_document || data.customerDocument || data.payment_details?.customer_cpf || data.payment_details?.customer_document || null,
        fiscalExport,
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
        comandaNumber: data.comanda_number || data.customer_address?.comandaNumber,
        paymentHistory: data.payment_history || data.payment_details?.history || [],
        mensalistaId: data.mensalista_id,
        fiscalStatus,
        fiscalDanfeUrl: data.fiscal_danfe_url || fiscalMeta?.danfe_url,
        fiscalXmlUrl: data.fiscal_xml_url || fiscalMeta?.xml_url,
        fiscalKey,
        fiscalNumber: data.fiscal_number || fiscalMeta?.numero,
        fiscalProtocol: data.fiscal_protocol || fiscalMeta?.protocolo,
        fiscalMessage: fiscalError,
        preorderInfo: data.preorder_info || data.payment_details?.preorderInfo || null
    };
};

export const subscribeToOrders = (
    callback: (orders: Order[]) => void, 
    restaurantId?: number,
    onStatusChange?: (status: string) => void
): (() => void) => {
    let isMounted = true;
    let isFetching = false;
    let pendingRefresh = false;

    const refreshData = async () => {
        if (!isMounted) return;
        if (isFetching) {
            pendingRefresh = true;
            return;
        }
        isFetching = true;
        try {
            // Usamos um limite de 150 para máxima velocidade e leveza em celulares e tablets dos restaurantes e timeout de 10s para evitar travamento
            const orders = await Promise.race([
                fetchOrders(restaurantId, { limit: 150 }),
                new Promise<Order[]>((_, reject) => setTimeout(() => reject(new Error('Polling sync timeout')), 10000))
            ]);
            if (isMounted) callback(orders);
        } catch (e) {
            console.warn("[GuaraFood Polling] Erro ou timeout ao atualizar pedidos:", e);
        } finally {
            isFetching = false;
            if (pendingRefresh && isMounted) {
                pendingRefresh = false;
                void refreshData();
            }
        }
    };

    // Canal Estático para estabilidade
    const channelName = restaurantId ? `orders_store_${restaurantId}` : `orders_global_admin`;
    
    // Garantir que não existam múltiplos canais pendentes - defensivo para evitar falhas se getChannels não existir
    let existingChannels: any[] = [];
    try {
        if (typeof supabase.getChannels === 'function') {
            existingChannels = supabase.getChannels().filter(ch => (ch as any).topic === channelName || (ch as any).name === channelName);
            existingChannels.forEach(ch => {
                try {
                    supabase.removeChannel(ch);
                } catch (err) {
                    console.warn("[GuaraFood WebSockets] Erro ao remover canal individual:", err);
                }
            });
        }
    } catch (err) {
        console.warn("[GuaraFood WebSockets] Erro ao limpar canais antigos no Supabase:", err);
    }

    let channel: any = null;
    try {
        channel = supabase.channel(channelName)
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
                // Se o WebSocket desconectar ou falhar, força atualização imediata para garantir resiliência
                if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    refreshData();
                }
            });
    } catch (err) {
        console.error("[GuaraFood WebSockets] Erro ao criar canal de tempo real. Polling HTTP operando como fallback principal.", err);
        if (isMounted && onStatusChange) {
            onStatusChange('CHANNEL_ERROR');
        }
    }

    refreshData();

    // GARANTIA COMPLETA E HEARTBEAT: Polling em segundo plano a cada 8 segundos para máxima reatividade (ex: webhooks Pix)
    const fallbackInterval = setInterval(() => {
        refreshData();
    }, 8000);

    // Sincronização inteligente ao ganhar foco, reconectar ou ficar visível (evita perda de sincronia após telefone/tablet dormir)
    const handleActivity = () => {
        if (isMounted) {
            refreshData();
        }
    };

    window.addEventListener('focus', handleActivity);
    window.addEventListener('online', handleActivity);
    document.addEventListener('visibilitychange', handleActivity);
    window.addEventListener('guarafood:update-orders', handleActivity);

    return () => {
        isMounted = false;
        clearInterval(fallbackInterval);
        window.removeEventListener('focus', handleActivity);
        window.removeEventListener('online', handleActivity);
        document.removeEventListener('visibilitychange', handleActivity);
        window.removeEventListener('guarafood:update-orders', handleActivity);
        if (channel) {
            try {
                supabase.removeChannel(channel);
            } catch (err) {
                console.warn("[GuaraFood WebSockets] Erro ao remover canal no unmount:", err);
            }
        }
    };
};

export const fetchOrders = async (restaurantId?: number, options?: { limit?: number }): Promise<Order[]> => {
    let query = supabase.from('orders').select('*, restaurants!inner(active)');
    if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
    } else {
        query = query.eq('restaurants.active', true);
    }
    
    // Se não houver limite definido, usamos 150 como limite seguro e leve para evitar travamento em dispositivos móveis.
    const finalLimit = options?.limit || 150;
    query = query.limit(finalLimit);

    // Pedidos ativos (Novo Pedido, Preparando, A Caminho, Aguardando Pagamento) nunca somem. Histórico usa 14 dias.
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    query = query.or(`timestamp.gte.${fourteenDaysAgo.toISOString()},status.in.(Novo Pedido,Preparando,A Caminho,Aguardando Pagamento)`);

    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) {
        handleSupabaseError({ error, customMessage: 'Failed to fetch orders' });
        return [];
    }
    
    return (data || []).map(normalizeOrder);
};

export const fetchOrdersByMensalistaId = async (mensalistaId: string): Promise<Order[]> => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('mensalista_id', mensalistaId)
        .order('timestamp', { ascending: false });
    
    if (error) {
        handleSupabaseError({ error, customMessage: 'Failed to fetch orders for mensalista' });
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
    comandaNumber?: string;
    status?: OrderStatus;
    mensalistaId?: string; // NEW: Para pedidos de mensalistas
    pointsRedeemed?: number; // NEW: Pontos de fidelidade resgatados
    preorderInfo?: string;
}

export const createOrder = async (
    orderData: NewOrderData,
    options?: { onRetry?: (attempt: number, error: any, delayMs: number) => void; retryOptions?: RetryOptions }
): Promise<Order> => {
    return retryWithExponentialBackoff(async () => {
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
            payment_method: orderData.mensalistaId ? 'Mensalista' : orderData.paymentMethod,
            coupon_code: orderData.couponCode,
            discount_amount: orderData.discountAmount,
            subtotal: orderData.subtotal,
            delivery_fee: orderData.deliveryFee,
            change_for: orderData.changeFor,
            table_number: orderData.tableNumber,
            comanda_number: orderData.comandaNumber,
            status: orderData.status || 'Novo Pedido', 
            payment_status: isTable ? 'pending' : 'paid',
            timestamp: new Date().toISOString(),
            mensalista_id: orderData.mensalistaId, // NEW
            preorder_info: orderData.preorderInfo || '',
        };

        const { data, error } = await supabase.from('orders').insert(newOrderPayload).select().single();
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to create order', tableName: 'orders' });
            throw error;
        }
        
        // Atualizar saldo do mensalista se aplicável
        if (orderData.mensalistaId) {
            const { data: mensalista } = await supabase.from('mensalistas').select('balance').eq('id', orderData.mensalistaId).single();
            if (mensalista) {
                await supabase.from('mensalistas').update({ balance: Number(mensalista.balance || 0) + orderData.totalPrice }).eq('id', orderData.mensalistaId);
            }
        }

        if (orderData.pointsRedeemed && orderData.pointsRedeemed > 0) {
            // Reduz os pontos do cliente (temos que buscar primeiro e atualizar, ou fazer RPC, aqui faremos read/write simples para facilitar)
            const { data: loyaltyCard } = await supabase.from('customer_loyalty')
                .select('points, redeemed_points')
                .eq('restaurant_id', orderData.restaurantId)
                .eq('customer_phone', orderData.customerPhone)
                .single();
                
            if (loyaltyCard) {
                await supabase.from('customer_loyalty').update({
                    points: Math.max(0, loyaltyCard.points - orderData.pointsRedeemed),
                    redeemed_points: (loyaltyCard.redeemed_points || 0) + orderData.pointsRedeemed
                }).eq('restaurant_id', orderData.restaurantId).eq('customer_phone', orderData.customerPhone);
            }
        }
        
        window.dispatchEvent(new Event('guarafood:update-orders'));
        
        return normalizeOrder(data);
    }, {
        maxRetries: 4,
        initialDelayMs: 400,
        backoffFactor: 2,
        maxDelayMs: 4000,
        onRetry: options?.onRetry,
        ...options?.retryOptions
    });
};

const ORDER_STATUS_RANK: Record<string, number> = {
    'Aguardando Pagamento': 0,
    'Mesa Aberta': 0,
    'Novo Pedido': 1,
    'Preparando': 2,
    'A Caminho': 3,
    'Entregue': 4,
    'Cancelado': 4,
};

export const updateOrderStatus = async (
    orderId: string, 
    status: OrderStatus,
    options?: { onRetry?: (attempt: number, error: any, delayMs: number) => void; retryOptions?: RetryOptions }
): Promise<Order> => {
    return retryWithExponentialBackoff(async () => {
        const { data: currentRow, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError) {
            handleSupabaseError({ error: fetchError, customMessage: 'Failed to fetch current order status' });
            throw fetchError;
        }

        const currentStatus = currentRow?.status as OrderStatus | undefined;
        const currentRank = currentStatus !== undefined ? (ORDER_STATUS_RANK[currentStatus] ?? 0) : 0;
        const targetRank = ORDER_STATUS_RANK[status] ?? 1;

        // Nunca permite regredir status nem sair de estados terminais ('Entregue' ou 'Cancelado')
        if (currentStatus === status || currentStatus === 'Entregue' || currentStatus === 'Cancelado' || targetRank < currentRank) {
            if (currentStatus !== status) {
                console.warn(`[orderService] Bloqueada tentativa de regressão de status do pedido ${orderId}: '${currentStatus}' -> '${status}'.`);
            }
            window.dispatchEvent(new Event('guarafood:update-orders'));
            return normalizeOrder(currentRow);
        }

        const updatePayload: any = { status };
        if (['Novo Pedido', 'Preparando', 'A Caminho', 'Entregue'].includes(status)) {
            updatePayload.payment_status = 'paid';
        }

        let updateQuery = supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (currentStatus) {
            updateQuery = updateQuery.eq('status', currentStatus);
        }

        const { data, error } = await updateQuery.select().maybeSingle();

        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to update order status' });
            throw error;
        }

        if (!data) {
            // Outro dispositivo/processo alterou o status exatamente no mesmo instante; busca o estado mais recente
            const { data: latestRow, error: refetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();
            if (refetchError) {
                handleSupabaseError({ error: refetchError, customMessage: 'Failed to verify order status' });
                throw refetchError;
            }
            window.dispatchEvent(new Event('guarafood:update-orders'));
            return normalizeOrder(latestRow);
        }
        
        // Trigger manual sync for all listeners
        window.dispatchEvent(new Event('guarafood:update-orders'));
        
        return normalizeOrder(data);
    }, {
        maxRetries: 4,
        initialDelayMs: 400,
        backoffFactor: 2,
        maxDelayMs: 4000,
        onRetry: options?.onRetry,
        ...options?.retryOptions
    });
};

export const updateOrderFiscalExport = async (orderId: string, fiscalExport: boolean): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { error } = await supabase.from('orders').update({ fiscalExport }).eq('id', orderId);
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to update fiscal export status' });
            throw error;
        }
        window.dispatchEvent(new Event('guarafood:update-orders'));
    }, {
        maxRetries: 3,
        initialDelayMs: 350
    });
};

export const updateOrderCustomerDocument = async (orderId: string, document: string | null, customerName?: string): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const cleanDoc = document ? document.trim() : null;
        const updatePayload: any = { customer_cpf: cleanDoc };
        if (customerName && customerName.trim()) {
            updatePayload.customer_name = customerName.trim();
        }
        const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
        if (error) {
            handleSupabaseError({ error, customMessage: 'Falha ao atualizar CPF/CNPJ do pedido' });
            throw error;
        }
        window.dispatchEvent(new Event('guarafood:update-orders'));
    }, {
        maxRetries: 2,
        initialDelayMs: 300
    });
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'paid' | 'pending' | 'partial'): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to update payment status' });
            throw error;
        }
        // Trigger manual sync for all listeners
        window.dispatchEvent(new Event('guarafood:update-orders'));
    }, {
        maxRetries: 3,
        initialDelayMs: 350
    });
};

export const recordOrderPayment = async (
    orderId: string, 
    payment: PaymentEntry, 
    newTotalPaid: number, 
    originalTotal: number, 
    mensalistaId?: string,
    options?: { onRetry?: (attempt: number, error: any, delayMs: number) => void }
): Promise<Order> => {
    return retryWithExponentialBackoff(async () => {
        // Busca o histórico atual
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('payment_history, payment_details').eq('id', orderId).single();
        if (fetchErr) {
            handleSupabaseError({ error: fetchErr, customMessage: 'Failed to fetch order payment history' });
            throw fetchErr;
        }
        
        const history = currentOrder?.payment_history || currentOrder?.payment_details?.history || [];
        const newHistory = [...history, payment];
        
        const isFullyPaid = newTotalPaid >= originalTotal - 0.01; // Tolerance for float precision
        const paymentStatus = isFullyPaid ? 'paid' : 'partial';

        const updateData: any = { 
            payment_history: newHistory,
            payment_status: paymentStatus
        };

        // Also update payment_details for backward compatibility if needed
        if (currentOrder?.payment_details) {
            updateData.payment_details = {
                ...currentOrder.payment_details,
                history: newHistory
            };
        }

        if (mensalistaId) {
            updateData.mensalista_id = mensalistaId;
            
            // Adjust mensalista balance
            const { data: mensalista } = await supabase.from('mensalistas').select('balance').eq('id', mensalistaId).single();
            if (mensalista) {
                await supabase.from('mensalistas').update({ balance: Number(mensalista.balance || 0) + payment.amount }).eq('id', mensalistaId);
            }
        }

        const { data, error } = await supabase.from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single();

        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to record payment' });
            throw error;
        }
        return normalizeOrder(data);
    }, {
        maxRetries: 4,
        initialDelayMs: 400,
        backoffFactor: 2,
        onRetry: options?.onRetry
    });
};

export const updateOrderDetails = async (
    orderId: string,
    updatedDetails: {
        items: CartItem[];
        totalPrice: number;
        subtotal: number;
        discountAmount?: number;
        paymentMethod?: string; 
        customerName?: string;
        customerPhone?: string;
        mensalistaId?: string | null;
    },
    options?: { onRetry?: (attempt: number, error: any, delayMs: number) => void }
): Promise<Order> => {
    return retryWithExponentialBackoff(async () => {
        // Fetch current order to get old total price and mensalista_id
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('total_price, mensalista_id').eq('id', orderId).single();
        if (fetchErr) {
            handleSupabaseError({ error: fetchErr, customMessage: 'Failed to fetch current order details' });
            throw fetchErr;
        }

        const payload: any = {
            items: updatedDetails.items,
            total_price: updatedDetails.totalPrice,
            subtotal: updatedDetails.subtotal,
            discount_amount: updatedDetails.discountAmount,
            payment_method: updatedDetails.paymentMethod,
        };

        if (updatedDetails.customerName) payload.customer_name = updatedDetails.customerName;
        if (updatedDetails.customerPhone) payload.customer_phone = updatedDetails.customerPhone;
        if (updatedDetails.mensalistaId !== undefined) payload.mensalista_id = updatedDetails.mensalistaId;

        const { data, error } = await supabase.from('orders').update(payload).eq('id', orderId).select().single();
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to update order details' });
            throw error;
        }

        // Recalculate payment status based on history and new total price
        const history = data.payment_history || data.payment_details?.history || [];
        const totalPaid = history.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        const isFullyPaid = totalPaid >= updatedDetails.totalPrice - 0.01;
        const paymentStatus = isFullyPaid ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');
        
        if (data.payment_status !== paymentStatus) {
            await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
            data.payment_status = paymentStatus;
        }

        // Adjust mensalista balance if applicable
        // Case 1: Mensalista ID changed (from one to another, or added/removed)
        const oldMensalistaId = currentOrder?.mensalista_id;
        const newMensalistaId = updatedDetails.mensalistaId;

        if (currentOrder && newMensalistaId !== undefined && oldMensalistaId !== newMensalistaId) {
            // Remove from old mensalista balance
            if (oldMensalistaId) {
                const { data: oldMensalista } = await supabase.from('mensalistas').select('balance').eq('id', oldMensalistaId).single();
                if (oldMensalista) {
                    await supabase.from('mensalistas').update({ balance: Number(oldMensalista.balance || 0) - Number(currentOrder.total_price) }).eq('id', oldMensalistaId);
                }
            }
            // Add to new mensalista balance
            if (newMensalistaId) {
                const { data: newMensalista } = await supabase.from('mensalistas').select('balance').eq('id', newMensalistaId).single();
                if (newMensalista) {
                    await supabase.from('mensalistas').update({ balance: Number(newMensalista.balance || 0) + updatedDetails.totalPrice }).eq('id', newMensalistaId);
                }
            }
        } 
        // Case 2: Same mensalista, but price changed
        else if (currentOrder && oldMensalistaId && updatedDetails.totalPrice !== undefined) {
            const priceDifference = updatedDetails.totalPrice - Number(currentOrder.total_price);
            if (priceDifference !== 0) {
                const { data: mensalista } = await supabase.from('mensalistas').select('balance').eq('id', oldMensalistaId).single();
                if (mensalista) {
                    await supabase.from('mensalistas').update({ balance: Number(mensalista.balance || 0) + priceDifference }).eq('id', oldMensalistaId);
                }
            }
        }

        return normalizeOrder(data);
    }, {
        maxRetries: 4,
        initialDelayMs: 400,
        backoffFactor: 2,
        onRetry: options?.onRetry
    });
};

export const fetchOpenTableOrders = async (restaurantId: number, tableNumber: string): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'Aguardando Pagamento');

        if (error) {
            console.error("Error fetching table orders:", error);
            return [];
        }

        const normalized = (data || []).map(normalizeOrder);
        
        // Filtro ultra-robusto em memória que é 100% imune a erros de tipagem/cast do Postgres ou JSON
        return normalized.filter(order => {
            const numStr = String(tableNumber).trim();
            const orderTableNum = order.tableNumber ? String(order.tableNumber).trim() : '';
            const addressTableNum = (order.customerAddress && typeof order.customerAddress === 'object') 
                ? String((order.customerAddress as any).tableNumber || '').trim() 
                : '';
                
            return orderTableNum === numStr || addressTableNum === numStr;
        });
    } catch (e) {
        console.error("Exception fetching table orders:", e);
        return [];
    }
};

export const fetchOpenTableOrder = async (restaurantId: number, tableNumber: string): Promise<Order | null> => {
    try {
        const orders = await fetchOpenTableOrders(restaurantId, tableNumber);
        return orders.length > 0 ? orders[0] : null;
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

const generatePrintJobId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `print-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const requestKitchenPrint = async (orderId: string, itemsToPrint: CartItem[], targetPrinterId?: string): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
        if (fetchErr) {
            handleSupabaseError({ error: fetchErr, customMessage: 'Failed to fetch order for kitchen print' });
            throw fetchErr;
        }
        const currentDetails = currentOrder?.payment_details || {};
        const currentQueue = currentDetails.print_queue || [];
        
        const newRequest: any = {
            id: generatePrintJobId(),
            timestamp: new Date().toISOString(),
            items: itemsToPrint,
            status: 'pending',
            type: 'kitchen',
        };

        if (targetPrinterId) {
            newRequest.targetPrinterId = targetPrinterId;
        }
        
        const newDetails = {
            ...currentDetails,
            print_queue: [...currentQueue, newRequest]
        };
        
        const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to request kitchen print' });
            throw error;
        }
    }, { maxRetries: 3, initialDelayMs: 350 });
};

export const requestAdminPrint = async (orderId: string, itemsToPrint: CartItem[]): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
        if (fetchErr) {
            handleSupabaseError({ error: fetchErr, customMessage: 'Failed to fetch order for admin print' });
            throw fetchErr;
        }
        const currentDetails = currentOrder?.payment_details || {};
        const currentQueue = currentDetails.print_queue || [];
        
        const newRequest = {
            id: generatePrintJobId(),
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
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to request admin print' });
            throw error;
        }
    }, { maxRetries: 3, initialDelayMs: 350 });
};

export const requestBillPrint = async (orderId: string): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
        if (fetchErr) {
            handleSupabaseError({ error: fetchErr, customMessage: 'Failed to fetch order for bill print' });
            throw fetchErr;
        }
        const currentDetails = currentOrder?.payment_details || {};
        const currentQueue = currentDetails.print_queue || [];
        
        const newRequest = {
            id: generatePrintJobId(),
            timestamp: new Date().toISOString(),
            status: 'pending',
            type: 'full'
        };
        
        const newDetails = {
            ...currentDetails,
            print_queue: [...currentQueue, newRequest]
        };
        
        const { error } = await supabase.from('orders').update({ payment_details: newDetails }).eq('id', orderId);
        if (error) {
            handleSupabaseError({ error, customMessage: 'Failed to request bill print' });
            throw error;
        }
    }, { maxRetries: 3, initialDelayMs: 350 });
};

export const markPrintJobAsDone = async (orderId: string, jobId: string): Promise<void> => {
    return retryWithExponentialBackoff(async () => {
        const { data: currentOrder, error: fetchErr } = await supabase.from('orders').select('payment_details').eq('id', orderId).single();
        if (fetchErr) throw fetchErr;
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
        if (error) throw error;
    }, { maxRetries: 3, initialDelayMs: 350 });
};

export const fetchOrdersByMonth = async (
    restaurantId: number,
    year: number,
    monthIndex: number
): Promise<Order[]> => {
    const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0).toISOString();
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false })
        .limit(5000);

    if (error) {
        handleSupabaseError({ error, customMessage: 'Falha ao buscar pedidos do mês para contabilidade' });
        throw error;
    }

    return (data || []).map(normalizeOrder);
};

export interface EmitFiscalSefazResult {
    orderId: string;
    success: boolean;
    fiscalStatus: 'autorizado' | 'processando' | 'erro_autorizacao' | 'cancelado';
    fiscalKey?: string;
    fiscalNumber?: string;
    fiscalProtocol?: string;
    fiscalDanfeUrl?: string;
    fiscalXmlUrl?: string;
    fiscalQrCodeUrl?: string;
    fiscalConsultUrl?: string;
    fiscalMessage?: string;
    simulated?: boolean;
}

const persistOrderFiscalMetadata = async (
    orderId: string,
    existingPaymentDetails: any,
    fiscalMeta: {
        status: 'autorizado' | 'processando' | 'erro_autorizacao' | 'rejeitado' | 'cancelado';
        chave?: string;
        numero?: string;
        protocolo?: string;
        danfe_url?: string;
        xml_url?: string;
        qrcode_url?: string;
        url_consulta_nf?: string;
        mensagem?: string;
    }
): Promise<void> => {
    const cleanMeta = Object.fromEntries(
        Object.entries(fiscalMeta).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const mergedDetails = {
        ...(existingPaymentDetails && typeof existingPaymentDetails === 'object' ? existingPaymentDetails : {}),
        fiscal: {
            ...(existingPaymentDetails?.fiscal || {}),
            ...cleanMeta,
            updated_at: new Date().toISOString(),
        },
    };

    const fullPayload: Record<string, any> = {
        payment_details: mergedDetails,
        fiscal_status: fiscalMeta.status,
    };
    if (fiscalMeta.chave) fullPayload.fiscal_key = fiscalMeta.chave;
    if (fiscalMeta.danfe_url) fullPayload.fiscal_danfe_url = fiscalMeta.danfe_url;
    if (fiscalMeta.xml_url) fullPayload.fiscal_xml_url = fiscalMeta.xml_url;
    if (fiscalMeta.numero) fullPayload.fiscal_number = fiscalMeta.numero;
    if (fiscalMeta.mensagem) fullPayload.fiscal_message = fiscalMeta.mensagem;
    if (fiscalMeta.status === 'autorizado' || fiscalMeta.status === 'processando') {
        fullPayload.fiscalExport = true;
    }

    const { error } = await supabase.from('orders').update(fullPayload).eq('id', orderId);
    if (!error) {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('guarafood:update-orders'));
        return;
    }

    const fallbackWithExport: Record<string, any> = { payment_details: mergedDetails };
    if (fiscalMeta.status === 'autorizado' || fiscalMeta.status === 'processando') {
        fallbackWithExport.fiscalExport = true;
    }
    const { error: fallbackErr } = await supabase.from('orders').update(fallbackWithExport).eq('id', orderId);
    if (!fallbackErr) {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('guarafood:update-orders'));
        return;
    }

    const { error: minimalErr } = await supabase.from('orders').update({ payment_details: mergedDetails }).eq('id', orderId);
    if (minimalErr) {
        console.warn('[orderService] Falha ao persistir metadados fiscais no pedido:', minimalErr);
    } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('guarafood:update-orders'));
    }
};

export const emitOrderFiscalToSefaz = async (
    order: Order,
    restaurant: any
): Promise<EmitFiscalSefazResult> => {
    try {
        const response = await fetch('/api/fiscal/emit-nfe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurant: restaurant || {
                    id: order.restaurantId,
                    name: order.restaurantName,
                    address: order.restaurantAddress,
                    phone: order.restaurantPhone,
                },
                order,
            }),
        });

        const rawText = await response.text();
        let resData: any = {};
        try {
            resData = rawText ? JSON.parse(rawText) : {};
        } catch {
            resData = {
                error: rawText.trim().startsWith('<')
                    ? `Endpoint fiscal (/api/fiscal/emit-nfe) retornou HTML inesperado (HTTP ${response.status}).`
                    : (rawText || `Resposta inválida (${response.status}) do servidor fiscal.`),
            };
        }

        if (!response.ok || resData?.success === false || resData?.error) {
            const errMsg =
                resData?.error ||
                resData?.mensagem_sefaz ||
                resData?.mensagem ||
                (response.status === 405 || response.status === 404
                    ? `Servidor fiscal (/api/fiscal/emit-nfe) indisponível neste deploy (HTTP ${response.status}).`
                    : `Erro HTTP ${response.status} ao enviar NFC-e para Focus NFe / SEFAZ.`);
            await persistOrderFiscalMetadata(order.id, order.payment_details, {
                status: 'erro_autorizacao',
                mensagem: errMsg,
            });
            return {
                orderId: order.id,
                success: false,
                fiscalStatus: 'erro_autorizacao',
                fiscalMessage: errMsg,
            };
        }

        const apiData = resData?.data || {};
        const rawStatus = String(apiData?.status || '').toLowerCase();
        const nextStatus: 'autorizado' | 'processando' =
            rawStatus === 'processando_autorizacao' || rawStatus === 'processando'
                ? 'processando'
                : 'autorizado';

        const fiscalKey = apiData?.chave_nfe ? String(apiData.chave_nfe) : undefined;
        const fiscalNumber = apiData?.numero ? String(apiData.numero) : (order.order_number ? String(order.order_number) : undefined);
        const fiscalProtocol = apiData?.protocolo ? String(apiData.protocolo) : undefined;
        const fiscalDanfeUrl = apiData?.caminho_danfe ? String(apiData.caminho_danfe) : undefined;
        const fiscalXmlUrl = (apiData?.caminho_xml_nota_fiscal || apiData?.caminho_xml)
            ? String(apiData.caminho_xml_nota_fiscal || apiData.caminho_xml)
            : undefined;
        const fiscalQrCodeUrl = apiData?.qrcode_url ? String(apiData.qrcode_url) : undefined;
        const fiscalConsultUrl = apiData?.url_consulta_nf ? String(apiData.url_consulta_nf) : undefined;
        const fiscalMessage =
            apiData?.mensagem_sefaz ||
            resData?.message ||
            (nextStatus === 'processando'
                ? 'NFC-e enviada para a SEFAZ via Focus NFe — aguardando retorno de autorização.'
                : 'NFC-e autorizada pela SEFAZ com sucesso via Focus NFe.');

        await persistOrderFiscalMetadata(order.id, order.payment_details, {
            status: nextStatus,
            chave: fiscalKey,
            numero: fiscalNumber,
            protocolo: fiscalProtocol,
            danfe_url: fiscalDanfeUrl,
            xml_url: fiscalXmlUrl,
            qrcode_url: fiscalQrCodeUrl,
            url_consulta_nf: fiscalConsultUrl,
            mensagem: fiscalMessage,
        });

        return {
            orderId: order.id,
            success: true,
            fiscalStatus: nextStatus,
            fiscalKey,
            fiscalNumber,
            fiscalProtocol,
            fiscalDanfeUrl,
            fiscalXmlUrl,
            fiscalQrCodeUrl,
            fiscalConsultUrl,
            fiscalMessage,
            simulated: false,
        };
    } catch (err: any) {
        const errMsg = err?.message || 'Falha de rede ao enviar nota fiscal para a Focus NFe / SEFAZ.';
        await persistOrderFiscalMetadata(order.id, order.payment_details, {
            status: 'erro_autorizacao',
            mensagem: errMsg,
        });
        return {
            orderId: order.id,
            success: false,
            fiscalStatus: 'erro_autorizacao',
            fiscalMessage: errMsg,
        };
    }
};

export const consultOrderFiscalSefaz = async (
    orderId: string,
    restaurantId: number | string
): Promise<EmitFiscalSefazResult> => {
    try {
        const response = await fetch('/api/fiscal/consult-nfe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, restaurantId: Number(restaurantId) }),
        });

        const rawText = await response.text();
        let resData: any = {};
        try {
            resData = rawText ? JSON.parse(rawText) : {};
        } catch {
            resData = {
                error: rawText.trim().startsWith('<')
                    ? `Endpoint fiscal (/api/fiscal/consult-nfe) retornou HTML inesperado (HTTP ${response.status}).`
                    : rawText,
            };
        }

        if (!response.ok || resData?.success === false || resData?.error) {
            return {
                orderId,
                success: false,
                fiscalStatus: 'erro_autorizacao',
                fiscalMessage:
                    resData?.error ||
                    (response.status === 405 || response.status === 404
                        ? `Servidor fiscal (/api/fiscal/consult-nfe) indisponível neste deploy (HTTP ${response.status}).`
                        : `Erro HTTP ${response.status} ao consultar NFC-e na Focus NFe.`),
            };
        }

        const apiData = resData?.data || {};
        const rawStatus = String(apiData?.status || '').toLowerCase();
        let fiscalStatus: EmitFiscalSefazResult['fiscalStatus'] = 'processando';
        if (rawStatus === 'autorizado') fiscalStatus = 'autorizado';
        else if (rawStatus === 'cancelado') fiscalStatus = 'cancelado';
        else if (rawStatus === 'erro_autorizacao' || rawStatus === 'rejeitado' || rawStatus === 'denegado') {
            fiscalStatus = 'erro_autorizacao';
        }

        if (typeof window !== 'undefined') window.dispatchEvent(new Event('guarafood:update-orders'));

        return {
            orderId,
            success: fiscalStatus !== 'erro_autorizacao',
            fiscalStatus,
            fiscalKey: apiData?.chave_nfe || undefined,
            fiscalNumber: apiData?.numero ? String(apiData.numero) : undefined,
            fiscalProtocol: apiData?.protocolo ? String(apiData.protocolo) : undefined,
            fiscalDanfeUrl: apiData?.caminho_danfe || undefined,
            fiscalXmlUrl: apiData?.caminho_xml_nota_fiscal || apiData?.caminho_xml || undefined,
            fiscalQrCodeUrl: apiData?.qrcode_url || undefined,
            fiscalConsultUrl: apiData?.url_consulta_nf || undefined,
            fiscalMessage: apiData?.mensagem_sefaz || 'Status consultado na Focus NFe.',
        };
    } catch (err: any) {
        return {
            orderId,
            success: false,
            fiscalStatus: 'erro_autorizacao',
            fiscalMessage: err?.message || 'Erro ao consultar NFC-e na Focus NFe.',
        };
    }
};

export const cancelOrderFiscalSefaz = async (
    orderId: string,
    restaurantId: number | string,
    justificativa: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch('/api/fiscal/cancel-nfe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, restaurantId: Number(restaurantId), justificativa }),
        });
        const rawText = await response.text();
        let resData: any = {};
        try {
            resData = rawText ? JSON.parse(rawText) : {};
        } catch {
            resData = {
                error: rawText.trim().startsWith('<')
                    ? `Endpoint fiscal (/api/fiscal/cancel-nfe) retornou HTML inesperado (HTTP ${response.status}).`
                    : rawText,
            };
        }
        if (!response.ok || resData?.success === false || resData?.error) {
            return {
                success: false,
                message:
                    resData?.error ||
                    (response.status === 405 || response.status === 404
                        ? `Servidor fiscal (/api/fiscal/cancel-nfe) indisponível neste deploy (HTTP ${response.status}).`
                        : `Erro HTTP ${response.status} ao cancelar NFC-e.`),
            };
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('guarafood:update-orders'));
        return {
            success: true,
            message: resData?.data?.mensagem_sefaz || 'NFC-e cancelada na SEFAZ com sucesso.',
        };
    } catch (err: any) {
        return {
            success: false,
            message: err?.message || 'Erro ao cancelar NFC-e na Focus NFe.',
        };
    }
};

