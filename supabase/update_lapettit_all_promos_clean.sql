-- ==============================================================================
-- 🚀 SCRIPT SQL: CORREÇÃO TOTAL E SEPARAÇÃO DE PROMOÇÕES DA LAPETTIT
-- ==============================================================================
-- Garante que cada produto (Esfihas, Pizza, Suco, Açaí) tenha apenas as opções
-- corretas e exclusivas, sem misturar categorias.
-- ==============================================================================

DO $$
DECLARE
    v_lapettit_id INT;
BEGIN
    SELECT id INTO v_lapettit_id FROM public.restaurants WHERE name ILIKE '%lapettit%' LIMIT 1;
    
    IF v_lapettit_id IS NOT NULL THEN
        -- 1. PROMOÇÃO DE ESFIHAS (Exclusivamente Esfihas)
        UPDATE public.featured_promos
        SET option_groups = '[
          {
            "id": "grupo_6_esfihas",
            "title": "Escolha os 6 Sabores de Esfihas (Quantidade livre por sabor)",
            "minSelections": 6,
            "maxSelections": 6,
            "allowQuantityPerOption": true,
            "options": [
              {"name": "Carne", "price": 0},
              {"name": "Queijo", "price": 0},
              {"name": "Frango com Catupiry", "price": 0},
              {"name": "Calabresa", "price": 0},
              {"name": "Palmito", "price": 0},
              {"name": "Milho com Bacon", "price": 0}
            ]
          }
        ]'::jsonb
        WHERE restaurant_id = v_lapettit_id AND (title ILIKE '%esfiha%' OR description ILIKE '%esfiha%');

        -- 2. PROMOÇÃO DE PIZZA (Exclusivamente Pizza: 1 Sabor + 1 Borda, SEM esfihas)
        UPDATE public.featured_promos
        SET option_groups = '[
          {
            "id": "sabor_pizza_lapettit",
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
            "id": "borda_pizza_lapettit",
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
        WHERE restaurant_id = v_lapettit_id AND (title ILIKE '%pizza%' OR description ILIKE '%pizza%');

        -- 3. PROMOÇÃO DE SUCO NATURAL (Exclusivamente Sucos)
        UPDATE public.featured_promos
        SET option_groups = '[
          {
            "id": "grupo_suco_natural",
            "title": "Escolha o Sabor do Suco",
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
        WHERE restaurant_id = v_lapettit_id AND (title ILIKE '%suco%' OR description ILIKE '%suco%');

        -- 4. PROMOÇÃO DE AÇAÍ (Exclusivamente Acompanhamentos de Açaí)
        UPDATE public.featured_promos
        SET option_groups = '[
          {
            "id": "grupo_acai",
            "title": "Escolha 1 Acompanhamento para o Açaí",
            "minSelections": 1,
            "maxSelections": 1,
            "options": [
              {"name": "Leite Ninho", "price": 0},
              {"name": "Granola", "price": 0},
              {"name": "Paçoca", "price": 0},
              {"name": "Leite Condensado", "price": 0},
              {"name": "Cobertura de Chocolate", "price": 0}
            ]
          }
        ]'::jsonb
        WHERE restaurant_id = v_lapettit_id AND (title ILIKE '%açaí%' OR title ILIKE '%acai%' OR description ILIKE '%açaí%' OR description ILIKE '%acai%');
    END IF;
END $$;

-- Notificar PostgREST para recarregar o cache
NOTIFY pgrst, 'reload schema';
