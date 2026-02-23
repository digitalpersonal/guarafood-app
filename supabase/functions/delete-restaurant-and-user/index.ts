
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Credenciais do Supabase não configuradas no servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { restaurantId } = await req.json()

    if (!restaurantId) {
        throw new Error("O 'restaurantId' é obrigatório para a exclusão.");
    }

    // 1. Buscar usuários associados ANTES de deletar o restaurante para não perder a referência
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('restaurant_id', restaurantId)

    if (profileError) throw new Error("Erro ao buscar perfis de usuário associados: " + profileError.message);

    // 2. Deletar dados relacionados em CASCATA para evitar erros de chave estrangeira
    // A ordem é importante.
    const tablesToDeleteFrom = [
        'menu_items', 
        'combos', 
        'addons', 
        'promotions', 
        'coupons', 
        'expenses', 
        'orders'
    ];

    for (const table of tablesToDeleteFrom) {
        const { error: deleteRelError } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('restaurant_id', restaurantId);
        if (deleteRelError) throw new Error(`Erro ao limpar a tabela '${table}': ${deleteRelError.message}`);
    }

    // Após limpar os itens, podemos limpar as categorias
    const { error: catDeleteError } = await supabaseAdmin
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', restaurantId);
    if (catDeleteError) throw new Error(`Erro ao limpar as categorias do cardápio: ${catDeleteError.message}`);

    // 3. Deletar o restaurante principal
    const { error: deleteError } = await supabaseAdmin
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)
    if (deleteError) throw new Error("Erro ao deletar o registro do restaurante: " + deleteError.message);

    // 4. Deletar os perfis de usuário do banco de dados (se a tabela 'profiles' existir)
    if (profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);
        const { error: profileDeleteError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .in('id', profileIds);
        // Não lançar erro aqui, continuar para deletar do Auth. Apenas logar.
        if (profileDeleteError) console.error("Erro ao deletar perfis do banco: ", profileDeleteError.message);
    }

    // 5. Deletar usuários do Supabase Auth
    const authErrors = []
    for (const profile of profiles || []) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.id)
        // Ignora o erro se o usuário já não existir, mas captura outros erros.
        if (deleteUserError && deleteUserError.message !== 'User not found') {
            authErrors.push(deleteUserError.message)
        }
    }
    
    const responsePayload = { 
      success: true, 
      deletedUsers: profiles?.length, 
      errors: authErrors.length > 0 ? authErrors : null 
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Function delete-restaurant-and-user Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 } // Retorna 200 para o frontend tratar o erro
    )
  }
})
