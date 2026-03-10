CREATE TABLE IF NOT EXISTS public.mensalistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  start_date DATE NOT NULL,
  next_payment_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  monthly_fee DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
