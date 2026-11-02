
-- =======================================================================
-- 🛠️ CORREÇÃO: COLUNAS DE CONFIGURAÇÃO DO RESTAURANTE
-- =======================================================================
-- Este script garante que todas as colunas necessárias para salvar 
-- os horários e configurações de impressora existam na tabela.

-- 1. Adiciona a coluna de horários detalhados (formato JSON)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '[]';

-- 2. Adiciona a coluna de largura da impressora térmica
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS printer_width INTEGER DEFAULT 80;

-- 3. Adiciona a coluna para a chave PIX manual (fallback)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS manual_pix_key TEXT;

-- 4. Adiciona a coluna para credenciais do Mercado Pago
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS mercado_pago_credentials JSONB DEFAULT '{}';

-- 5. Garante que a coluna 'active' existe (para suspender loja)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 7. Adiciona a coluna para o nome da impressora QZ Tray
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS printer_name TEXT;

-- 6. Limpeza de Cache da API
-- Força o Supabase a ler a nova estrutura da tabela imediatamente.
NOTIFY pgrst, 'reload schema';

-- FIM DO SCRIPT.
-- Agora você pode salvar os horários no Dashboard sem erros!
