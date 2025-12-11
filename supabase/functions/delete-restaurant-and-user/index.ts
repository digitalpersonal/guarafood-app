
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
    // Changed from SUPABASE_SERVICE_ROLE_KEY to SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { restaurantId } = await req.json()

    // 1. Encontrar usuários associados a este restaurante
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('restaurantId', restaurantId)

    if (profileError) throw profileError;

    // 2. Deletar Restaurante (Cascade deve limpar tabelas filhas como menu_items)
    const { error: deleteError } = await supabaseAdmin
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)

    if (deleteError) throw deleteError;

    // 3. Deletar usuários do sistema de Autenticação
    const errors = []
    for (const profile of profiles || []) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.id)
        if (deleteUserError) errors.push(deleteUserError.message)
    }

    return new Response(
      JSON.stringify({ success: true, deletedUsers: profiles?.length, errors: errors.length > 0 ? errors : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})