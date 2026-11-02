-- 1. Corrige o RLS da tabela restaurants (Erro: new row violates row-level security policy)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode ler restaurantes" ON public.restaurants;
CREATE POLICY "Qualquer um pode ler restaurantes" ON public.restaurants
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Autenticados podem inserir restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem inserir restaurantes" ON public.restaurants
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anonimos podem inserir restaurantes" ON public.restaurants;
CREATE POLICY "Anonimos podem inserir restaurantes" ON public.restaurants
FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar restaurantes" ON public.restaurants;
CREATE POLICY "Autenticados podem atualizar restaurantes" ON public.restaurants
FOR UPDATE TO authenticated USING (true);

-- 2. Corrige a tabela profiles (Erro: Could not find the 'restaurantId' column)
-- Como alguma Edge Function antiga ou código pode estar usando "restaurantId" ao invés de "restaurant_id",
-- adicionamos a coluna de fallback e sincronizamos.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "restaurantId" BIGINT REFERENCES public.restaurants(id);

-- Sincroniza dados existentes
UPDATE public.profiles SET "restaurantId" = restaurant_id WHERE restaurant_id IS NOT NULL AND "restaurantId" IS NULL;
UPDATE public.profiles SET restaurant_id = "restaurantId" WHERE "restaurantId" IS NOT NULL AND restaurant_id IS NULL;

-- Cria um trigger para manter restaurant_id e "restaurantId" em sincronia
CREATE OR REPLACE FUNCTION sync_restaurant_id_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."restaurantId" IS NOT NULL THEN
        NEW.restaurant_id := NEW."restaurantId";
    ELSIF NEW.restaurant_id IS NOT NULL THEN
        NEW."restaurantId" := NEW.restaurant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_restaurant_ids ON public.profiles;
CREATE TRIGGER trg_sync_restaurant_ids
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION sync_restaurant_id_columns();

-- 3. Limpa qualquer lixo órfão que possa estar travando a criação
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- 4. Recarrega o cache do PostgREST para o Supabase reconhecer as mudanças
NOTIFY pgrst, 'reload schema';
