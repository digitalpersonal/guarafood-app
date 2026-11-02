-- =======================================================================
-- 🏢 GUARA FOOD: SCRIPT MASTER DEFINITIVO (MIGRAÇÃO & EXCLUSÃO)
-- =======================================================================
-- Este script unificado garante que:
-- 1. Todas as colunas necessárias existam em 'restaurants', 'menu_items', 'orders'
-- 2. Todas as permissões de DELETE, UPDATE, INSERT e SELECT estejam liberadas
-- 3. A função de exclusão atômica em cascata (delete_restaurant_cascade) funcione
--    sem erros de chave estrangeira (Foreign Key).
--
-- Como executar:
-- 1. Acesse https://supabase.com/dashboard
-- 2. Abra o menu "SQL Editor"
-- 3. Cole todo este código e clique em "RUN"
-- =======================================================================

-- -----------------------------------------------------------------------
-- 1. COLUNAS ESSENCIAIS DA TABELA RESTAURANTS
-- -----------------------------------------------------------------------
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS printers JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS printer_width INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS printer_name TEXT,
ADD COLUMN IF NOT EXISTS manual_pix_key TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_credentials JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS asaas_credentials JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS disable_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_mensalistas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_kilo_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_per_kilo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_fiscal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS ie TEXT,
ADD COLUMN IF NOT EXISTS im TEXT,
ADD COLUMN IF NOT EXISTS bling_api_key TEXT,
ADD COLUMN IF NOT EXISTS fiscal_provider TEXT,
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Guaranésia',
ADD COLUMN IF NOT EXISTS marmita_start_time TEXT,
ADD COLUMN IF NOT EXISTS marmita_end_time TEXT,
ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS loyalty_program JSONB DEFAULT '{}';

-- -----------------------------------------------------------------------
-- 2. COLUNAS ESSENCIAIS EM MENU_ITEMS E MENU_CATEGORIES
-- -----------------------------------------------------------------------
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS option_groups JSONB DEFAULT '[]';

ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- -----------------------------------------------------------------------
-- 3. COLUNAS EM PROFILES (VÍNCULO COM RESTAURANTE)
-- -----------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS restaurant_id BIGINT REFERENCES public.restaurants(id),
ADD COLUMN IF NOT EXISTS "restaurantId" BIGINT REFERENCES public.restaurants(id);

-- -----------------------------------------------------------------------
-- 4. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------
-- Liberar permissões na tabela restaurants (SELECT, INSERT, UPDATE, DELETE)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode ler restaurantes" ON public.restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Qualquer um pode inserir restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode inserir restaurantes" ON public.restaurants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Qualquer um pode atualizar restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode atualizar restaurantes" ON public.restaurants FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao de restaurantes" ON public.restaurants;
CREATE POLICY "Permitir exclusao de restaurantes" ON public.restaurants FOR DELETE USING (true);

-- Liberar tabelas operacionais
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'menu_categories', 'menu_items', 'addons', 'combos', 
            'promotions', 'coupons', 'expenses', 'featured_promos'
        ])
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Acesso total %s" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Acesso total %s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------
-- 5. FUNÇÃO RPC DEFINITIVA: DELETE EM CASCATA DE RESTAURANTE
-- -----------------------------------------------------------------------
-- Exclui em ordem rigorosa para nunca violar Foreign Keys
CREATE OR REPLACE FUNCTION public.delete_restaurant_cascade(p_restaurant_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restaurant_name TEXT;
BEGIN
    -- 1. Verifica se o restaurante existe e pega o nome
    SELECT name INTO v_restaurant_name FROM public.restaurants WHERE id = p_restaurant_id;
    
    IF v_restaurant_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Restaurante não encontrado ou já excluído.');
    END IF;

    -- 2. Desvincular dependências de pedidos com mensalistas
    BEGIN 
        UPDATE public.orders SET mensalista_id = NULL WHERE restaurant_id = p_restaurant_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 3. Apagar Pedidos do restaurante
    BEGIN DELETE FROM public.orders WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 4. Apagar Mensalistas e Fidelidade
    BEGIN DELETE FROM public.mensalistas WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.customer_loyalty WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 5. Apagar Comandas e Mesas
    BEGIN DELETE FROM public.comandas WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.comandas_ativas WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.tables WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 6. Apagar Combos, Adicionais e Promoções
    BEGIN DELETE FROM public.combos WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.addons WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.featured_promos WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.promotions WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.coupons WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.expenses WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 7. Apagar Itens de Menu antes das Categorias
    BEGIN DELETE FROM public.menu_items WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.menu_categories WHERE restaurant_id = p_restaurant_id; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 8. Desvincular contas de funcionários (para não apagar o login do usuário)
    BEGIN 
        UPDATE public.profiles 
        SET restaurant_id = NULL, "restaurantId" = NULL 
        WHERE restaurant_id = p_restaurant_id OR "restaurantId" = p_restaurant_id; 
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 9. Apagar Banners vinculados
    BEGIN 
        DELETE FROM public.banners 
        WHERE target_value = v_restaurant_name OR target_value = p_restaurant_id::TEXT; 
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 10. Apagar o registro do Restaurante propriamente dito
    DELETE FROM public.restaurants WHERE id = p_restaurant_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Restaurante e todos os seus dados foram excluídos com sucesso.',
        'restaurant_id', p_restaurant_id,
        'restaurant_name', v_restaurant_name
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', SQLERRM,
        'restaurant_id', p_restaurant_id
    );
END;
$$;

-- Liberar execução da função para a API
GRANT EXECUTE ON FUNCTION public.delete_restaurant_cascade(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_restaurant_cascade(BIGINT) TO anon;

-- -----------------------------------------------------------------------
-- 6. RECARREGAR O SCHEMA DO POSTGREST
-- -----------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
