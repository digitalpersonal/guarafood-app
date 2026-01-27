
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

    // 1. Gerenciar Restaurante
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

    // 2. Gerenciar Usuário com lógica de recuperação de erro
    if (email && password) {
        const emailLower = email.toLowerCase().trim();
        
        // Tenta listar usuários para ver se já existe (evita erro de duplicata no createUser)
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users?.find(u => u.email?.toLowerCase() === emailLower);

        if (existingUser) {
            // Se já existe, apenas atualiza
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'merchant',
                    name: restaurantData.name,
                    restaurantId: restaurantId
                }
            });
            if (updateError) throw new Error("Erro ao atualizar login existente: " + updateError.message);
        } else {
            // Tenta criar do zero
            const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
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
                // Se o erro for Database Error, o trigger handle_new_user falhou.
                // Isso acontece se houver um ID órfão na tabela profiles.
                console.error("Auth Create Error:", userError);
                throw new Error(`Erro Crítico de Banco: ${userError.message}. Por favor, execute o script SQL de limpeza "ULTIMATE" fornecido.`);
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
