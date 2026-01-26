-- =======================================================================
-- SCRIPT DE CADASTRO PARA: PASTELARIA RENOVAÇÃO
-- =======================================================================
-- Para usar: Copie todo este conteúdo, vá para o SQL Editor no seu
-- painel do Supabase e clique em "RUN".
-- =======================================================================

BEGIN;

-- Limpeza de segurança para evitar duplicatas se o script for rodado novamente
DELETE FROM menu_items WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM addons WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM combos WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM menu_categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação');
DELETE FROM restaurants WHERE name = 'Pastelaria Renovação';

-- 1. Inserir o Restaurante
INSERT INTO public.restaurants (name, category, description, delivery_time, rating, image_url, payment_gateways, address, phone, delivery_fee, operating_hours, active)
VALUES (
    'Pastelaria Renovação',
    'Pastelaria, Lanches',
    'O melhor pastel e lanches da cidade, com porções generosas e muito sabor.',
    '30-45 min',
    4.8,
    'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400',
    '{"Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"}',
    'Centro, Guaranésia/MG',
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

-- 2. Inserir Categorias
INSERT INTO public.menu_categories (restaurant_id, name, display_order)
VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Lanches', 0),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Lanches Especiais', 1),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Porções', 2),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Pastéis', 3),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Pastéis Doces', 4),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Hot Dogs', 5),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Bebidas', 6),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Cervejas', 7),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Sucos de Polpa', 8);

-- 3. Inserir Adicionais
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
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), 'Frango', 5.00);

-- 4. Inserir Itens do Cardápio

