-- =======================================================================
-- 🚀 SCRIPT DE SEED: Toka do Pastel
-- =======================================================================

BEGIN;

-- Limpeza para evitar duplicidade
DELETE FROM menu_items WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Toka do Pastel');
DELETE FROM menu_categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Toka do Pastel');
DELETE FROM restaurants WHERE name = 'Toka do Pastel';

-- 1. Cadastro do Restaurante
INSERT INTO public.restaurants (name, category, description, delivery_time, rating, image_url, payment_gateways, address, phone, delivery_fee, operating_hours, active)
VALUES (
    'Toka do Pastel',
    'Pastelaria, Lanches, Bebidas',
    'Os melhores pastéis e lanches da cidade!',
    '30-50 min',
    5.0,
    '',
    '{"Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"}',
    'Endereço a confirmar',
    '(00) 00000-0000',
    0.00,
    '[
        {"dayOfWeek": 0, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 1, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 2, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 3, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 4, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 5, "opens": "18:00", "closes": "23:00", "isOpen": true},
        {"dayOfWeek": 6, "opens": "18:00", "closes": "23:00", "isOpen": true}
    ]',
    true
);

-- 2. Cadastro de Categorias
INSERT INTO public.menu_categories (restaurant_id, name, display_order)
VALUES
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Pastéis Tradicionais', 0),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Pastéis Especiais', 1),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Pastéis Doces', 2),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Combos', 3),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Lanches', 4),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Bebidas', 5),
    ((SELECT id FROM restaurants WHERE name = 'Toka do Pastel'), 'Porções', 6);

-- 3. Cadastro dos Itens
DO $$
DECLARE
    v_rest_id INT := (SELECT id FROM restaurants WHERE name = 'Toka do Pastel');
    v_cat_tradicionais INT := (SELECT id FROM menu_categories WHERE name = 'Pastéis Tradicionais' AND restaurant_id = v_rest_id);
    v_cat_especiais INT := (SELECT id FROM menu_categories WHERE name = 'Pastéis Especiais' AND restaurant_id = v_rest_id);
    v_cat_doces INT := (SELECT id FROM menu_categories WHERE name = 'Pastéis Doces' AND restaurant_id = v_rest_id);
    v_cat_combos INT := (SELECT id FROM menu_categories WHERE name = 'Combos' AND restaurant_id = v_rest_id);
    v_cat_lanches INT := (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = v_rest_id);
    v_cat_bebidas INT := (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = v_rest_id);
    v_cat_porcoes INT := (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = v_rest_id);
