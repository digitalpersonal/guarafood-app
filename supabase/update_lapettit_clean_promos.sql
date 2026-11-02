-- ==============================================================================
-- 🚀 SCRIPT SQL: CORREÇÃO DAS PROMOÇÕES DA LAPETTIT (SEPARADAS CORRETAMENTE)
-- ==============================================================================

DO $$
DECLARE
    v_lapettit_id INT;
BEGIN
    SELECT id INTO v_lapettit_id FROM public.restaurants WHERE name ILIKE '%lapettit%' LIMIT 1;
    
    IF v_lapettit_id IS NOT NULL THEN
        -- 1. Atualizar ESPECIFICAMENTE a promoção de 6 Esfihas (Somente esfihas)
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
              {"name": "Palmito", "price": 0},
              {"name": "Milho com Bacon", "price": 0}
            ]
          }
        ]'::jsonb
        WHERE restaurant_id = v_lapettit_id AND (title ILIKE '%esfiha%' OR description ILIKE '%esfiha%');

        -- 2. Atualizar ESPECIFICAMENTE a promoção de Suco Natural (Somente sucos)
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

        -- 3. Atualizar ESPECIFICAMENTE a promoção de Açaí (Somente acompanhamentos de açaí)
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
