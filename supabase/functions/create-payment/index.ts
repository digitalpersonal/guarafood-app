
// supabase/functions/create-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://xfousvlrhinlvrpryscy.supabase.co';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceRoleKey) {
        throw new Error("ERRO: SERVICE_ROLE_KEY não configurada.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { restaurantId, orderData } = await req.json()

    // 1. Buscar credenciais do Mercado Pago
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('mercado_pago_credentials, name')
      .eq('id', restaurantId)
      .single()

    if (restError || !restaurant?.mercado_pago_credentials?.accessToken) {
        throw new Error("Token do Mercado Pago não configurado para este restaurante.")
    }

    const accessToken = restaurant.mercado_pago_credentials.accessToken

    // 2. SALVAR PEDIDO NO BANCO COM STATUS PENDENTE
    // Inserimos a preferência de sachês dentro do objeto customer_address para compatibilidade
    const customerAddressWithPrefs = {
        ...orderData.customerAddress,
        wantsSachets: orderData.wantsSachets === true
    };

    const dbOrderPayload = {
      restaurant_id: orderData.restaurantId,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      customer_address: customerAddressWithPrefs,
      items: orderData.items,
      total_price: orderData.totalPrice,
      restaurant_name: orderData.restaurantName,
      restaurant_address: orderData.restaurantAddress,
      restaurant_phone: orderData.restaurantPhone,
      payment_method: 'Pix Automático',
      coupon_code: orderData.couponCode,
      discount_amount: orderData.discountAmount,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.deliveryFee,
      status: 'Aguardando Pagamento',
      payment_status: 'pending',
      timestamp: new Date().toISOString()
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(dbOrderPayload)
      .select()
      .single()

    if (orderError) throw new Error("Erro ao criar pedido no banco: " + orderError.message)
    
    // 3. Gerar Pagamento no Mercado Pago
    const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook?restaurantId=${restaurantId}`;

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: Number(orderData.totalPrice.toFixed(2)),
        description: `Pedido #${order.id.substring(0,6)} - ${restaurant.name}`,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@guarafood.com',
          first_name: orderData.customerName.split(' ')[0],
          last_name: 'Cliente'
        },
        external_reference: order.id, 
        notification_url: notificationUrl
      })
    })

    const paymentData = await mpResponse.json()

    if (!mpResponse.ok) {
      await supabaseAdmin.from('orders').update({ status: 'Cancelado' }).eq('id', order.id);
      throw new Error(`Mercado Pago: ${paymentData.message || 'Erro ao gerar Pix'}`)
    }
    
    if (paymentData.id) {
         await supabaseAdmin.from('orders').update({ payment_id: String(paymentData.id) }).eq('id', order.id);
    }

    return new Response(
      JSON.stringify({ 
          orderId: order.id, 
          qrCode: paymentData.point_of_interaction?.transaction_data?.qr_code, 
          qrCodeBase64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
