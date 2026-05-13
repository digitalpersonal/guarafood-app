
-- =======================================================================
-- 🧹 LIMPEZA PROFUNDA: CORREÇÃO DE ERRO DE BANCO (AUTH)
-- =======================================================================
-- Este script remove qualquer registro "fantasma" que esteja impedindo 
-- a criação do usuário da Pastelaria Renovação.
-- =======================================================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Localiza o ID do usuário pelo e-mail na tabela interna do Supabase
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'renovacao@guarafood.com.br';

    IF v_user_id IS NOT NULL THEN
        -- 2. Remove da tabela de perfis (public.profiles) se existir
        DELETE FROM public.profiles WHERE id = v_user_id;
        
        -- 3. Remove da tabela de autenticação (auth.users)
        DELETE FROM auth.users WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Registro fantasma removido do Auth. O e-mail agora está livre.';
    ELSE
        RAISE NOTICE 'ℹ️ Nenhum usuário encontrado com este e-mail no Auth.';
    END IF;

    -- 4. Garante que o restaurante existe para o vínculo
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE name = 'Pastelaria Renovação') THEN
        INSERT INTO public.restaurants (name, category, active, phone)
        VALUES ('Pastelaria Renovação', 'Pastelaria', true, '35984024048');
        RAISE NOTICE '✅ Restaurante criado pois não existia.';
    ELSE
        UPDATE public.restaurants SET active = true WHERE name = 'Pastelaria Renovação';
        RAISE NOTICE '✅ Restaurante Pastelaria Renovação ativado.';
    END IF;

END $$;

-- 5. Atualiza o cache do PostgREST
NOTIFY pgrst, 'reload schema';