-- Lanches
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, sizes, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-BURGUER', 'Hambúrguer, presunto e mussarela', 15.00, '[{"name": "Simples", "price": 15.00}, {"name": "Duplo", "price": 17.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-BACON', 'Hambúrguer, presunto, mussarela, bacon, alface e tomate', 23.00, '[{"name": "Simples", "price": 23.00}, {"name": "Duplo", "price": 28.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-EGG', 'Hambúrguer, presunto, mussarela, ovo, alface e tomate', 23.00, '[{"name": "Simples", "price": 23.00}, {"name": "Duplo", "price": 28.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-CALABRESA', 'Hambúrguer, presunto, mussarela, calabresa, alface e tomate', 23.00, '[{"name": "Simples", "price": 23.00}, {"name": "Duplo", "price": 28.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-SALADA', 'Hambúrguer, presunto, mussarela, alface e tomate', 18.00, '[{"name": "Simples", "price": 18.00}, {"name": "Duplo", "price": 23.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-TUDO', 'Hambúrguer, presunto, mussarela, bacon, ovo, calabresa, frango, catupiry, milho, batata palha, alface e tomate', 30.00, '[{"name": "Simples", "price": 30.00}, {"name": "Duplo", "price": 35.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-EGG BACON', 'Hambúrguer, presunto, mussarela, bacon, ovo, calabresa, alface e tomate', 23.00, '[{"name": "Simples", "price": 23.00}, {"name": "Duplo", "price": 30.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-SALADÃO', 'Hambúrguer, presunto, mussarela, milho, batata palha e tomate', 18.00, '[{"name": "Simples", "price": 18.00}, {"name": "Duplo", "price": 23.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-FRANGO', 'Hambúrguer, presunto, mussarela, milho, batata palha, catupiry, alface e tomate', 23.00, '[{"name": "Simples", "price": 23.00}, {"name": "Duplo", "price": 28.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-LANCHÃO', 'Hambúrguer, presunto, mussarela, ovo, bacon, catupiry, calabresa, milho, batata palha, catupiry, alface e tomate', 28.00, '[{"name": "Simples", "price": 28.00}, {"name": "Duplo", "price": 33.00}]'::jsonb, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Lanches Especiais
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches Especiais' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-ESPECIAL', '3 Hambúrguer, presunto, mussarela, ovo, bacon, catupiry, calabresa, milho, batata palha, alface e tomate', 48.00, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Lanches Especiais' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'X-FAMÍLIA', '4 Hambúrguer, calabresa, milho, catupiry, cheddar, batata palha, presunto, mussarela, 4 ovos, alface e tomate', 60.00, 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Porções
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BATATA FRITA', '', 20.00, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BATATA FRITA COM QUEIJO', '', 23.00, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BATATA FRITA COM CHEDDAR', '', 23.00, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BATATA FRITA COM CATUPIRY', '', 23.00, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BATATA FRITA COM QUEIJO E BACON', '', 30.00, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Porções' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'PASTEIZINHOS (12 PASTÉIS)', '', 30.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Pastéis
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CARNE', '', 12.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'PIZZA', '', 12.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'FRANGO CATUPIRY', '', 12.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'QUEIJO', '', 12.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CALABRESA', '', 12.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'PORTUGUESA', '', 13.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'FRANGO MINEIRO', '', 13.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CARNE COM QUEIJO', '', 14.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), '4 QUEIJOS', '', 14.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), '4 QUEIJOS COM BACON', '', 15.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'FRANGO COM QUEIJO', '', 14.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'ANIMAL', 'Presunto, mussarela, frango, calabresa, ovo, catupiry, oregano', 30.00, 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Pastéis Doces
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis Doces' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CHOCOLATE AO LEITE', '', 12.00, 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis Doces' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CHOCOLATE MISTO', '', 12.00, 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Pastéis Doces' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'CHOCOLATE BRANCO', '', 12.00, 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Hot Dogs
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'TRADICIONAL', '', 13.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COM BACON', '', 15.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COM PIZZA', '', 15.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COM FRANGO', '', 15.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COM CALABRESA', '', 15.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COM CATUPIRY', '', 15.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Hot Dogs' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'NO POTE', '', 20.00, 'https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Bebidas
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'PEQUETITO 2L', '', 10.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COCA-COLA 2L', '', 15.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COCA-COLA 1L', '', 9.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COCA-COLA 600ML', '', 7.50, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'COCA-COLA 1,5L ZERO', '', 10.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'FANTA UVA', '', 10.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'FANTA 2L', '', 10.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'SUCO DA FLORA 1,5L', '', 7.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'SUCO FRUPIC 1L', '', 6.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'REFRIGERANTE LATA - COCA-COLA', '', 5.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'REFRIGERANTE LATA - FANTA', '', 5.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'REFRIGERANTE LATA - GUARANÁ ANTÁRTICA', '', 5.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'SUCO DA FLORA 390ML', '', 4.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'ÁGUA 500ML SEM GÁS', '', 3.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Bebidas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'ÁGUA 500ML COM GÁS', '', 4.00, 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Cervejas
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Cervejas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'SKOL 350ML', '', 5.00, 'https://images.pexels.com/photos/1269032/pexels-photo-1269032.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Cervejas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'BRAHMA 350ML', '', 5.00, 'https://images.pexels.com/photos/1269032/pexels-photo-1269032.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Cervejas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'KAISER 350ML', '', 4.00, 'https://images.pexels.com/photos/1269032/pexels-photo-1269032.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Cervejas' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'ANTÁRTICA BOA 350ML', '', 3.00, 'https://images.pexels.com/photos/1269032/pexels-photo-1269032.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Sucos de Polpa
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, sizes, image_url) VALUES
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Maracujá', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Morango', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Acerola', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Goiaba', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Abacaxi', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400'),
    ((SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação'), (SELECT id FROM menu_categories WHERE name = 'Sucos de Polpa' AND restaurant_id = (SELECT id FROM restaurants WHERE name = 'Pastelaria Renovação')), 'Suco de Abacaxi com Hortelã', 'Feito com polpa de fruta', 7.00, '[{"name": "Na Água", "price": 7.00}, {"name": "No Leite", "price": 12.00}]'::jsonb, 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=400');

COMMIT;
