-- ==============================================================================
-- SCRIPT DE EMERGÊNCIA FINAL: DESATIVAR RLS NA TABELA 'PROFILES'
-- Este script desativa a segurança em nível de linha (RLS) na tabela 'profiles'
-- como uma medida drástica para parar o erro de recursão infinita imediatamente.
-- ==============================================================================

-- Desativa a verificação de segurança na tabela 'profiles'.
-- Esta é a ação que vai parar o erro.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
