-- Habilitar RLS na tabela restaurant_categories
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;

-- Política de leitura (qualquer um pode ler)
DROP POLICY IF EXISTS "Qualquer um pode ler categorias" ON public.restaurant_categories;
CREATE POLICY "Qualquer um pode ler categorias" ON public.restaurant_categories
FOR SELECT USING (true);

-- Política de inserção (apenas usuários autenticados podem inserir)
DROP POLICY IF EXISTS "Autenticados podem inserir categorias" ON public.restaurant_categories;
CREATE POLICY "Autenticados podem inserir categorias" ON public.restaurant_categories
FOR INSERT TO authenticated
WITH CHECK (true);

-- Política de atualização (apenas usuários autenticados podem atualizar)
DROP POLICY IF EXISTS "Autenticados podem atualizar categorias" ON public.restaurant_categories;
CREATE POLICY "Autenticados podem atualizar categorias" ON public.restaurant_categories
FOR UPDATE TO authenticated
USING (true);

-- Política de exclusão (apenas usuários autenticados podem excluir)
DROP POLICY IF EXISTS "Autenticados podem excluir categorias" ON public.restaurant_categories;
CREATE POLICY "Autenticados podem excluir categorias" ON public.restaurant_categories
FOR DELETE TO authenticated
USING (true);
