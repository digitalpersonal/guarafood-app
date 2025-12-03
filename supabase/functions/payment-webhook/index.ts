
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
    // 1. Parse da URL e verificação de query params
    const url = new URL(req.url)
    const restaurantId = url.searchParams.get('restaurantId')
    
    // 2. Parse do Body de forma segura
    let body;
    try {
        body = await req.json()
    } catch (e) {
        console.warn("Empty or invalid JSON body");
        body = {};
    }

    const action = body.action
    const type = body.type
    const dataId = body.data?.id

    console.log(`Webhook Received. RestID: ${restaurantId}, Action: ${action}, Type: ${type}, DataID: ${dataId}`);

    // Se for apenas um "ping" de teste ou algo irrelevante, retorna 200 para o MP ficar feliz.
    if (!dataId && !action) {
        return new Response("Webhook received (No data)", { status: 200, headers: corsHeaders });
    }

    // Valida se é um evento de pagamento
    if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
        
        if (!dataId || !restaurantId) {
            console.error("Missing critical data (dataId or restaurantId)");
            return new Response("Missing Data", { status: 200, headers: corsHeaders }); 
        }

        // Tenta usar chaves MY_SUPABASE_... (definidas via secrets set) ou fallback para SUPABASE_...
        const supabaseUrl = Deno.env.get('MY_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('MY_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

        if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase credentials missing in Edge Function environment.");
            // Retorna 200 para não travar o MP, mas loga erro crítico
            return new Response("Configuration Error", { status: 200, headers: corsHeaders });
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // 3. Buscar Access Token do Restaurante
        const { data: restaurant, error } = await supabaseClient
            .from('restaurants')
            .select('mercado_pago_credentials')
            .eq('id', restaurantId)
            .single()

        if (error || !restaurant?.mercado_pago_credentials?.accessToken) {
            console.error(`Credentials missing/error for restaurant ${restaurantId}:`, error);
            return new Response("Restaurant credentials not found", { status: 200, headers: corsHeaders })
        }

        // 4. Consultar API do Mercado Pago (A Verdade Absoluta)
        // Usamos try/catch aqui porque o fetch pode falhar se o ID for de teste/falso
        try {
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                headers: {
                    'Authorization': `Bearer ${restaurant.mercado_pago_credentials.accessToken}`
                }
            });
            
            if (!mpResponse.ok) {
                const errorText = await mpResponse.text();
                console.warn(`MP API Error (${mpResponse.status}):`, errorText);
                // Assume que é um teste do painel do MP com ID falso e retorna 200
                return new Response("Webhook Handled (MP API Error ignored)", { status: 200, headers: corsHeaders });
            }

            const paymentInfo = await mpResponse.json();
            const orderId = paymentInfo.external_reference;
            const status = paymentInfo.status;

            console.log(`Payment Status for Order ${orderId}: ${status}`);

            // 5. Atualizar Pedido se aprovado
            if (status === 'approved' && orderId) {
                const { error: updateError } = await supabaseClient
                    .from('orders')
                    .update({ 
                        status: 'Novo Pedido',
                        payment_details: paymentInfo
                    })
                    .eq('id', orderId);
                
                if (updateError) {
                    console.error("Failed to update order in DB:", updateError);
                } else {
                    console.log(`Order ${orderId} successfully updated to 'Novo Pedido'`);
                }
            }
        } catch (fetchError) {
            console.error("Error fetching from Mercado Pago:", fetchError);
            // Engole o erro e retorna 200
        }

        return new Response("Webhook Processed Successfully", { status: 200, headers: corsHeaders })
    }

    return new Response("Event Ignored", { status: 200, headers: corsHeaders })

  } catch (err: any) {
    // Catch-all Final: Loga o erro mas retorna 200 para o Mercado Pago não desativar o webhook
    console.error("CRITICAL INTERNAL ERROR:", err);
    return new Response(`Webhook Error Handled`, { status: 200, headers: corsHeaders })
  }
})
