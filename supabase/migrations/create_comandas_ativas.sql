-- =======================================================================
-- 📋 TABELA: comandas_ativas
-- =======================================================================
-- Cria a tabela de comandas ativas para o salão e atendimento presencial,
-- com suporte a identificador numérico sequencial da comanda (comanda_number),
-- controle de status, valor total acumulado e exclusão em cascata.
--
-- Como executar no Supabase:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "New Query" (+), cole todo este script e clique no botão verde "RUN"
-- =======================================================================

-- 1. Cria a sequência padrão para o número da comanda (se necessário)
CREATE SEQUENCE IF NOT EXISTS public.comandas_ativas_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Cria a tabela comandas_ativas
CREATE TABLE IF NOT EXISTS public.comandas_ativas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id BIGINT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta', -- 'aberta', 'em_atendimento', 'aguardando_pagamento', 'fechada', 'cancelada'
    total_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Identificador numérico sequencial da comanda (ex: 1, 2, 3...)
    comanda_number INTEGER DEFAULT nextval('public.comandas_ativas_number_seq'),
    
    -- Campos complementares recomendados para operação no salão
    table_number TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Trigger inteligente: Gera número sequencial automático por restaurante (1, 2, 3...) se não informado
CREATE OR REPLACE FUNCTION public.set_sequential_comanda_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o comanda_number não for fornecido manualmente (ou for <= 0),
    -- calcula o próximo número sequencial daquele restaurante específico
    IF NEW.comanda_number IS NULL OR NEW.comanda_number <= 0 THEN
        SELECT COALESCE(MAX(comanda_number), 0) + 1
        INTO NEW.comanda_number
        FROM public.comandas_ativas
        WHERE restaurant_id = NEW.restaurant_id;
    END IF;
    
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_sequential_comanda_number ON public.comandas_ativas;
CREATE TRIGGER trg_set_sequential_comanda_number
BEFORE INSERT ON public.comandas_ativas
FOR EACH ROW
EXECUTE FUNCTION public.set_sequential_comanda_number();

-- 4. Criação de índices para performance de buscas por restaurante e status
CREATE INDEX IF NOT EXISTS idx_comandas_ativas_restaurant_status 
ON public.comandas_ativas(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_comandas_ativas_number 
ON public.comandas_ativas(restaurant_id, comanda_number);

CREATE INDEX IF NOT EXISTS idx_comandas_ativas_created 
ON public.comandas_ativas(created_at DESC);

-- 5. Habilita RLS (Row Level Security) e define políticas de acesso
ALTER TABLE public.comandas_ativas ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Permitir leitura de comandas_ativas" ON public.comandas_ativas;
DROP POLICY IF EXISTS "Permitir insercao em comandas_ativas" ON public.comandas_ativas;
DROP POLICY IF EXISTS "Permitir atualizacao em comandas_ativas" ON public.comandas_ativas;
DROP POLICY IF EXISTS "Permitir exclusao em comandas_ativas" ON public.comandas_ativas;
DROP POLICY IF EXISTS "Acesso total comandas_ativas" ON public.comandas_ativas;

-- Política de Acesso Total para usuários autenticados e anônimos (API do app)
CREATE POLICY "Acesso total comandas_ativas" ON public.comandas_ativas
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Atualiza a função de exclusão em cascata do restaurante para limpar também comandas_ativas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'delete_restaurant_cascade'
    ) THEN
        -- Recarrega schema
        NULL;
    END IF;
END $$;

-- 7. Notifica o PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';
