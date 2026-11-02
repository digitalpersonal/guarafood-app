-- =============================================================================
-- 🚀 GUARAFOOD: CORREÇÃO DEFINITIVA DE PROMOÇÕES (TARGET_TYPE, UPSELL, DIAS E HORÁRIOS)
-- =============================================================================
-- Execute este script no SQL Editor do Supabase para corrigir a restrição NOT NULL 
-- em 'target_type' / 'target_ids' e garantir todas as colunas de Compre e Leve / Upsell.

-- 1. Ajustar restrições da tabela PROMOTIONS para evitar erro de NOT NULL
ALTER TABLE public.promotions ALTER COLUMN target_type DROP NOT NULL;
ALTER TABLE public.promotions ALTER COLUMN target_ids DROP NOT NULL;
ALTER TABLE public.promotions ALTER COLUMN target_type SET DEFAULT 'CATEGORY'::public.promotion_target;
ALTER TABLE public.promotions ALTER COLUMN target_ids SET DEFAULT '{}';

-- 2. Garantir colunas completas de Promoções (Upsell, Compre e Leve, Dias e Horários)
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text,
ADD COLUMN IF NOT EXISTS upsell_title text,
ADD COLUMN IF NOT EXISTS upsell_description text,
ADD COLUMN IF NOT EXISTS upsell_price numeric(10,2),
ADD COLUMN IF NOT EXISTS upsell_options text[];

-- 3. Garantir colunas na tabela MENU_ITEMS (Grupos de personalização e disponibilidade)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS option_groups JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text;

-- 4. Notificar PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';
