-- ==============================================================================
-- 🚀 AJUSTE DAS PROMOÇÕES PUBLICADAS PARA AS NOVAS REGRAS DE VARIAÇÃO
-- ==============================================================================
-- Este script SQL atualiza as promoções já cadastradas (nas tabelas featured_promos
-- e promotions) para aplicar as novas regras avançadas:
-- 1. Combo 6 Esfihas: Escolha livre entre os 6 sabores com quantidade flexível 
--    por opção (allowQuantityPerOption = true, min=6, max=6).
-- 2. Promoção Duas Pizzas: Borda individual configurada para cada uma das duas pizzas.
-- 3. Suco Natural: Escolha de sabor com min=1, max=1.
-- 4. Combo da Tarde (Açaí): Exatamente um único acompanhamento (min=1, max=1).
-- ==============================================================================

-- 1. Garantir colunas JSONB de grupos de opções nas tabelas
ALTER TABLE public.featured_promos ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS option_groups JSONB;
ALTER TABLE public.combos ADD COLUMN IF NOT EXISTS option_groups JSONB;

-- ==============================================================================
-- 2. ATUALIZAR PROMOÇÃO DE 6 ESFIHAS (Permitir quantidade livre por sabor)
-- ==============================================================================
UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "grupo_6_esfihas",
    "title": "Escolha os 6 Sabores (Quantidade livre por sabor)",
    "minSelections": 6,
    "maxSelections": 6,
    "allowQuantityPerOption": true,
    "options": [
      {"name": "Carne", "price": 0},
      {"name": "Queijo", "price": 0},
      {"name": "Frango com Catupiry", "price": 0},
      {"name": "Calabresa", "price": 0},
      {"name": "Pizza", "price": 0},
      {"name": "Milho com Bacon", "price": 0}
    ]
  }
]'::jsonb
WHERE title ILIKE '%esfiha%' OR description ILIKE '%esfiha%';

-- Também atualizar na tabela promotions se houver
UPDATE public.promotions
SET option_groups = '[
  {
    "id": "grupo_6_esfihas",
    "title": "Escolha os 6 Sabores (Quantidade livre por sabor)",
    "minSelections": 6,
    "maxSelections": 6,
    "allowQuantityPerOption": true,
    "options": [
      {"name": "Carne", "price": 0},
      {"name": "Queijo", "price": 0},
      {"name": "Frango com Catupiry", "price": 0},
      {"name": "Calabresa", "price": 0},
      {"name": "Pizza", "price": 0},
      {"name": "Milho com Bacon", "price": 0}
    ]
  }
]'::jsonb
WHERE name ILIKE '%esfiha%' OR description ILIKE '%esfiha%';

-- ==============================================================================
-- 3. ATUALIZAR PROMOÇÃO DUAS PIZZAS (Bordas separadas para cada pizza)
-- ==============================================================================
UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "borda_pizza_1",
    "title": "Borda da 1ª Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00},
      {"name": "Borda de Chocolate", "price": 7.00}
    ]
  },
  {
    "id": "borda_pizza_2",
    "title": "Borda da 2ª Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00},
      {"name": "Borda de Chocolate", "price": 7.00}
    ]
  }
]'::jsonb
WHERE title ILIKE '%pizza%' OR description ILIKE '%pizza%';

UPDATE public.promotions
SET option_groups = '[
  {
    "id": "borda_pizza_1",
    "title": "Borda da 1ª Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00},
      {"name": "Borda de Chocolate", "price": 7.00}
    ]
  },
  {
    "id": "borda_pizza_2",
    "title": "Borda da 2ª Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00},
      {"name": "Borda de Chocolate", "price": 7.00}
    ]
  }
]'::jsonb
WHERE name ILIKE '%pizza%' OR description ILIKE '%pizza%';

-- ==============================================================================
-- 4. ATUALIZAR SUCO NATURAL (Escolha de sabor único)
-- ==============================================================================
UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "sabor_suco_natural",
    "title": "Escolha o Sabor do Suco Natural",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Laranja", "price": 0},
      {"name": "Limão", "price": 0},
      {"name": "Abacaxi com Hortelã", "price": 2.00},
      {"name": "Acerola", "price": 0},
      {"name": "Maracujá", "price": 2.00}
    ]
  }
]'::jsonb
WHERE title ILIKE '%suco%' OR description ILIKE '%suco%';

-- ==============================================================================
-- 5. ATUALIZAR COMBO DA TARDE / AÇAÍ (Único acompanhamento)
-- ==============================================================================
UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "acai_acompanhamento_unico",
    "title": "Escolha 1 Acompanhamento para o Açaí",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Leite Ninho", "price": 0},
      {"name": "Granola", "price": 0},
      {"name": "Paçoca", "price": 0},
      {"name": "Leite Condensado", "price": 0},
      {"name": "Cobertura de Chocolate", "price": 0},
      {"name": "Confete de Chocolate", "price": 0}
    ]
  }
]'::jsonb
WHERE title ILIKE '%açaí%' OR title ILIKE '%acai%' OR description ILIKE '%açaí%' OR description ILIKE '%acai%';

-- Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- FIM DO SCRIPT SQL
-- ==============================================================================
