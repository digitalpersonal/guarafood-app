-- =======================================================================
-- 🚀 SCRIPT DEFINITIVO: Pastelaria Renovação (DADOS ORIGINAIS)
-- =======================================================================

BEGIN;

-- Limpeza para evitar duplicidade
DELETE FROM menu_items WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM addons WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM combos WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM menu_categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM restaurants WHERE name = 'Pastelaria Renovação';

-- 1. Cadastro do Restaurante
INSERT INTO public.restaurants (name, category, description, delivery_time, rating, image_url, payment_gateways, address, phone, delivery_fee, operating_hours, active)
VALUES (
    'Pastelaria Renovação',
    'Pastelaria, Lanches',
    'A tradição e o sabor que você já conhece, agora no GuaraFood!',
    '30-45 min',
    4.9,
    'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400',
    '{"Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"}',
    'Praça da Matriz, Guaranésia/MG',
    '35984024048',
    5.00,
    '[
        {"dayOfWeek": 0, "opens": "18:00", "closes": "00:00", "isOpen": true},
        {"dayOfWeek": 1, "opens": "18:00", "closes": "00:00", "isOpen": false},
        {"dayOfWeek": 2, "opens": "18:00", "closes": "00:00", "isOpen": true},
        {"dayOfWeek": 3, "opens": "18:00", "closes": "00:00", "isOpen": true},
        {"dayOfWeek": 4, "opens": "18:00", "closes": "00:00", "isOpen": true},
        {"dayOfWeek": 5, "opens": "18:00", "closes": "00:00", "isOpen": true},
        {"dayOfWeek": 6, "opens": "18:00", "closes": "00:00", "isOpen": true}
    ]',
    true
);

-- 2. Cadastro de Categorias
INSERT INTO public.menu_categories (restaurant_id, name, display_order)
VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Lanches', 0),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Lanches Especiais', 1),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Porções', 2),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Pastéis', 3),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Pastéis Doces', 4),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Hot Dogs', 5),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Bebidas', 6);

-- 3. Cadastro do Banco de Adicionais (Nomes originais da Renovação)
INSERT INTO public.addons (restaurant_id, name, price)
VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Hambúrguer 90g', 5.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Salsicha', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Queijo', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Presunto', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Ovo', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Bacon', 5.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Catupiry', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Cheddar', 3.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Frango', 5.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Milho', 2.00),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Batata palha', 2.00);

-- 4. Cadastro dos Itens
DO $$
DECLARE
    v_rest_id INT := (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
    v_cat_pasteis INT := (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = v_rest_id);
    v_cat_lanches INT := (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = v_rest_id);
    v_addon_ids INT[] := ARRAY(SELECT id FROM addons WHERE restaurant_id = v_rest_id);
BEGIN
    -- Exemplo de item com opcionais corretos
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url, available_addon_ids) VALUES
    (v_rest_id, v_cat_pasteis, 'CARNE', '', 12.00, 'https://images.pexels.com/photos/10884615/pexels-photo-10884615.jpeg?auto=compress&cs=tinysrgb&w=400', v_addon_ids),
    (v_rest_id, v_cat_lanches, 'X-BURGUER', 'Hambúrguer, presunto e mussarela', 15.00, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400', v_addon_ids);
END $$;

COMMIT;