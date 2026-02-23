-- ==========================================
-- 🛡️ SCRIPT DE CORREÇÃO DE RECURSÃO RLS
-- ==========================================

-- 1. Criar função auxiliar para checar admin sem recursão
-- SECURITY DEFINER faz a função rodar com privilégios de superuser, ignorando RLS da tabela profiles
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Resetar políticas da tabela PROFILES (onde a recursão geralmente nasce)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 3. Resetar políticas da tabela RESTAURANT_CATEGORIES
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categorias visíveis para todos" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Admins podem gerenciar categorias" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Apenas admins podem inserir categorias" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Apenas admins podem deletar categorias" ON public.restaurant_categories;

CREATE POLICY "Categorias visíveis para todos" ON public.restaurant_categories
FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar categorias" ON public.restaurant_categories
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Garantir que a coluna ICON existe
ALTER TABLE public.restaurant_categories ADD COLUMN IF NOT EXISTS icon TEXT;

-- 5. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
