-- =============================================================================
-- 🚀 GUARAFOOD: ATUALIZAÇÃO COMPLETA DE COMBOS, GRUPOS DE OPÇÕES E PROMOÇÕES
-- =============================================================================
-- Este script garante todas as colunas necessárias no Supabase para:
-- 1. Grupos de Opções dos Itens/Combos (option_groups em JSONB)
-- 2. Limite de Adicionais Grátis (ex: no Açaí ou Combo)
-- 3. Horários de Venda (Disponibilidade Inicial e Final, ex: 13:00 às 18:00)
-- 4. Dias da Semana de Venda (ex: 5,6,0 = Sexta a Domingo)
-- 5. Mecânica de Promoções Compre e Leve (Upsell com preço e sabores)
-- =============================================================================

-- 1. TABELA MENU_ITEMS (Itens do Cardápio e Combos)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS option_groups JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS free_addon_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_addon_ids INTEGER[] DEFAULT '{}'::integer[],
ADD COLUMN IF NOT EXISTS available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT;

-- 2. TABELA PROMOTIONS (Promoções e Compre e Leve / Upsell)
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT,
ADD COLUMN IF NOT EXISTS upsell_title TEXT,
ADD COLUMN IF NOT EXISTS upsell_description TEXT,
ADD COLUMN IF NOT EXISTS upsell_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS upsell_options TEXT[];

-- 3. TABELA COMBOS (Combos rápidos)
ALTER TABLE public.combos
ADD COLUMN IF NOT EXISTS available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT;

-- 4. TABELA MENU_CATEGORIES (Categorias do Cardápio)
ALTER TABLE public.menu_categories
ADD COLUMN IF NOT EXISTS available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 5. RECARREGAR O CACHE DO SCHEMA DO SUPABASE
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- FIM DO SCRIPT. EXECUTE NO 'SQL EDITOR' DO SEU SUPABASE CLICANDO EM 'RUN'.
-- =============================================================================
