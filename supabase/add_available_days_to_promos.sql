-- ==============================================================================
-- 🚀 GUARAFOOD: DIAS DA SEMANA PARA PROMOÇÕES (SEGUNDA A QUINTA, ETC)
-- ==============================================================================
-- Este script adiciona o suporte a dias específicos da semana para promoções
-- (ex: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado)

-- 1. Promoções em Destaque no Topo do Cardápio e Tela Inicial (featured_promos)
ALTER TABLE featured_promos 
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}';

-- 2. Promoções de Desconto em Itens/Cardápio (promotions)
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS available_days integer[] DEFAULT '{0,1,2,3,4,5,6}';

-- 3. Comentários explicativos
COMMENT ON COLUMN featured_promos.available_days IS 'Dias da semana ativos: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb';
COMMENT ON COLUMN promotions.available_days IS 'Dias da semana ativos: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb';

-- 4. Atualizar promoções existentes sem dias para ficarem ativas todos os dias
UPDATE featured_promos 
SET available_days = '{0,1,2,3,4,5,6}' 
WHERE available_days IS NULL;

UPDATE promotions 
SET available_days = '{0,1,2,3,4,5,6}' 
WHERE available_days IS NULL;
