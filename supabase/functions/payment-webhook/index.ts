
// supabase/functions/payment-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse query params
    const url = new URL(req.url)
    const restaurantId = url.searchParams.get('restaurantId')
    
    // Parse Body safely
    const body = await req.json().catch(() => ({}))
    const action = body.action
    const type = body.type
    const dataId = body.data?.id

    console.log(`Webhook received. Restaurant: ${restaurantId}, Action: ${action}, Type: ${type}, ID: ${dataId}`);

    // Valida se é um evento de pagamento relevante
    if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
        
        if (!dataId || !restaurantId) {
            // Se faltar dados, retornamos 200 para o MP parar de tentar, mas logamos o erro
            console.error("Missing dataId or restaurantId in webhook payload");
            return new Response("Missing Data", { status: 200, headers: corsHeaders }); 
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
        // Retorna 200 para não travar a fila do Mercado Pago
        return new Response("Restaurant credentials not found", { status: 200, headers: corsHeaders })
      }

      // 2. Consultar API do Mercado Pago para confirmar o status real
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: {
          'Authorization': `Bearer ${restaurant.mercado_pago_credentials.accessToken}`
        }
      })
      
      if (!mpResponse.ok) {
          // IMPORTANTE: Se der erro na API (comum em testes com IDs falsos),
          // respondemos 200 OK para o Mercado Pago validar o webhook com sucesso.
          console.warn("MP API returned error (likely a test notification):", await mpResponse.text());
          return new Response("Webhook Received (Test/Error ignored)", { status: 200, headers: corsHeaders });
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

      return new Response("Webhook Processed", { status: 200, headers: corsHeaders })
    }

    // Para outros eventos (como 'test.created'), retornamos 200 também
    return new Response("Ignored Event", { status: 200, headers: corsHeaders })

  } catch (err: any) {
    // Catch-all: Loga o erro mas retorna 200 para o Mercado Pago não desativar o webhook
    console.error("Internal Webhook Error:", err);
    return new Response(`Webhook Handled with Error: ${err.message}`, { status: 200, headers: corsHeaders })
  }
})
