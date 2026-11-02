-- ==============================================================================
-- 🚀 ADICIONAR COLUNA OPTION_GROUPS EM PROMOÇÕES, COMBOS E DESTAQUES
-- ==============================================================================

ALTER TABLE public.featured_promos ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.combos ADD COLUMN IF NOT EXISTS option_groups JSONB;

-- Notificar PostgREST para recarregar o cache do schema
NOTIFY pgrst, 'reload schema';
