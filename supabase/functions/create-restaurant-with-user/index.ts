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
    // Cria cliente com chave de serviço (Admin) para poder criar usuários
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { restaurantData, userData } = await req.json()
    const { email, password } = userData

    let restaurantId;
    
    // 1. Verifica se o restaurante já existe (pelo ID se fornecido, ou nome)
    // Se for edição/correção, o ID pode vir dentro de restaurantData ou separado.
    // Vamos assumir criação nova ou correção por nome.
    
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
        // Tenta criar o usuário
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
            console.log("Usuário já existe ou erro ao criar. Tentando atualizar metadados...", userError.message);
            // Se usuário já existe (erro 422? ou similar), tentamos achar pelo email e atualizar
            // (Nota: createUser retorna erro se email duplicado)
            
            // Buscar ID do usuário pelo email não é direto na API Admin sem listUsers, 
            // mas podemos tentar atualizar se soubermos o ID. Sem ID, é difícil.
            // Retornamos aviso.
            return new Response(
                JSON.stringify({ 
                    restaurantId, 
                    warning: "Restaurante salvo, mas usuário já existia ou deu erro. Verifique se o email já está em uso." 
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