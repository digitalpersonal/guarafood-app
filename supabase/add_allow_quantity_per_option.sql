-- ==============================================================================
-- 🚀 SUPORTE A QUANTIDADE POR OPÇÃO (ALLOW_QUANTITY_PER_OPTION) EM JSONB
-- ==============================================================================
-- Como as colunas 'option_groups' em 'featured_promos', 'promotions', 'combos' 
-- e 'menu_items' armazenam estruturas JSONB, novas propriedades como 
-- "allowQuantityPerOption" são suportadas nativamente pelo PostgreSQL.
--
-- No entanto, se você precisar atualizar via SQL registros existentes 
-- (por exemplo, habilitar quantidade livre em grupos de esfihas), 
-- você pode usar comandos de atualização JSONB como o exemplo abaixo:
-- ==============================================================================

-- Exemplo: Atualizar option_groups em featured_promos para definir allowQuantityPerOption = true
-- onde o título do grupo contenha "Sabor" ou "Esfiha" e max_selections > 1.
-- (Nota: O processamento exato depende de como sua aplicação persiste os dados ou se usa o painel admin)

-- 1. Garantir que as colunas option_groups existam em todas as tabelas relevantes:
ALTER TABLE public.featured_promos ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.combos ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS option_groups JSONB;

-- 2. Notificar PostgREST para recarregar o cache do schema
NOTIFY pgrst, 'reload schema';