BEGIN
    -- Pastéis Tradicionais
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_tradicionais, 'Frango Mineiro', 'Frango, palmito, milho e catupiry', 12.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de 4 Queijos', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Calabresa', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Carne', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Frango com Catupiry', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Palmito', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Pizza', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Queijo', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Queijo com Alho', '', 10.00, true),
    (v_rest_id, v_cat_tradicionais, 'Quatro Queijos II', 'Mussarela, provolone, parmesão, catupiry e bacon', 12.00, true),
    (v_rest_id, v_cat_tradicionais, 'Queijo Mineiro', 'Mussarela, milho e catupiry', 11.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Bauru', 'Presunto, mussarela, tomate e orégano', 11.00, true),
    (v_rest_id, v_cat_tradicionais, 'Pastel de Costela', 'Costela de vaca desfiada', 15.00, true),
    (v_rest_id, v_cat_tradicionais, 'Bauru de Costela', 'Costela de vaca desfiada, mussarela, tomate e orégano', 18.00, true);

    -- Pastéis Especiais
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_especiais, 'Pastel de Carne Especial', 'Carne, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', 16.00, true),
    (v_rest_id, v_cat_especiais, 'Pastel de Frango Especial', 'Frango, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', 16.00, true),
    (v_rest_id, v_cat_especiais, 'Calabresa Especial', 'Calabresa, batata palha, milho, ovo, bacon, mussarela, presunto e catupiry', 16.00, true),
    (v_rest_id, v_cat_especiais, 'Pizza Especial', 'Pizza, batata palha, milho, bacon, ovo mussarela, presunto e catupiry', 16.00, true),
    (v_rest_id, v_cat_especiais, 'Palmito Especial', 'Palmito, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', 16.00, true),
    (v_rest_id, v_cat_especiais, 'Frango Cremoso', 'Frango, creme de milho, bacon e mussarela', 17.00, true);

    -- Pastéis Doces
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate preto', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate Branco', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate Avelã', '', 16.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate com Banana', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Pastel Misto', '', 16.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Prestígio', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate com Morango', '', 17.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Chocolate branco com sonho de valsa', '', 16.00, true),
    (v_rest_id, v_cat_doces, 'Romeu e Julieta', 'Goiabada com Queijo', 14.00, true),
    (v_rest_id, v_cat_doces, 'Misto com maracujá', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Chocolate Preto com maracujá', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Chocolate branco com maracujá', '', 15.00, true),
    (v_rest_id, v_cat_doces, 'Pastel de Doce de leite', '', 14.00, true);

    -- Combos
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_combos, 'COMBO 1', '1 x SALADA + 1 x BACON + 1 XGG + 1 x BURGUER+ FRITAS COM QUEIJO - 1...', 95.00, true),
    (v_rest_id, v_cat_combos, 'COMBO 2', '2 x SALADA + 6 unidades de MINI PASTÉIS + 1 KUAT 2 litros', 45.00, true),
    (v_rest_id, v_cat_combos, 'Combo 03', '1 x TUDO + 3 un de MINI PASTÉIS + REFRIGERANTE LATA OU CERVEJA LATA', 38.00, true),
    (v_rest_id, v_cat_combos, 'COMBO 04', '1 x BACON + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', 30.00, true),
    (v_rest_id, v_cat_combos, 'COMBO 05', '1 x SALADA + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', 27.00, true),
    (v_rest_id, v_cat_combos, 'COMBO 6', '2 x BACON + FRITAS COM QUEIJO + 1 Refrigerante a disponibilidade do...', 70.00, true),
    (v_rest_id, v_cat_combos, 'Combo de Pastel', '05 un pastéis tradicional (sabores variados)+ 06 un de mini pastéis (02...', 65.00, true),
    (v_rest_id, v_cat_combos, 'Combo Família', '2 X- Bacon, 2 X-Egg...', 95.00, true),
    (v_rest_id, v_cat_combos, 'Combo 7', '2 X-Tudo duplo + 1 Refrigerante 2 lts', 80.00, true);

    -- Lanches
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_lanches, 'X salada', 'Alface, tomate, hambúrguer e queijo e presunto', 15.00, true),
    (v_rest_id, v_cat_lanches, 'X egg', 'Alface, tomate, batata palha, milho, hambúrguer, ovo, presunto, queijo', 16.00, true),
    (v_rest_id, v_cat_lanches, 'X bacon', 'Alface, tomate, batata palha, milho, hambúrguer, bacon, presunto, queijo e...', 18.00, true),
    (v_rest_id, v_cat_lanches, 'X calabresa', 'Alface, tomate, batata palha, milho, hambúrguer, calabresa, presunto, queijo...', 18.00, true),
    (v_rest_id, v_cat_lanches, 'X frango', 'Alface, tomate, batata palha, milho, hambúrguer, frango, presunto, queijo e...', 17.00, true),
    (v_rest_id, v_cat_lanches, 'X tudo', 'Alface, tomate, batata palha, milho, hambúrguer, filé de frango, calabresa, ovo...', 22.00, true),
    (v_rest_id, v_cat_lanches, 'X- burguer', 'Pão, hamburguer e queijo', 12.00, true);

    -- Bebidas
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_bebidas, 'Refrigerante lata', '', 5.00, true),
    (v_rest_id, v_cat_bebidas, 'Refrigerante 2 Litros', '', 12.00, true),
    (v_rest_id, v_cat_bebidas, 'Cerveja lata', 'Antártica SubZero', 5.00, true);

    -- Porções
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, available) VALUES
    (v_rest_id, v_cat_porcoes, 'Batata Frita', 'Simples', 20.00, true),
    (v_rest_id, v_cat_porcoes, 'Fritas com calabresa', 'Queijo, cheddar e bacon', 35.00, true),
    (v_rest_id, v_cat_porcoes, 'Calabresa acebolada', 'Calabresa com cebola', 25.00, true),
    (v_rest_id, v_cat_porcoes, 'Bolinho de Tilápia', 'Bolinho Frito de Tilápia', 30.00, true);
END $$;

COMMIT;
