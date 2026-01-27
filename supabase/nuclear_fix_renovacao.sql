
-- =============================================================
-- ☢️ ULTIMATE NUCLEAR CLEANUP: PASTELARIA RENOVAÇÃO
-- =============================================================
-- Execute este script no SQL Editor do Supabase para limpar 
-- completamente o e-mail e permitir a criação do acesso.
-- =============================================================

DO $$
DECLARE
    v_uid UUID;
BEGIN
    -- 1. Tenta achar o ID pelo e-mail
    SELECT id INTO v_uid FROM auth.users WHERE email = 'renovacao@guarafood.com.br';

    -- 2. Se achou o usuário, deleta TUDO relacionado a esse ID
    IF v_uid IS NOT NULL THEN
        RAISE NOTICE 'Limpando rastros do usuário ID: %', v_uid;
        
        -- Remove identidades do Auth
        DELETE FROM auth.identities WHERE user_id = v_uid;
        
        -- Remove sessões ativas
        DELETE FROM auth.sessions WHERE user_id = v_uid;
        
        -- Remove o perfil na tabela pública (causa comum de 'Database Error' em triggers)
        DELETE FROM public.profiles WHERE id = v_uid;
        
        -- Por fim, remove o usuário do Auth
        DELETE FROM auth.users WHERE id = v_uid;
        
        RAISE NOTICE '✅ Limpeza de tabelas Auth/Public concluída.';
    ELSE
        RAISE NOTICE 'ℹ️ O e-mail renovacao@guarafood.com.br não existe no Auth. Verificando perfis órfãos...';
    END IF;

    -- 3. Limpeza de emergência por nome (caso o ID tenha mudado mas o perfil tenha ficado)
    -- Procuramos no perfil pelo nome do restaurante para evitar lixo
    DELETE FROM public.profiles WHERE name ILIKE '%Pastelaria Renovação%';

    -- 4. Garante que o restaurante está pronto
    UPDATE public.restaurants 
    SET active = true,
        phone = '35984024048'
    WHERE name = 'Pastelaria Renovação';
    
    RAISE NOTICE '✅ Restaurante ativado e pronto para novo vínculo.';

END $$;

-- 5. Recarrega o cache para garantir que o sistema veja as mudanças
NOTIFY pgrst, 'reload schema';
