
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

        // 1. Configuração de Segurança (Chave Mestra com Fallback)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://xfousvlrhinlvrpryscy.supabase.co';
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey) {
            console.error("CRITICAL: Service Role Key missing in Webhook.");
            return new Response("Server Config Error", { status: 500, headers: corsHeaders });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 3. Buscar credenciais do Restaurante e Gateway
        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select('mercado_pago_credentials, asaas_credentials, selected_payment_gateway')
            .eq('id', restaurantId)
            .single()

        if (error || (!restaurant?.mercado_pago_credentials?.accessToken && !restaurant?.asaas_credentials?.apiKey)) {
            console.error(`Credentials missing/error for restaurant ${restaurantId}:`, error);
            return new Response("Restaurant credentials not found", { status: 200, headers: corsHeaders })
        }

        const gateway = restaurant.selected_payment_gateway || 'mercadopago';

        // 4. Consultar API do Gateway
        try {
            let orderId, status;
            
            if (gateway === 'mercadopago') {
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
                orderId = paymentInfo.external_reference;
                status = paymentInfo.status === 'approved' ? 'paid' : 'pending';
            } else {
                // Asaas
                if (body.event !== 'PAYMENT_RECEIVED') {
                     return new Response("Event Ignored", { status: 200, headers: corsHeaders })
                }
                orderId = body.payment.externalReference;
                status = 'paid';
            }

            console.log(`Order ${orderId} Status: ${status}`);

            if (status === 'paid' && orderId) {
                const { error: updateError } = await supabaseAdmin
                    .from('orders')
                    .update({ 
                        status: 'Novo Pedido',
                        payment_status: 'paid'
                    })
                    .eq('id', orderId);
                
                if (updateError) {
                    console.error("Failed to update order in DB:", updateError);
                } else {
                    console.log(`Order ${orderId} confirmed!`);
                }
            }
        } catch (fetchError) {
            console.error("Error fetching from Gateway:", fetchError);
        }

        return new Response("Webhook Processed", { status: 200, headers: corsHeaders })
    }

    return new Response("Event Ignored", { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error("Webhook Internal Error:", err);
    return new Response(`Webhook Error Handled`, { status: 200, headers: corsHeaders })
  }
})
