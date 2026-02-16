
-- =======================================================================
-- 📦 RECURSO: PRODUTO ESGOTADO / PAUSAR VENDAS
-- =======================================================================
-- Este script adiciona a inteligência de "Disponibilidade" no banco.
-- Copie tudo abaixo, cole no SQL Editor do Supabase e clique em 'RUN'.

-- 1. Cria a coluna 'available' na tabela de produtos
-- O padrão (DEFAULT) é 'true', ou seja, o item nasce "Disponível".
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- 2. Corrige itens antigos
-- Caso algum item tenha ficado sem valor nesta nova coluna, marcamos como disponível.
UPDATE public.menu_items 
SET available = true 
WHERE available IS NULL;

-- 3. Atualiza o Cache da API
-- Avisa o Supabase que a estrutura da tabela mudou para que o App reconheça a coluna.
NOTIFY pgrst, 'reload schema';

-- FIM DO SCRIPT.
-- Agora o campo "Status de Venda" no seu Painel Lojista funcionará perfeitamente!
