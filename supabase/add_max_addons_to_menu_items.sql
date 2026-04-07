
-- ==============================================================================
-- 🚀 ADICIONAR LIMITE DE ADICIONAIS (MAX_ADDONS)
-- ==============================================================================

-- Adiciona a coluna max_addons à tabela menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS max_addons INTEGER;

-- Comentário para documentação
COMMENT ON COLUMN public.menu_items.max_addons IS 'Limite máximo de adicionais que podem ser selecionados para este item';

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
