-- Migração para suporte a Múltiplas Impressoras e Roteamento de Categorias
-- Execute este script no SQL Editor do Supabase se desejar criar a coluna dedicada 'printers'
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS printers JSONB DEFAULT '[]';

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
