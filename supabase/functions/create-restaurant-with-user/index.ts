
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
    
    // 1. Verificar ou Criar Restaurante
    const { data: existingRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('name', restaurantData.name)
        .maybeSingle();

    if (existingRest) {
        restaurantId = existingRest.id;
        const { error: updateRestError } = await supabaseAdmin.from('restaurants').update(restaurantData).eq('id', restaurantId);
        if (updateRestError) throw new Error("Erro ao atualizar dados do restaurante: " + updateRestError.message);
    } else {
        const { data: newRest, error: createError } = await supabaseAdmin
            .from('restaurants')
            .insert(restaurantData)
            .select()
            .single()
        
        if (createError) throw new Error("Erro ao criar restaurante: " + createError.message);
        restaurantId = newRest.id;
    }

    // 2. Criar ou Atualizar Usuário no Auth
    if (email && password) {
        // Tenta buscar se o usuário já existe no auth.users
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            // Atualiza os metadados do usuário existente
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                password: password,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });
            
            if (updateAuthError) {
                return new Response(
                    JSON.stringify({ 
                        restaurantId, 
                        warning: "Restaurante salvo. Houve um problema ao atualizar o acesso do lojista: " + updateAuthError.message 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        } else {
            // Cria novo usuário
            const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });

            if (userError) {
                // Se o erro for "Database error", pode ser o trigger de profiles.
                // Retornamos um aviso mas mantemos o restaurante salvo.
                return new Response(
                    JSON.stringify({ 
                        restaurantId, 
                        warning: "Restaurante criado, mas falhou ao criar o acesso do lojista (Erro de Banco de Dados ou usuário existente). Verifique a tabela 'profiles'." 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        }
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
