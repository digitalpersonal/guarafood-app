
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { restaurantId, orderData } = await req.json()

    // 1. Buscar credenciais
    const { data: restaurant, error: restError } = await supabaseClient
      .from('restaurants')
      .select('mercado_pago_credentials')
      .eq('id', restaurantId)
      .single()

    if (restError || !restaurant?.mercado_pago_credentials?.accessToken) {
      throw new Error("Restaurante não configurou credenciais de pagamento (Access Token).")
    }

    const accessToken = restaurant.mercado_pago_credentials.accessToken

    // 2. SALVAR PEDIDO NO BANCO (Mapeando para snake_case)
    const dbOrderPayload = {
      restaurant_id: orderData.restaurantId,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      customer_address: orderData.customerAddress,
      items: orderData.items,
      total_price: orderData.totalPrice,
      restaurant_name: orderData.restaurantName,
      restaurant_address: orderData.restaurantAddress,
      restaurant_phone: orderData.restaurantPhone,
      payment_method: orderData.paymentMethod,
      coupon_code: orderData.couponCode,
      discount_amount: orderData.discountAmount,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.deliveryFee,
      status: 'Aguardando Pagamento',
      timestamp: new Date().toISOString()
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert(dbOrderPayload)
      .select()
      .single()

    if (orderError) throw new Error("Erro ao salvar pedido no banco: " + orderError.message)
    
    // 3. Webhook URL
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook?restaurantId=${restaurantId}`;

    // 4. Criar Pix no Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: orderData.totalPrice,
        description: `Pedido #${order.id.substring(0,6)}`,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@email.com', 
          first_name: orderData.customerName.split(' ')[0],
          last_name: 'Cliente'
        },
        external_reference: order.id, 
        notification_url: notificationUrl
      })
    })

    const paymentData = await mpResponse.json()

    if (!mpResponse.ok) {
      await supabaseClient.from('orders').update({ status: 'Cancelado' }).eq('id', order.id);
      throw new Error(`Erro Mercado Pago: ${paymentData.message || 'Verifique o token'}`)
    }
    
    // Salva o ID do pagamento no pedido
    if (paymentData.id) {
         await supabaseClient.from('orders').update({ payment_id: String(paymentData.id) }).eq('id', order.id);
    }

    const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64

    return new Response(
      JSON.stringify({ orderId: order.id, qrCode, qrCodeBase64 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
