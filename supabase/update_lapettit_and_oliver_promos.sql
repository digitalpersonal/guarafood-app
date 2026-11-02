-- ==============================================================================
-- 🚀 SCRIPT SQL: PROMOÇÕES DA LAPETTIT (TODOS OS DIAS DA SEMANA) E CORREÇÃO OLIVER
-- ==============================================================================

-- 1. GARANTIR CADASTRO E PROMOÇÕES DA LAPETTIT (COM AVAILABLE_DAYS ATIVO PARA TODOS OS DIAS)
INSERT INTO public.restaurants (name, category, description, delivery_time, rating, image_url, payment_gateways, address, phone, delivery_fee, active)
SELECT 'Lapettit', 'Lanches, Pizzas, Açaí', 'As melhores delícias e promoções da Lapettit!', '35-50 min', 4.9, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400', '{"Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"}', 'Centro, Guaranésia/MG', '35988889999', 5.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.restaurants WHERE name ILIKE '%lapettit%');

DO $$
DECLARE
    v_lapettit_id INT;
BEGIN
    SELECT id INTO v_lapettit_id FROM public.restaurants WHERE name ILIKE '%lapettit%' LIMIT 1;
    
    IF v_lapettit_id IS NOT NULL THEN
        -- Limpar promos antigas da Lapettit para atualizar com as novas regras
        DELETE FROM public.featured_promos WHERE restaurant_id = v_lapettit_id;

        -- 1. Combo 6 Esfihas (Quantidade livre por sabor, ativo em todos os dias 0..6)
        INSERT INTO public.featured_promos (restaurant_id, title, description, fixedPrice, originalPrice, imageUrl, itemIds, includeFreeDelivery, active, available_days, option_groups)
        VALUES (
            v_lapettit_id,
            'Combo 6 Esfihas Artesanais',
            'Escolha livremente entre os 6 sabores e a quantidade desejada de cada um!',
            39.90,
            54.90,
            'https://images.pexels.com/photos/10884615/pexels-photo-10884615.jpeg?auto=compress&cs=tinysrgb&w=400',
            ARRAY[]::INT[],
            true,
            true,
            ARRAY[0,1,2,3,4,5,6],
            '[
              {
                "id": "grupo_6_esfihas_lapettit",
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
        );

        -- 2. Suco Natural (Sabor único, ativo em todos os dias 0..6)
        INSERT INTO public.featured_promos (restaurant_id, title, description, fixedPrice, originalPrice, imageUrl, itemIds, includeFreeDelivery, active, available_days, option_groups)
        VALUES (
            v_lapettit_id,
            'Suco Natural 500ml Refrescante',
            'Escolha 1 sabor de suco natural da fruta.',
            8.90,
            12.00,
            'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=400',
            ARRAY[]::INT[],
            false,
            true,
            ARRAY[0,1,2,3,4,5,6],
            '[
              {
                "id": "sabor_suco_lapettit",
                "title": "Escolha o Sabor do Suco Natural",
                "minSelections": 1,
                "maxSelections": 1,
                "options": [
                  {"name": "Laranja", "price": 0},
                  {"name": "Limão", "price": 0},
                  {"name": "Abacaxi com Hortelã", "price": 2.00},
                  {"name": "Acerola", "price": 0}
                ]
              }
            ]'::jsonb
        );

        -- 3. Combo Açaí (Acompanhamento único, ativo em todos os dias 0..6)
        INSERT INTO public.featured_promos (restaurant_id, title, description, fixedPrice, originalPrice, imageUrl, itemIds, includeFreeDelivery, active, available_days, option_groups)
        VALUES (
            v_lapettit_id,
            'Combo da Tarde - Açaí 500ml',
            'Açaí cremoso com 1 acompanhamento à escolha.',
            18.90,
            24.90,
            'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400',
            ARRAY[]::INT[],
            false,
            true,
            ARRAY[0,1,2,3,4,5,6],
            '[
              {
                "id": "acai_unico_lapettit",
                "title": "Escolha 1 Acompanhamento para o Açaí",
                "minSelections": 1,
                "maxSelections": 1,
                "options": [
                  {"name": "Leite Ninho", "price": 0},
                  {"name": "Granola", "price": 0},
                  {"name": "Paçoca", "price": 0},
                  {"name": "Leite Condensado", "price": 0}
                ]
              }
            ]'::jsonb
        );
    END IF;
END $$;

-- Garantir que todas as promoções em featured_promos tenham available_days preenchido
UPDATE public.featured_promos
SET available_days = ARRAY[0,1,2,3,4,5,6]
WHERE available_days IS NULL;

-- ==============================================================================
-- 2. AJUSTAR PROMOÇÃO DA OLIVER (1 PIZZA = APENAS 1 ESCOLHA DE BORDA)
-- ==============================================================================
UPDATE public.featured_promos
SET option_groups = '[
  {
    "id": "borda_pizza_oliver",
    "title": "Borda Recheada da Pizza",
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
WHERE title ILIKE '%oliver%' OR description ILIKE '%oliver%';

UPDATE public.promotions
SET option_groups = '[
  {
    "id": "borda_pizza_oliver",
    "title": "Borda Recheada da Pizza",
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
WHERE name ILIKE '%oliver%' OR description ILIKE '%oliver%';

-- Notificar PostgREST para recarregar o cache do schema
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
