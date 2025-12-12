
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
    // 1. Configuração Robusta do Cliente Supabase
    // Fallback agressivo para garantir que a URL sempre exista
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://xfousvlrhinlvrpryscy.supabase.co';
    
    // Tenta pegar a chave de serviço de várias variáveis possíveis
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceRoleKey) {
        throw new Error("ERRO DE CONFIGURAÇÃO: A chave 'SERVICE_ROLE_KEY' não foi encontrada no Supabase. Rode o comando 'npx supabase secrets set...' novamente.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { restaurantId, orderData } = await req.json()

    // 2. Buscar credenciais
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('mercado_pago_credentials')
      .eq('id', restaurantId)
      .single()

    if (restError) {
        console.error("Erro ao buscar restaurante:", restError);
        throw new Error("Restaurante não encontrado no banco de dados.");
    }

    if (!restaurant?.mercado_pago_credentials?.accessToken) {
        throw new Error("O Token do Mercado Pago não está configurado neste restaurante. Vá em Configurações > Automação.")
    }

    const accessToken = restaurant.mercado_pago_credentials.accessToken

    // 3. SALVAR PEDIDO NO BANCO
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(dbOrderPayload)
      .select()
      .single()

    if (orderError) throw new Error("Erro de Banco de Dados ao criar pedido: " + orderError.message)
    
    // 4. Webhook URL (Com Fallback Hardcoded para garantir que funcione)
    const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook?restaurantId=${restaurantId}`;

    console.log("Gerando Pix com Webhook:", notificationUrl);

    // 5. Chamada ao Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: Number(orderData.totalPrice.toFixed(2)),
        description: `Pedido #${order.id.substring(0,6)} - ${orderData.restaurantName}`,
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
      console.error("Erro MP API:", paymentData);
      await supabaseAdmin.from('orders').update({ status: 'Cancelado' }).eq('id', order.id);
      
      const errorMsg = paymentData.message || 'Erro desconhecido no Mercado Pago';
      
      if (errorMsg.includes("Unauthorized") || paymentData.status === 401) {
          throw new Error("Token do Mercado Pago inválido ou expirado.");
      }
      if (errorMsg.includes("notification_url")) {
          throw new Error("Erro na URL de notificação (Webhook).");
      }
      
      throw new Error(`Mercado Pago recusou: ${errorMsg}`)
    }
    
    // Salva o ID do pagamento no pedido
    if (paymentData.id) {
         await supabaseAdmin.from('orders').update({ payment_id: String(paymentData.id) }).eq('id', order.id);
    }

    const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64

    return new Response(
      JSON.stringify({ orderId: order.id, qrCode, qrCodeBase64 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Critical Function Error:", error);
    // IMPORTANTE: Retornamos status 200 aqui para que o cliente (Frontend)
    // consiga ler o JSON com a mensagem de erro em vez de receber um erro genérico de rede.
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido no servidor." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
