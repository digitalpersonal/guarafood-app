-- =======================================================================
-- 🛠️ MIGRATION: ADICIONAR CAMPOS FISCAIS NA TABELA RESTAURANTS
-- =======================================================================

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS enable_fiscal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS ie TEXT,
ADD COLUMN IF NOT EXISTS im TEXT,
ADD COLUMN IF NOT EXISTS bling_api_key TEXT,
ADD COLUMN IF NOT EXISTS fiscal_provider TEXT;

-- Forçar recarregamento do schema do PostgREST
NOTIFY pgrst, 'reload schema';
