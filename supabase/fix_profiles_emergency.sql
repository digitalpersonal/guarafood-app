-- ==============================================================================
-- SCRIPT DE EMERGÊNCIA PARA CORRIGIR RECURSÃO NA TABELA 'PROFILES'
-- Este script remove a política de administrador que está causando o erro e garante
-- que a política básica (e segura) de acesso do próprio usuário esteja no lugar.
-- ==============================================================================

-- 1. Remove TODAS as variações possíveis da política de administrador que está causando o loop.
DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir que administradores vejam todos os perfis" ON public.profiles;


-- 2. Por segurança, remove e recria a política básica que permite a um usuário ver e editar seu próprio perfil.
-- Esta política é 100% segura e NÃO causa recursão.
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;
CREATE POLICY "Allow users to manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Habilita a segurança em nível de linha na tabela, caso esteja desabilitada.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
