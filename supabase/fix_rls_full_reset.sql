-- ==============================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVO (V2) PARA RECURSÃO INFINITA DE RLS
-- Este script reseta as políticas de segurança usando funções de autenticação do Supabase
-- para evitar sub-consultas circulares entre tabelas.
-- ==============================================================================

-- Função auxiliar para obter o 'role' do usuário a partir do seu token JWT.
-- Isso evita a necessidade de consultar a tabela 'profiles' dentro de uma política.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt()->>'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para obter o 'restaurant_id' do usuário a partir do seu token JWT.
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS INT AS $$
BEGIN
  RETURN (auth.jwt()->>'user_metadata')::jsonb->>'restaurantId';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PARTE 1: CORREÇÃO DA TABELA DE RESTAURANTES

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Remove TODAS as políticas antigas.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Allow all access for admins" ON public.restaurants;
DROP POLICY IF EXISTS "Allow merchant to manage their own restaurant" ON public.restaurants;

-- Política de LEITURA para TODOS (visitantes).
CREATE POLICY "Enable read access for all users"
ON public.restaurants
FOR SELECT
USING (active = true);

-- Política de acesso TOTAL para ADMINISTRADORES.
CREATE POLICY "Allow all access for admins"
ON public.restaurants
FOR ALL
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- Política para LOJISTAS gerenciarem seu próprio restaurante.
CREATE POLICY "Allow merchant to manage their own restaurant"
ON public.restaurants
FOR ALL
USING (get_user_restaurant_id() = id)
WITH CHECK (get_user_restaurant_id() = id);


-- PARTE 2: CORREÇÃO DA TABELA DE PERFIS (PROFILES)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove TODAS as políticas antigas.
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.profiles;

-- Política para USUÁRIOS gerenciarem seu PRÓPRIO perfil.
CREATE POLICY "Allow users to manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para ADMINISTRADORES gerenciarem TODOS os perfis.
CREATE POLICY "Allow admins to manage all profiles"
ON public.profiles
FOR ALL
USING (get_user_role() = 'admin');

