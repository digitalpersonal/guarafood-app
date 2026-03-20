
-- =======================================================================
-- 🛠️ SCRIPT DE CORREÇÃO: ACESSO PASTELARIA RENOVAÇÃO
-- =======================================================================
-- Instruções:
-- 1. Rode este script no SQL Editor do Supabase.
-- 2. Ele garante que o restaurante existe e limpa conflitos de nome.
-- 3. Após rodar, vá no Painel Admin do App -> Restaurantes.
-- 4. Edite 'Pastelaria Renovação'.
-- 5. Marque "Criar/Alterar Login".
-- 6. Digite: renovacao@guarafood.com.br / renovacao4048
-- 7. Clique em SALVAR. O sistema agora atualizará o usuário corretamente.
-- =======================================================================

DO $$
DECLARE
    rest_id INTEGER;
BEGIN
    -- Busca o ID do restaurante
    SELECT id INTO rest_id FROM public.restaurants WHERE name = 'Pastelaria Renovação' LIMIT 1;

    IF rest_id IS NOT NULL THEN
        -- Garante que o restaurante está ativo e com os dados básicos
        UPDATE public.restaurants 
        SET active = true,
            phone = '35984024048'
        WHERE id = rest_id;
        
        RAISE NOTICE 'Restaurante encontrado (ID: %). Prossiga com a alteração de login no painel do App.', rest_id;
    ELSE
        RAISE NOTICE 'Restaurante não encontrado. Use o botão "Adicionar Novo" no painel Admin do App.';
    END IF;
END $$;
