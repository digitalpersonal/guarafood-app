-- 1. Habilitar RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Permitir leitura livre para restaurantes
DROP POLICY IF EXISTS "Qualquer um pode ler restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode ler restaurantes" ON public.restaurants
FOR SELECT USING (true);

-- 3. Permitir inserção de restaurantes (necessário para criar novos)
DROP POLICY IF EXISTS "Autenticados podem inserir restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem inserir restaurantes" ON public.restaurants
FOR INSERT TO authenticated WITH CHECK (true);

-- 4. A política mais importante: PERMITIR ATUALIZAÇÃO DO RESTAURANTE
DROP POLICY IF EXISTS "Autenticados podem atualizar restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem atualizar restaurantes" ON public.restaurants
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
