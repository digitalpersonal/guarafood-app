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

    if (!serviceRoleKey) throw new Error("Missing SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { restaurantData, userData } = await req.json()
    const { email, password } = userData
    const emailLower = email.toLowerCase().trim();

    // 1. GARANTIR RESTAURANTE
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

    // 2. LIMPEZA ATÔMICA (A solução definitiva)
    // Remove qualquer perfil órfão que use o mesmo nome para evitar 'Database Error' no trigger
    await supabaseAdmin.from('profiles').delete().eq('name', restaurantData.name);

    // 3. GERENCIAMENTO DE USUÁRIO AUTH
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const userFound = users.find(u => u.email?.toLowerCase() === emailLower);

    const userMetadata = {
        role: 'merchant',
        name: restaurantData.name,
        restaurantId: restaurantId
    };

    let userId;

    if (userFound) {
        userId = userFound.id;
        // Atualiza usuário existente
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            user_metadata: userMetadata,
            email_confirm: true
        });
        if (updErr) throw updErr;
    } else {
        // Cria novo usuário
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: emailLower,
            password: password,
            email_confirm: true,
            user_metadata: userMetadata
        });
        
        // Se der erro de banco aqui, é porque o trigger do Supabase tentou inserir algo duplicado
        if (userError) {
            console.error("Auth Create Error:", userError);
            throw new Error(`Erro Crítico de Banco: ${userError.message}. Tente rodar o script SQL de limpeza.`);
        }
        userId = newUser.user?.id;
    }

    // 4. SINCRONIZAÇÃO DE PERFIL
    if (userId) {
        // Força a inserção/atualização do perfil lojista
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({ 
            id: userId, 
            name: restaurantData.name,
            role: 'merchant',
            "restaurantId": restaurantId
        }, { onConflict: 'id' });
        
        if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Fatal Error in Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})