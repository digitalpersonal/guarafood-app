
DO $$
DECLARE
  v_restaurant_id integer;
  v_cat_id integer;
BEGIN
  -- 1. Obter o ID do último restaurante criado
  SELECT id INTO v_restaurant_id FROM restaurants ORDER BY id DESC LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum restaurante encontrado no banco de dados.';
  END IF;

  RAISE NOTICE 'Populando cardápio para o restaurante ID: % (Hambúrgueria Du grill)', v_restaurant_id;

  -- Atualizar dados do restaurante para garantir que é o Du Grill (Opcional, remove se não quiser sobrescrever)
  UPDATE restaurants SET
    name = 'Hambúrgueria Du grill',
    category = 'Lanches, Pizza, Bebidas',
    delivery_time = '40-60 min',
    rating = 5.0,
    payment_gateways = ARRAY['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'],
    phone = '(00) 00000-0000',
    opening_hours = '18:00',
    closing_hours = '23:00',
    delivery_fee = 0,
    active = true,
    printer_width = 58,
    operating_hours = jsonb_build_array(
      jsonb_build_object('dayOfWeek', 0, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 1, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 2, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 3, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 4, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 5, 'opens', '18:00', 'closes', '23:00', 'isOpen', true),
      jsonb_build_object('dayOfWeek', 6, 'opens', '18:00', 'closes', '23:00', 'isOpen', true)
    )
  WHERE id = v_restaurant_id;

  -- 2. Category: Hambúrguer Artesanal 150g
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Hambúrguer Artesanal 150g', 1) RETURNING id INTO v_cat_id;
  
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, '1- GRILL BURGUER', 'Hambúrguer artesanal 150g, duplo queijo cheddar e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '2- GRILL SALADA', 'Hambúrguer artesanal 150g, queijo cheddar, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '3- GRILL BACON', 'Hambúrguer artesanal 150g, queijo cheddar, bacon, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '4- GRILL EGG', 'Hambúrguer artesanal 150g, queijo cheddar, ovo, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '5- GRILL BACON EGG', 'Hambúrguer artesanal 150g, queijo cheddar, ovo, bacon, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '6- GRILL GULOSEIMA', 'Hambúrguer artesanal 150g, queijo cheddar, cebola caramelizada, batata palha e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '7- GRILL FRANGÃO', 'Frango empanado, queijo cheddar, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '8- GRILL SALADA DUPLO', '2 Hambúrguer artesanal 150g, 2 queijo cheddar, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '9- GRILL BURGUER DUPLO', '2 Hambúrguer artesanal 150g, 2 queijo cheddar e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '10- GRILL CALABRESA', 'Hambúrguer artesanal 150g, queijo cheddar , calabresa, alface, tomate e pão brioche', 0, true),
  (v_restaurant_id, v_cat_id, '11- GRILL TUDO', 'Hambúrguer artesanal 150g, queijo cheddar, ovo, .bacon, calabresa, catupiry, milho, batata palha, alface, tomate e pão brioche.', 0, true),
  (v_restaurant_id, v_cat_id, 'Adicional de Batata Frita', 'Porção adicional', 0, true);

  -- 3. Category: Hambúrguer Industrial 90g
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Hambúrguer Industrial 90g', 2) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, '12- X- BURGUER', 'Hambúrguer 90 gramas, queijo mussarela e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '13- X- SALADA', 'Hambúrguer 90 gramas, queijo mussarela, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '14- X- BACON', 'Hambúrguer 90 gramas, queijo mussarela, bacon, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '15- X- EGG', 'Hambúrguer 90 gramas, ovo, queijo mussarela, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '16- X- BACON EGG', 'Hambúrguer 90 gramas, ovo, bacon, queijo mussarela, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '17- X- FRANGO', 'Filé de frango, queijo mussarela, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '18- X - VEGETARIANO', 'Ovo, queijo mussarela, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '19- X - SALADA DUPLO', '2 Hambúrguer 90 gramas, 2 queijo mussarela, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '20- X - BURGUER DUPLO', '2 Hambúrguer 90 gramas, 2 queijo mussarela e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '21- X - SALADÃO', 'Hambúrguer 90 gramas, queijo mussarela, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '22- X-CALABRESA', 'Hambúrguer 90 gramas, queijo mussarela, calabresa, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '23- X-DOG', '2 Salsichas, bacon, calabresa, queijo mussarela, milho, batata palha, alface, tomate e pão de hambúrguer', 0, true),
  (v_restaurant_id, v_cat_id, '24- X - TUDO', 'Hambúrguer 90g , queijo mussarela, ovo, .bacon, calabresa, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer.', 0, true),
  (v_restaurant_id, v_cat_id, 'Adicional de Batata Frita', 'Porção adicional', 0, true);

  -- 4. Category: Porções
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Porções', 3) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, '25- BATATA FRITA', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '26- BATATA FRITA C/CALABRESA', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '27- BATATA FRITA C/BACON', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '28- BATATA FRITA C/MUSSARELA E BACON', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '29- BATATA MALUCA', 'Mussarela, bacon e calabresa', 0, true),
  (v_restaurant_id, v_cat_id, '30- FRANGO À PASSARINHO C/BATATA FRITA', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '31- CALABRESA ACEBOLADA C/FRITAS', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '32- CONTRA FILÉ ACEBOLADO C/FRITAS', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '33- PROVOLONE À MILANESA', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '34- ÍSCAS DE FILÉ DE FRANGO EMPANADO C/FRITAS', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '35- TORRESMO C/MANDIOCA', 'Porção Quente', 0, true),
  (v_restaurant_id, v_cat_id, '36- SALAME C/ AZEITONAS', 'Porção Fria', 0, true),
  (v_restaurant_id, v_cat_id, '37- PROVOLONE C/ AZEITONAS', 'Porção Fria', 0, true),
  (v_restaurant_id, v_cat_id, '38- TÁBUA DE FRIOS', 'Mussarela, presunto, salame, azeitona e provolone', 0, true);

  -- 5. Category: Crepes
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Crepes', 4) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, '39- CREPES SALGADOS', 'Opções: Presunto e Queijo, Calabresa e Queijo, Frango e Queijo, Salsicha e Queijo', 0, true),
  (v_restaurant_id, v_cat_id, '40- CREPES DOCES', 'Opções: Batom Preto, Batom Branco, Prestígio, Romeu e Julieta', 0, true);

  -- 6. Category: Salgados
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Salgados', 5) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, '41- COXINHA', '', 0, true),
  (v_restaurant_id, v_cat_id, '42- RISOLE', '', 0, true),
  (v_restaurant_id, v_cat_id, '43- SALSICHA', '', 0, true),
  (v_restaurant_id, v_cat_id, '44- PRESUNTO E QUEIJO', '', 0, true);

  -- 7. Category: Pastéis
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Pastéis', 6) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, 'Pastéis Sabores', 'Queijo, Carne, Calabresa, Pizza, Frango', 0, true),
  (v_restaurant_id, v_cat_id, 'Adicionais de Pastel', 'Catupiry, Queijo, Bacon, Milho, Azeitona, Cheddar', 0, true);

  -- 8. Category: Bebidas
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Bebidas', 7) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, 'Garrafas Cervejas 600ml', 'Brahma, Skol, Antártica', 0, true),
  (v_restaurant_id, v_cat_id, 'Latas Cervejas', 'Brahma, Skol, Antártica', 0, true),
  (v_restaurant_id, v_cat_id, 'Refrigerantes 2 Litros', 'Coca-Cola, Fanta, Guaraná, Sprite', 0, true),
  (v_restaurant_id, v_cat_id, 'Refrigerantes Lata', 'Coca-Cola, Fanta, Guaraná, Sprite', 0, true),
  (v_restaurant_id, v_cat_id, 'Suco Natural', 'Laranja', 0, true),
  (v_restaurant_id, v_cat_id, 'Suco de Polpa', 'Abacaxi, Acerola, Maracujá, Goiaba, Caju, Morango, Uva, Abacaxi c/ Hortelã', 0, true);

  -- 9. Category: Comidas
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Comidas', 8) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, 'Pratos Executivos', 'Salada, Arroz, Feijão, Batata Frita, Carnes (Bovina, Suína, Frango)', 0, true),
  (v_restaurant_id, v_cat_id, 'Marmitex P', 'Arroz, Feijão, Batata Frita, Carnes', 0, true),
  (v_restaurant_id, v_cat_id, 'Marmitex M', 'Arroz, Feijão, Batata Frita, Carnes', 0, true),
  (v_restaurant_id, v_cat_id, 'Marmitex G', 'Arroz, Feijão, Batata Frita, Carnes', 0, true),
  (v_restaurant_id, v_cat_id, 'Panquecas', 'Molho Vermelho. Sabores: Queijo, Carne, Frango, Presunto e Mussarela', 0, true);

  -- 10. Category: Combos (Inserindo como itens normais por enquanto, pois combos tem estrutura diferente)
  INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES (v_restaurant_id, 'Combos', 9) RETURNING id INTO v_cat_id;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, available) VALUES
  (v_restaurant_id, v_cat_id, 'Combo Casal - 2 Lanches X-Saladão', 'Ganhe + 2 caixinhas de batata frita', 0, true),
  (v_restaurant_id, v_cat_id, 'Combo Casal - 2 Lanches X-Burguer', 'Ganhe + 2 caixinhas de batata frita', 0, true),
  (v_restaurant_id, v_cat_id, 'Combo Casal - 2 Lanches X-Tudo', 'Ganhe + 2 caixinhas de batata frita', 0, true),
  (v_restaurant_id, v_cat_id, 'Combo Família - 4 Lanches X-Saladão', 'Ganhe + 1 porção de batata frita', 0, true),
  (v_restaurant_id, v_cat_id, 'Combo Família - 4 Lanches X-Burguer', 'Ganhe + 1 porção de batata frita', 0, true),
  (v_restaurant_id, v_cat_id, 'Combo Família - 4 Lanches X-Tudo', 'Ganhe + 1 porção de batata frita', 0, true);

END $$;
