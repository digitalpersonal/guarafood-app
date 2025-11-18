
// supabase/functions/payment-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

serve(async (req: Request) => {
  // Parse query params
  const url = new URL(req.url)
  const restaurantId = url.searchParams.get('restaurantId')
  
  // Parse Body
  const body = await req.json().catch(() => ({}))
  const action = body.action
  const type = body.type
  const dataId = body.data?.id

  console.log(`Webhook received for restaurant ${restaurantId}. Action: ${action}, Type: ${type}, ID: ${dataId}`);

  // Valida se é um evento de pagamento relevante
  if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
    try {
        if (!dataId || !restaurantId) {
            return new Response("Missing dataId or restaurantId", { status: 400 });
        }

       const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

      // 1. Buscar Access Token do Restaurante
      const { data: restaurant, error } = await supabaseClient
        .from('restaurants')
        .select('mercado_pago_credentials')
        .eq('id', restaurantId)
        .single()

      if (error || !restaurant?.mercado_pago_credentials?.accessToken) {
        console.error("Credential missing for restaurant", restaurantId);
        return new Response("Restaurant credentials not found", { status: 400 })
      }

      // 2. Consultar API do Mercado Pago para confirmar o status real
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: {
          'Authorization': `Bearer ${restaurant.mercado_pago_credentials.accessToken}`
        }
      })
      
      if (!mpResponse.ok) {
          console.error("Failed to fetch payment from MP", await mpResponse.text());
          return new Response("MP API Error", { status: 500 });
      }

      const paymentInfo = await mpResponse.json()
      const orderId = paymentInfo.external_reference
      const status = paymentInfo.status

      console.log(`Payment ${dataId} for Order ${orderId} is ${status}`);

      // 3. Atualizar Pedido se aprovado
      if (status === 'approved' && orderId) {
           const { error: updateError } = await supabaseClient
            .from('orders')
            .update({ 
                status: 'Novo Pedido',
                payment_details: paymentInfo // Opcional: Salvar detalhes brutos para auditoria
            })
            .eq('id', orderId)
            
           if (updateError) console.error("Failed to update order", updateError);
      }

      return new Response("Webhook Processed", { status: 200 })

    } catch (err: any) {
      console.error("Webhook Error:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 500 })
    }
  }

  return new Response("Ignored", { status: 200 })
})
