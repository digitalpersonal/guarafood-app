-- Habilitar RLS na tabela coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Remover políticas restritivas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public access to active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can manage coupons of their restaurants" ON public.coupons;
DROP POLICY IF EXISTS "Restaurant owners can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can read coupons" ON public.coupons;
DROP POLICY IF EXISTS "Restaurant owners and admins can manage coupons" ON public.coupons;

-- Política de Leitura Pública (Qualquer um pode ler cupons para visualização)
CREATE POLICY "Anyone can read coupons" ON public.coupons
FOR SELECT USING (true);

-- Política de Gerenciamento Total (Select, Insert, Update, Delete)
-- Aplica-se aos Donos dos Restaurantes OU Administradores Globais do Guarafood
CREATE POLICY "Restaurant owners and admins can manage coupons" ON public.coupons
FOR ALL USING (
  -- Verifica se o usuário autenticado é dono do restaurante
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
  OR
  -- Ou verifica se o usuário logado é um administrador master pelo email do JWT
  (auth.jwt()->>'email' IN ('admin@guarafood.com.br', 'digitalpersonal@gmail.com'))
) WITH CHECK (
  -- A mesma regra se aplica a novos registros (INSERT e UPDATE)
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
  OR
  (auth.jwt()->>'email' IN ('admin@guarafood.com.br', 'digitalpersonal@gmail.com'))
);
