-- Add expenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.expenses (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    date TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Admins tem acesso total despesas" ON public.expenses;
CREATE POLICY "Admins tem acesso total despesas" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
