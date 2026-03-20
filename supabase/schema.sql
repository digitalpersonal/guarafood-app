
-- Adiciona a coluna de disponibilidade se ela não existir
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- Garante que todos os itens existentes estejam marcados como disponíveis
UPDATE public.menu_items 
SET available = true 
WHERE available IS NULL;

-- Recarrega o cache do PostgREST para reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
