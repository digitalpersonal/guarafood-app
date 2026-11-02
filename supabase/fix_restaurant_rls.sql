-- Habilitar RLS na tabela restaurants (caso não esteja)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Permitir leitura de restaurantes para todos (anônimos e autenticados)
DROP POLICY IF EXISTS "Qualquer um pode ler restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode ler restaurantes" ON public.restaurants
FOR SELECT USING (true);

-- Permitir inserção de novos restaurantes (Autenticados)
DROP POLICY IF EXISTS "Autenticados podem inserir restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem inserir restaurantes" ON public.restaurants
FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir inserção de novos restaurantes (Anônimos - caso o cadastro seja sem login prévio)
DROP POLICY IF EXISTS "Anonimos podem inserir restaurantes" ON public.restaurants;
CREATE POLICY "Anonimos podem inserir restaurantes" ON public.restaurants
FOR INSERT TO anon WITH CHECK (true);

-- Permitir atualização de restaurantes (qualquer usuário logado, ajuste se precisar restringir apenas ao dono)
DROP POLICY IF EXISTS "Autenticados podem atualizar restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem atualizar restaurantes" ON public.restaurants
FOR UPDATE TO authenticated USING (true);

-- GARANTIR que a tabela profiles também permita inserts (frequentemente associada à criação de restaurantes)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode inserir perfis" ON public.profiles;
CREATE POLICY "Qualquer um pode inserir perfis" ON public.profiles
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Qualquer um pode atualizar perfis" ON public.profiles;
CREATE POLICY "Qualquer um pode atualizar perfis" ON public.profiles
FOR UPDATE USING (true);
