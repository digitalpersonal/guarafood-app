
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
        throw new Error("Erro Crítico: SERVICE_ROLE_KEY não configurada no servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { restaurantData, userData } = await req.json()
    const { email, password } = userData

    let restaurantId;
    
    // 1. Gerenciar Restaurante
    const { data: existingRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('name', restaurantData.name)
        .single();

    if (existingRest) {
        restaurantId = existingRest.id;
        await supabaseAdmin.from('restaurants').update(restaurantData).eq('id', restaurantId);
    } else {
        const { data: newRest, error: createError } = await supabaseAdmin
            .from('restaurants')
            .insert(restaurantData)
            .select()
            .single()
        
        if (createError) throw new Error("Erro ao criar restaurante: " + createError.message);
        restaurantId = newRest.id;
    }

    // 2. Gerenciar Usuário (Nova Lógica: Buscar antes de Criar)
    if (email && password) {
        // Busca se o e-mail já existe na base do Auth
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            // Se já existe, apenas atualiza a senha e o metadado (vínculo)
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                password: password,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });

            if (updateError) throw new Error("Erro ao atualizar login existente: " + updateError.message);
        } else {
            // Se não existe, cria do zero
            const { error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });

            if (userError) throw new Error("Erro ao criar novo login: " + userError.message);
        }
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Erro na função create-restaurant:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
