
-- =======================================================================
-- 🛠️ SCRIPT DE CORREÇÃO: COLUNAS DA TABELA ORDERS
-- =======================================================================
-- Este script garante que todas as colunas necessárias para o checkout
-- existam na tabela 'orders'.
-- =======================================================================

-- 1. Garante que a tabela existe (caso não exista, o que é improvável mas seguro)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adiciona colunas básicas se não existirem
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address JSONB DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Novo Pedido';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- 3. Adiciona colunas avançadas (Checkout e Financeiro)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]';

-- 4. Garante o order_number (sequencial)
-- Se não existir, cria como um serial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_number') THEN
        ALTER TABLE public.orders ADD COLUMN order_number SERIAL;
    END IF;
END $$;

-- 5. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
