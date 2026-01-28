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

    // 1. Localizar ou Atualizar o Restaurante
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

    // 2. LIMPEZA PREVENTIVA (Foco no Nome)
    // Deleta o perfil órfão que trava o Trigger do Supabase
    await supabaseAdmin.from('profiles').delete().eq('name', restaurantData.name);

    // 3. Gerenciamento de Usuário no Auth
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const userFound = users.find(u => u.email?.toLowerCase() === emailLower);

    const userMetadata = {
        role: 'merchant',
        name: restaurantData.name,
        restaurantId: restaurantId
    };

    if (userFound) {
        // Se o usuário existe no Auth, apenas atualizamos a senha e o vínculo
        await supabaseAdmin.auth.admin.updateUserById(userFound.id, {
            password: password,
            user_metadata: userMetadata,
            email_confirm: true
        });
        
        // Upsert manual no perfil (sem a coluna email que não existe)
        await supabaseAdmin.from('profiles').upsert({ 
            id: userFound.id, 
            name: userMetadata.name,
            role: userMetadata.role,
            restaurantId: userMetadata.restaurantId
        });
    } else {
        // Criar novo usuário do zero
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: emailLower,
            password: password,
            email_confirm: true,
            user_metadata: userMetadata
        });

        if (userError) {
            // Caso ocorra conflito de última hora, tentamos limpar pelo nome novamente
            await supabaseAdmin.from('profiles').delete().eq('name', restaurantData.name);
            throw new Error(`Falha ao criar acesso: ${userError.message}`);
        }
        
        // Backup: Garante o registro em profiles caso o trigger automático falhe
        if (newUser.user) {
            await supabaseAdmin.from('profiles').upsert({ 
                id: newUser.user.id, 
                name: userMetadata.name,
                role: userMetadata.role,
                restaurantId: userMetadata.restaurantId
            });
        }
    }

    return new Response(
      JSON.stringify({ restaurantId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})