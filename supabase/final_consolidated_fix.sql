-- ==============================================================================
-- SCRIPT DE CORREÇÃO FINAL, COMPLETO E CONSOLIDADO
-- Este script contém TODAS as correções necessárias em um único lugar.
-- Execute este script uma única vez para resolver todos os problemas de recursão.
-- ==============================================================================

-- PASSO 1: Criar as funções seguras que quebram o ciclo de recursão.

-- Função para obter a 'role' do usuário logado de forma segura.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  -- Esta consulta é executada com privilégios elevados, ignorando a RLS da tabela 'profiles'.
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o 'restaurant_id' do usuário logado de forma segura.
CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS INT AS $$
BEGIN
  -- Esta consulta também ignora a RLS da tabela 'profiles'.
  RETURN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter os detalhes de um restaurante específico de forma segura.
CREATE OR REPLACE FUNCTION get_restaurant_by_id_secure(p_id INT)
RETURNS SETOF restaurants AS $$
BEGIN
  -- Esta consulta é executada com privilégios elevados, ignorando a RLS.
  RETURN QUERY
  SELECT * FROM public.restaurants WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter a LISTA de restaurantes de forma segura (para o admin).
CREATE OR REPLACE FUNCTION get_restaurants_secure()
RETURNS SETOF restaurants AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.restaurants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASSO 2: Resetar e recriar as políticas da tabela 'PROFILES'

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpeza completa de todas as políticas antigas para garantir um estado limpo.
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.profiles;

-- Política para usuários gerenciarem seu PRÓPRIO perfil (esta é segura e não causa loop).
CREATE POLICY "Allow users to manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para administradores gerenciarem TODOS os perfis, usando a nova função segura.
CREATE POLICY "Allow admins to manage all profiles"
ON public.profiles
FOR ALL
USING (get_my_role() = 'admin');


-- PASSO 3: Resetar e recriar as políticas da tabela 'RESTAURANTS'

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Limpeza completa de todas as políticas antigas.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Allow all access for admins" ON public.restaurants;
DROP POLICY IF EXISTS "Allow merchant to manage their own restaurant" ON public.restaurants;

-- Política para TODOS poderem LER restaurantes que estão ativos.
CREATE POLICY "Enable read access for all users"
ON public.restaurants
FOR SELECT
USING (active = true);

-- Política para ADMINISTRADORES gerenciarem TODOS os restaurantes, usando a nova função segura.
CREATE POLICY "Allow all access for admins"
ON public.restaurants
FOR ALL
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- Política para LOJISTAS (merchants) gerenciarem seu próprio restaurante, usando a nova função segura.
CREATE POLICY "Allow merchant to manage their own restaurant"
ON public.restaurants
FOR ALL
USING (id = get_my_restaurant_id())
WITH CHECK (id = get_my_restaurant_id());
