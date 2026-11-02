-- =======================================================================
-- 📦 RECURSO: HORÁRIO DE DISPONIBILIDADE POR PRODUTO (TURNO DA TARDE/NOITE)
-- =======================================================================
-- Permite cadastrar produtos que só vendem em horários específicos (ex: lanches após as 18:30).
-- Copie todo este conteúdo, cole no SQL Editor do Supabase e clique em 'RUN'.

-- 1. Adiciona as colunas de horário inicial e final na tabela de itens
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available_start_time TEXT,
ADD COLUMN IF NOT EXISTS available_end_time TEXT;

-- 2. Atualiza o Cache de Schema do Supabase
NOTIFY pgrst, 'reload schema';

-- FIM DO SCRIPT.
