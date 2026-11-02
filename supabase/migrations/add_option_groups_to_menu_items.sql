-- Adiciona a coluna option_groups à tabela menu_items, se não existir
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS option_groups JSONB;

-- Recarrega o cache do PostgREST para reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
