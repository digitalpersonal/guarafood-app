
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
    const url = new URL(req.url)
    const restaurantId = url.searchParams.get('restaurantId')
    
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

    console.log(`Webhook Received. RestID: ${restaurantId}, Action: ${action}, DataID: ${dataId}`);

    if (!dataId && !action) {
        return new Response("Webhook received (No data)", { status: 200, headers: corsHeaders });
    }

    if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
        
        if (!dataId || !restaurantId) {
            return new Response("Missing Data", { status: 200, headers: corsHeaders }); 
        }

        // CRITICAL FIX: Use Service Role Key
        // Changed from SUPABASE_SERVICE_ROLE_KEY to SERVICE_ROLE_KEY
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Buscar Access Token do Restaurante
        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select('mercado_pago_credentials')
            .eq('id', restaurantId)
            .single()

        if (error || !restaurant?.mercado_pago_credentials?.accessToken) {
            console.error(`Credentials missing/error for restaurant ${restaurantId}:`, error);
            return new Response("Restaurant credentials not found", { status: 200, headers: corsHeaders })
        }

        // 4. Consultar API do Mercado Pago
        try {
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                headers: {
                    'Authorization': `Bearer ${restaurant.mercado_pago_credentials.accessToken}`
                }
            });
            
            if (!mpResponse.ok) {
                console.warn(`MP API Error (${mpResponse.status})`);
                return new Response("Webhook Handled (MP API Error ignored)", { status: 200, headers: corsHeaders });
            }

            const paymentInfo = await mpResponse.json();
            const orderId = paymentInfo.external_reference;
            const status = paymentInfo.status;

            console.log(`Order ${orderId} Status: ${status}`);

            if (status === 'approved' && orderId) {
                const { error: updateError } = await supabaseAdmin
                    .from('orders')
                    .update({ 
                        status: 'Novo Pedido',
                        payment_status: 'paid',
                        payment_details: paymentInfo
                    })
                    .eq('id', orderId);
                
                if (updateError) {
                    console.error("Failed to update order in DB:", updateError);
                } else {
                    console.log(`Order ${orderId} confirmed!`);
                }
            }
        } catch (fetchError) {
            console.error("Error fetching from Mercado Pago:", fetchError);
        }

        return new Response("Webhook Processed", { status: 200, headers: corsHeaders })
    }

    return new Response("Event Ignored", { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error("Webhook Internal Error:", err);
    return new Response(`Webhook Error Handled`, { status: 200, headers: corsHeaders })
  }
})