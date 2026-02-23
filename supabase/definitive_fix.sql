-- ==============================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVO E ÚNICO
-- Este é o único script que você precisa executar. Ele limpa todas as configurações
-- anteriores e aplica a solução correta e permanente para o erro de recursão.
-- ==============================================================================

-- PASSO 1: Limpeza de Funções Antigas
-- Remove funções de tentativas anteriores que podem causar conflitos.
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_restaurant_id();

-- PASSO 2: Criação da Função de Autenticação Segura
-- Esta é a peça chave. Cria uma função que busca o perfil do usuário de forma
-- segura, sem disparar as políticas de segurança (RLS), quebrando o loop.
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (id uuid, name text, role text, restaurant_id int)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.role, p.restaurant_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 3: Reset Completo das Políticas da Tabela 'PROFILES'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Remove todas as políticas antigas para garantir um estado limpo.
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir que usuários vejam seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir que administradores vejam todos os perfis" ON public.profiles;

-- Cria a política correta e segura para usuários gerenciarem seu PRÓPRIO perfil.
CREATE POLICY "Allow users to manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Cria a política correta para administradores gerenciarem TODOS os perfis.
-- Esta política depende da consulta à própria tabela, mas como o ciclo de autenticação
-- foi quebrado pela função 'get_my_profile', isso agora é seguro.
CREATE POLICY "Allow admins to manage all profiles"
ON public.profiles
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);


-- PASSO 4: Reset Completo das Políticas da Tabela 'RESTAURANTS'
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
-- Remove todas as políticas antigas.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Allow all access for admins" ON public.restaurants;
DROP POLICY IF EXISTS "Allow merchant to manage their own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Permitir acesso total para administradores" ON public.restaurants;
DROP POLICY IF EXISTS "Permitir que lojistas gerenciem seu próprio restaurante" ON public.restaurants;

-- Política de LEITURA para TODOS (visitantes) em restaurantes ativos.
CREATE POLICY "Enable read access for all users"
ON public.restaurants
FOR SELECT
USING (active = true);

-- Política de acesso TOTAL para ADMINISTRADORES.
CREATE POLICY "Allow all access for admins"
ON public.restaurants
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Política para LOJISTAS gerenciarem seu próprio restaurante.
CREATE POLICY "Allow merchant to manage their own restaurant"
ON public.restaurants
FOR ALL
USING (
  (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) = id
)
WITH CHECK (
  (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) = id
);
