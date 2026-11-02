-- Script para corrigir RLS e permitir que qualquer restaurante atualize suas configurações e dados no painel
-- Execute este comando no SQL Editor do seu projeto Supabase

-- 1. Tabela restaurants: Permitir atualização e inserção para todos (anon e authenticated)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode ler restaurantes" ON public.restaurants
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Qualquer um pode inserir restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode inserir restaurantes" ON public.restaurants
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Qualquer um pode atualizar restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode atualizar restaurantes" ON public.restaurants
FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Tabela menu_categories: Permitir gerenciamento total
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a menu_categories" ON public.menu_categories;
CREATE POLICY "Permitir acesso total a menu_categories" ON public.menu_categories
FOR ALL USING (true) WITH CHECK (true);

-- 3. Tabela menu_items: Permitir gerenciamento total
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a menu_items" ON public.menu_items;
CREATE POLICY "Permitir acesso total a menu_items" ON public.menu_items
FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabela addons: Permitir gerenciamento total
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a addons" ON public.addons;
CREATE POLICY "Permitir acesso total a addons" ON public.addons
FOR ALL USING (true) WITH CHECK (true);

-- 5. Tabela combos: Permitir gerenciamento total
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a combos" ON public.combos;
CREATE POLICY "Permitir acesso total a combos" ON public.combos
FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabela promotions: Permitir gerenciamento total
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a promotions" ON public.promotions;
CREATE POLICY "Permitir acesso total a promotions" ON public.promotions
FOR ALL USING (true) WITH CHECK (true);

-- 7. Tabela coupons: Permitir gerenciamento total
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a coupons" ON public.coupons;
CREATE POLICY "Permitir acesso total a coupons" ON public.coupons
FOR ALL USING (true) WITH CHECK (true);

-- 8. Tabela expenses: Permitir gerenciamento total
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a expenses" ON public.expenses;
CREATE POLICY "Permitir acesso total a expenses" ON public.expenses
FOR ALL USING (true) WITH CHECK (true);

-- 9. Tabela featured_promos: Permitir gerenciamento total
ALTER TABLE public.featured_promos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total a featured_promos" ON public.featured_promos;
CREATE POLICY "Permitir acesso total a featured_promos" ON public.featured_promos
FOR ALL USING (true) WITH CHECK (true);
