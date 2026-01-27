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
        throw new Error("Configuração ausente: SERVICE_ROLE_KEY.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { restaurantData, userData } = await req.json()
    const { email, password } = userData

    // 1. Gerenciar Restaurante (Criar ou Atualizar)
    let restaurantId;
    const { data: existingRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('name', restaurantData.name)
        .maybeSingle();

    if (existingRest) {
        restaurantId = existingRest.id;
        await supabaseAdmin.from('restaurants').update(restaurantData).eq('id', restaurantId);
    } else {
        const { data: newRest, error: createError } = await supabaseAdmin
            .from('restaurants')
            .insert(restaurantData)
            .select()
            .single()
        
        if (createError) throw createError;
        restaurantId = newRest.id;
    }

    // 2. Gerenciar Usuário (Auth Admin API)
    if (email && password) {
        const emailLower = email.toLowerCase().trim();
        
        // Verifica se usuário já existe via Admin API (mais confiável)
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users?.find(u => u.email?.toLowerCase() === emailLower);

        if (existingUser) {
            // Atualiza usuário existente
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });
            if (updateError) throw updateError;
        } else {
            // Cria novo usuário
            const { error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: emailLower,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });
            if (userError) {
                // Se der erro aqui, provavelmente é um ID órfão na tabela 'profiles' que o SQL acima resolve
                throw new Error(`Erro ao criar login: ${userError.message}. Tente rodar o script de limpeza SQL.`);
            }
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