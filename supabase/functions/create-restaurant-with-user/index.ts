
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
        const cleanEmail = email.toLowerCase().trim();
        
        // Verifica se o email já existe na tabela de perfis (mais rápido que listar todos no Auth)
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

        let userId = existingProfile?.id;

        // Se não achou no perfil, tenta listar no Auth (backup para usuários sem perfil)
        if (!userId) {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
            userId = foundUser?.id;
        }

        if (userId) {
            // USUÁRIO JÁ EXISTE: APENAS ATUALIZA
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
                        warning: "Restaurante salvo. Mas não foi possível atualizar a senha do usuário existente: " + updateAuthError.message 
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        } else {
            // USUÁRIO NÃO EXISTE: CRIA NOVO
            const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });

            if (userError) {
                // Se der "Database error", o usuário pode ter sido criado no Auth mas o trigger de Profile falhou
                // Tentamos uma atualização forçada como último recurso
                if (userError.message.includes('Database error') || userError.message.includes('already registered')) {
                     return new Response(
                        JSON.stringify({ 
                            restaurantId, 
                            warning: "Restaurante salvo, mas houve um conflito no banco ao criar o acesso (o email já pode estar em uso em outra conta). Verifique a tabela de Usuários." 
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
                }
                
                throw new Error("Erro ao criar lojista: " + userError.message);
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
