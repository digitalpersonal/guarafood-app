
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
    
    // 1. Verifica se o restaurante já existe ou cria um novo
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

    // 2. Criar ou Atualizar Usuário no Auth
    if (email && password) {
        // Tenta criar o usuário
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: 'merchant',
                name: restaurantData.name,
                restaurantId: restaurantId
            }
        });

        // Se o erro for que o usuário já existe, vamos encontrá-lo e atualizar os dados
        if (userError && userError.message.toLowerCase().includes('already registered')) {
            // Busca o usuário na lista (filtro básico por email)
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

            if (existingUser) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                    password: password,
                    user_metadata: {
                        role: 'merchant',
                        name: restaurantData.name,
                        restaurantId: restaurantId
                    }
                });

                if (updateError) {
                    return new Response(
                        JSON.stringify({ 
                            restaurantId, 
                            warning: "Restaurante salvo, mas não foi possível atualizar a senha do usuário existente: " + updateError.message 
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
                }
            } else {
                return new Response(
                    JSON.stringify({ 
                        restaurantId, 
                        warning: "O e-mail já está em uso por outro tipo de conta e não pôde ser vinculado." 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        } else if (userError) {
            return new Response(
                JSON.stringify({ 
                    restaurantId, 
                    error: "Erro ao gerenciar acesso do lojista: " + userError.message 
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
