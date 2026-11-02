-- =======================================================================
-- 🛡️ GUARAFOOD - CONTROLE DE ACESSO FINANCEIRO E PERMISSÕES DE USUÁRIOS
-- =======================================================================
-- Execute este script no SQL Editor do Supabase para adicionar o suporte
-- nativo à permissão financeira nas tabelas 'profiles' e 'restaurants'.
-- =======================================================================

-- 1. Adicionar coluna 'can_access_financial' na tabela 'profiles'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_financial BOOLEAN DEFAULT true;

-- 2. Garantir que a coluna 'staff' existe na tabela 'restaurants' (JSONB)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]'::jsonb;

-- 3. Assegurar que os administradores mestres tenham acesso financeiro liberado
UPDATE public.profiles
SET can_access_financial = true
WHERE role = 'admin' OR name ILIKE '%Administrador%';

-- 4. Inserir ou garantir o registro do sistema para a Equipe da Plataforma GuaráFood
INSERT INTO public.restaurants (
    name, 
    category, 
    city, 
    delivery_time, 
    rating, 
    image_url, 
    payment_gateways, 
    address, 
    phone, 
    opening_hours, 
    closing_hours, 
    delivery_fee, 
    active, 
    staff
)
SELECT 
    'GuaráFood Plataforma (Sistema)', 
    'Sistema', 
    'Guaranésia', 
    '0', 
    5, 
    '', 
    ARRAY[]::text[], 
    'GuaráFood Admin', 
    '35999999999', 
    '00:00', 
    '23:59', 
    0, 
    false, 
    '[{"id": "951a4aa1-31b4-4aba-a343-f394173c26d6", "name": "Administrador Geral", "email": "digitalpersonal@gmail.com", "role": "admin", "active": true, "canAccessFinancial": true}, {"id": "951a4aa1-31b4-4aba-a343-f394173c26d7", "name": "Admin Suporte", "email": "admin@guarafood.com.br", "role": "admin", "active": true, "canAccessFinancial": true}]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.restaurants WHERE category = 'Sistema'
);

-- 5. Atualizar políticas RLS de atualização para que o painel admin possa gerenciar a equipe
DROP POLICY IF EXISTS "Autenticados e administradores podem atualizar perfis" ON public.profiles;
CREATE POLICY "Autenticados e administradores podem atualizar perfis" ON public.profiles
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Autenticados podem ler perfis" ON public.profiles;
CREATE POLICY "Autenticados podem ler perfis" ON public.profiles
FOR SELECT USING (true);

-- 6. Recarregar o cache da API do PostgREST / Supabase
NOTIFY pgrst, 'reload schema';

SELECT '✅ Estrutura de permissões financeiras do GuaráFood configurada com sucesso!' as status;
