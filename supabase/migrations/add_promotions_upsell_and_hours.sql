-- =============================================================================
-- 🚀 GUARAFOOD: COLUNAS PARA PROMOÇÕES (UPSELL, COMPRE E LEVE, HORÁRIOS E DIAS)
-- =============================================================================
-- Este script adiciona suporte completo no Supabase para as novas mecânicas de promoção:
-- 1. Faixa de horário de validade (ex: 13:00 às 18:00)
-- 2. Dias da semana específicos (ex: 5,6,0 = Sexta, Sábado e Domingo)
-- 3. Promoções Compre e Leve (Upsell com preço promocional e opções de sabor)

-- 1. Tabela de Promoções
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text,
ADD COLUMN IF NOT EXISTS upsell_title text,
ADD COLUMN IF NOT EXISTS upsell_description text,
ADD COLUMN IF NOT EXISTS upsell_price numeric(10,2),
ADD COLUMN IF NOT EXISTS upsell_options text[];

-- 2. Tabela de Itens do Cardápio (para itens/combos que possuem horário exclusivo de venda, ex: Combo da Tarde)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text;

-- 3. Tabela de Categorias (para categorias de turno, ex: Almoço / Jantar)
ALTER TABLE public.menu_categories
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text;

-- 4. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
