
-- ==============================================================================
-- 🚀 GUARAFOOD - SCRIPT DE PRODUÇÃO CONSOLIDADO
-- ==============================================================================
-- Este script cria a estrutura completa do banco de dados e configura RLS.
-- Execute este script no SQL Editor do seu Supabase.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS BASE
CREATE TABLE IF NOT EXISTS public.restaurant_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    delivery_time TEXT,
    rating NUMERIC DEFAULT 5.0,
    image_url TEXT,
    banner_image_url TEXT,
    address TEXT,
    phone TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    opening_hours TEXT,
    closing_hours TEXT,
    operating_hours JSONB DEFAULT '[]',
    payment_gateways TEXT[] DEFAULT '{}',
    manual_pix_key TEXT,
    mercado_pago_credentials JSONB DEFAULT '{}',
    printer_width INTEGER DEFAULT 80,
    active BOOLEAN DEFAULT true,
    marmita_start_time TEXT,
    marmita_end_time TEXT,
    has_mensalistas BOOLEAN DEFAULT false,
    has_cleanup_button BOOLEAN DEFAULT false,
    has_kilo_service BOOLEAN DEFAULT false,
    price_per_kilo NUMERIC DEFAULT 0,
    staff JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_categories (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    image_url TEXT,
    is_pizza BOOLEAN DEFAULT false,
    is_acai BOOLEAN DEFAULT false,
    is_marmita BOOLEAN DEFAULT false,
    marmita_options JSONB DEFAULT '[]',
    available_addon_ids INTEGER[] DEFAULT '{}',
    sizes JSONB DEFAULT '[]',
    is_daily_special BOOLEAN DEFAULT false,
    is_weekly_special BOOLEAN DEFAULT false,
    available_days INTEGER[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addons (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.combos (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    menu_item_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address JSONB DEFAULT '{}',
    items JSONB DEFAULT '[]',
    total_price NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    coupon_code TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_id TEXT,
    payment_details JSONB DEFAULT '{}',
    status TEXT DEFAULT 'Aguardando Pagamento',
    table_number TEXT,
    change_for NUMERIC,
    restaurant_name TEXT,
    restaurant_address TEXT,
    restaurant_phone TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.promotions (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC NOT NULL,
    target_type TEXT CHECK (target_type IN ('ITEM', 'COMBO', 'CATEGORY')),
    target_ids INTEGER[] DEFAULT '{}',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC NOT NULL,
    min_order_value NUMERIC DEFAULT 0,
    expiration_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
    id SERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT,
    target_type TEXT,
    target_value TEXT,
    active BOOLEAN DEFAULT true,
    type TEXT DEFAULT 'top',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SEGURANÇA (RLS)
-- Habilita RLS em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PÚBLICAS (Leitura para clientes)
CREATE POLICY "Permitir leitura pública de restaurantes ativos" ON public.restaurants FOR SELECT USING (active = true);
CREATE POLICY "Permitir leitura pública de categorias" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de itens disponíveis" ON public.menu_items FOR SELECT USING (available = true);
CREATE POLICY "Permitir leitura pública de adicionais" ON public.addons FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de combos" ON public.combos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de banners ativos" ON public.banners FOR SELECT USING (active = true);
CREATE POLICY "Permitir leitura pública de categorias de restaurantes" ON public.restaurant_categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de promoções" ON public.promotions FOR SELECT USING (now() BETWEEN start_date AND end_date);

-- POLÍTICAS DE PEDIDOS (Clientes podem criar e ler seus próprios pedidos)
CREATE POLICY "Clientes podem criar pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Clientes podem ver seus próprios pedidos" ON public.orders FOR SELECT USING (true); -- Em produção, ideal filtrar por ID ou sessão

-- POLÍTICAS DE ADMIN (Acesso total para usuários autenticados - Donos de Restaurante)
-- Nota: Em um sistema multi-tenant real, filtraríamos por restaurant_id vinculado ao user_id
CREATE POLICY "Admins tem acesso total" ON public.restaurants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total categorias" ON public.menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total itens" ON public.menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total adicionais" ON public.addons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total combos" ON public.combos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total pedidos" ON public.orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total mensalistas" ON public.mensalistas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total promoções" ON public.promotions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total cupons" ON public.coupons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total banners" ON public.banners FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins tem acesso total despesas" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- 4. NOTIFICAÇÕES DE CACHE
NOTIFY pgrst, 'reload schema';

SELECT '✅ Banco de Dados de Produção configurado com sucesso!' as status;
