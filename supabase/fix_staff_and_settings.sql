
-- =======================================================================
-- 🛠️ SCRIPT DE CORREÇÃO: COLUNA EQUIPE (STAFF) E CONFIGURAÇÕES
-- =======================================================================
-- Este script garante que a coluna 'staff' exista na tabela 'restaurants'
-- para salvar garçons e gerentes, além de outras colunas essenciais.
-- =======================================================================

-- 1. Adiciona a coluna 'staff' para gerenciar a equipe (JSONB)
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]';

-- 2. Garante que outras colunas de configuração existam
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '[]';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS printer_width INTEGER DEFAULT 80;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS manual_pix_key TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS mercado_pago_credentials JSONB DEFAULT '{}';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Limpeza de Cache da API
NOTIFY pgrst, 'reload schema';

-- MENSAGEM DE SUCESSO
SELECT '✅ Coluna de equipe e configurações atualizadas com sucesso!' as status;
