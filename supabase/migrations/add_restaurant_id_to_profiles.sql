-- Adiciona a coluna de restaurant_id à tabela de perfis, se não existir
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- Recarrega o cache do PostgREST para reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
