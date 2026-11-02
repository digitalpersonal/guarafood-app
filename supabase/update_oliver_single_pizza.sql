-- ==============================================================================
-- 🚀 AJUSTE DA PROMOÇÃO DA OLIVER (EXCLUSIVAMENTE PIZZA: 1 SABOR + 1 BORDA)
-- ==============================================================================

UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "sabor_pizza_oliver",
    "title": "Escolha o Sabor da Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Calabresa", "price": 0},
      {"name": "Mussarela", "price": 0},
      {"name": "Frango com Catupiry", "price": 0},
      {"name": "Marguerita", "price": 0},
      {"name": "Portuguesa", "price": 0}
    ]
  },
  {
    "id": "borda_pizza_oliver",
    "title": "Borda da Pizza",
    "minSelections": 0,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00}
    ]
  }
]'::jsonb
WHERE title ILIKE '%oliver%' OR description ILIKE '%oliver%';

UPDATE public.promotions
SET option_groups = '[
  {
    "id": "sabor_pizza_oliver",
    "title": "Escolha o Sabor da Pizza",
    "minSelections": 1,
    "maxSelections": 1,
    "options": [
      {"name": "Calabresa", "price": 0},
      {"name": "Mussarela", "price": 0},
      {"name": "Frango com Catupiry", "price": 0},
      {"name": "Marguerita", "price": 0},
      {"name": "Portuguesa", "price": 0}
    ]
  },
  {
    "id": "borda_pizza_oliver",
    "title": "Borda da Pizza",
    "minSelections": 0,
    "maxSelections": 1,
    "options": [
      {"name": "Sem Borda Recheada", "price": 0},
      {"name": "Borda de Catupiry", "price": 6.00},
      {"name": "Borda de Cheddar", "price": 6.00}
    ]
  }
]'::jsonb
WHERE name ILIKE '%oliver%' OR description ILIKE '%oliver%';

NOTIFY pgrst, 'reload schema';
