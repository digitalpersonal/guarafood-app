
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
    // 1. Configuração de Segurança (Chave Mestra com Fallback)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://xfousvlrhinlvrpryscy.supabase.co';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceRoleKey) {
        throw new Error("Configuração de Servidor incompleta: SERVICE_ROLE_KEY não encontrada.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { restaurantData, userData } = await req.json()
    const { email, password } = userData

    let restaurantId;
    
    // Verifica se o restaurante já existe
    const { data: existingRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('name', restaurantData.name)
        .single();

    if (existingRest) {
        console.log(`Restaurante já existe: ${existingRest.id}. Atualizando...`);
        restaurantId = existingRest.id;
        await supabaseAdmin.from('restaurants').update(restaurantData).eq('id', restaurantId);
    } else {
        console.log(`Criando novo restaurante: ${restaurantData.name}`);
        const { data: newRest, error: createError } = await supabaseAdmin
            .from('restaurants')
            .insert(restaurantData)
            .select()
            .single()
        
        if (createError) throw createError;
        restaurantId = newRest.id;
    }

    // 2. Criar ou Atualizar Usuário no Auth
    if (email && password) {
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: 'merchant',
                name: restaurantData.name,
                restaurantId: restaurantId
            }
        })

        if (userError) {
            console.log("Aviso: Usuário já existe ou erro Auth:", userError.message);
            return new Response(
                JSON.stringify({ 
                    restaurantId, 
                    warning: "Restaurante salvo, mas usuário já existia. Verifique se o email já está em uso." 
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
