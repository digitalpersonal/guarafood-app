-- Este script reseta as Políticas de Segurança (RLS) para a tabela de restaurantes para corrigir loops infinitos.

-- 1. Garante que a RLS está habilitada na tabela.
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as políticas antigas para a tabela de restaurantes. Este é o passo mais importante.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Allow all access for admins" ON public.restaurants;
DROP POLICY IF EXISTS "Allow merchant to manage their own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Permitir acesso total para administradores" ON public.restaurants;
DROP POLICY IF EXISTS "Permitir que lojistas gerenciem seu próprio restaurante" ON public.restaurants;


-- 3. Cria uma política segura para que TODOS (incluindo visitantes não logados) possam LER os restaurantes que estão ATIVOS.
CREATE POLICY "Enable read access for all users"
ON public.restaurants
FOR SELECT
USING (active = true);

-- 4. Cria uma política para que ADMINISTRADORES tenham acesso total (ver, criar, editar, deletar) a TODOS os restaurantes.
CREATE POLICY "Allow all access for admins"
ON public.restaurants
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 5. Cria uma política para que LOJISTAS (merchants) possam ver e editar APENAS o seu próprio restaurante.
CREATE POLICY "Allow merchant to manage their own restaurant"
ON public.restaurants
FOR ALL
USING (
  (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) = id
)
WITH CHECK (
  (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()) = id
);

