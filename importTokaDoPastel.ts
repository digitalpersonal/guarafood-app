import { supabase } from '../services/api';
import { createCategory, createMenuItem } from '../services/databaseService';

export const importTokaDoPastelRestaurant = async () => {
    const restaurantData = {
        name: "Toka do Pastel",
        category: "Pastelaria, Lanches, Bebidas",
        delivery_time: "30-50 min",
        rating: 5.0,
        image_url: "",
        payment_gateways: ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"],
        address: "Endereço a confirmar",
        phone: "(00) 00000-0000",
        opening_hours: "18:00",
        closing_hours: "23:00",
        delivery_fee: 0,
        active: true,
        operating_hours: [
            { dayOfWeek: 0, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 1, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 2, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 3, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 4, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 5, opens: '18:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 6, opens: '18:00', closes: '23:00', isOpen: true }
        ]
    };

    const userData = {
        email: `tokadopastel${Date.now()}@guarafood.com`, // Unique email
        password: "password123" // Default password
    };

    try {
        // 0. Check if restaurant already exists
        const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('name', restaurantData.name)
            .single();

        if (existingRestaurant) {
            return { success: false, error: `O restaurante "${restaurantData.name}" já existe (ID: ${existingRestaurant.id}). Exclua o anterior se quiser recriar.` };
        }

        // 1. Create Restaurant and User
        const { data, error } = await supabase.functions.invoke('create-restaurant-with-user', {
            body: { restaurantData, userData }
        });

        if (error) throw error;

        let restaurantId = data?.restaurantId || data?.id;

        if (!restaurantId) {
             console.log("Restaurant ID not returned directly, fetching by name...");
             const { data: restData, error: restError } = await supabase
                .from('restaurants')
                .select('id')
                .eq('name', restaurantData.name)
                .order('id', { ascending: false })
                .limit(1)
                .single();
             
             if (restError || !restData) {
                 console.error("Fetch Error:", restError);
                 throw new Error("Could not retrieve created restaurant ID. Please check if the restaurant was created.");
             }
             restaurantId = restData.id;
        }

        console.log("Restaurant Created:", restaurantId);

        // 2. Define Menu Data
        const menuData = [
            {
                category: 'Pastéis Tradicionais',
                items: [
                    { name: 'Frango Mineiro', description: 'Frango, palmito, milho e catupiry', price: 12.00 },
                    { name: 'Pastel de 4 Queijos', description: '', price: 10.00 },
                    { name: 'Pastel de Calabresa', description: '', price: 10.00 },
                    { name: 'Pastel de Carne', description: '', price: 10.00 },
                    { name: 'Pastel de Frango com Catupiry', description: '', price: 10.00 },
                    { name: 'Pastel de Palmito', description: '', price: 10.00 },
                    { name: 'Pastel de Pizza', description: '', price: 10.00 },
                    { name: 'Pastel de Queijo', description: '', price: 10.00 },
                    { name: 'Pastel de Queijo com Alho', description: '', price: 10.00 },
                    { name: 'Quatro Queijos II', description: 'Mussarela, provolone, parmesão, catupiry e bacon', price: 12.00 },
                    { name: 'Queijo Mineiro', description: 'Mussarela, milho e catupiry', price: 11.00 },
                    { name: 'Pastel de Bauru', description: 'Presunto, mussarela, tomate e orégano', price: 11.00 },
                    { name: 'Pastel de Costela', description: 'Costela de vaca desfiada', price: 15.00 },
                    { name: 'Bauru de Costela', description: 'Costela de vaca desfiada, mussarela, tomate e orégano', price: 18.00 },
                ]
            },
            {
                category: 'Pastéis Especiais',
                items: [
                    { name: 'Pastel de Carne Especial', description: 'Carne, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
                    { name: 'Pastel de Frango Especial', description: 'Frango, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
                    { name: 'Calabresa Especial', description: 'Calabresa, batata palha, milho, ovo, bacon, mussarela, presunto e catupiry', price: 16.00 },
                    { name: 'Pizza Especial', description: 'Pizza, batata palha, milho, bacon, ovo mussarela, presunto e catupiry', price: 16.00 },
                    { name: 'Palmito Especial', description: 'Palmito, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
                    { name: 'Frango Cremoso', description: 'Frango, creme de milho, bacon e mussarela', price: 17.00 },
                ]
            },
            {
                category: 'Pastéis Doces',
                items: [
                    { name: 'Pastel de Chocolate preto', description: '', price: 15.00 },
                    { name: 'Pastel de Chocolate Branco', description: '', price: 15.00 },
                    { name: 'Pastel de Chocolate Avelã', description: '', price: 16.00 },
                    { name: 'Pastel de Chocolate com Banana', description: '', price: 15.00 },
                    { name: 'Pastel Misto', description: '', price: 16.00 },
                    { name: 'Pastel de Prestígio', description: '', price: 15.00 },
                    { name: 'Pastel de Chocolate com Morango', description: '', price: 17.00 },
                    { name: 'Pastel de Chocolate branco com sonho de valsa', description: '', price: 16.00 },
                    { name: 'Romeu e Julieta', description: 'Goiabada com Queijo', price: 14.00 },
                    { name: 'Misto com maracujá', description: '', price: 15.00 },
                    { name: 'Chocolate Preto com maracujá', description: '', price: 15.00 },
                    { name: 'Chocolate branco com maracujá', description: '', price: 15.00 },
                    { name: 'Pastel de Doce de leite', description: '', price: 14.00 },
                ]
            },
            {
                category: 'Combos',
                items: [
                    { name: 'COMBO 1', description: '1 x SALADA + 1 x BACON + 1 XGG + 1 x BURGUER+ FRITAS COM QUEIJO - 1...', price: 95.00 },
                    { name: 'COMBO 2', description: '2 x SALADA + 6 unidades de MINI PASTÉIS + 1 KUAT 2 litros', price: 45.00 },
                    { name: 'Combo 03', description: '1 x TUDO + 3 un de MINI PASTÉIS + REFRIGERANTE LATA OU CERVEJA LATA', price: 38.00 },
                    { name: 'COMBO 04', description: '1 x BACON + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', price: 30.00 },
                    { name: 'COMBO 05', description: '1 x SALADA + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', price: 27.00 },
                    { name: 'COMBO 6', description: '2 x BACON + FRITAS COM QUEIJO + 1 Refrigerante a disponibilidade do...', price: 70.00 },
                    { name: 'Combo de Pastel', description: '05 un pastéis tradicional (sabores variados)+ 06 un de mini pastéis (02...', price: 65.00 },
                    { name: 'Combo Família', description: '2 X- Bacon, 2 X-Egg...', price: 95.00 },
                    { name: 'Combo 7', description: '2 X-Tudo duplo + 1 Refrigerante 2 lts', price: 80.00 },
                ]
            },
            {
                category: 'Lanches',
                items: [
                    { name: 'X salada', description: 'Alface, tomate, hambúrguer e queijo e presunto', price: 15.00 },
                    { name: 'X egg', description: 'Alface, tomate, batata palha, milho, hambúrguer, ovo, presunto, queijo', price: 16.00 },
                    { name: 'X bacon', description: 'Alface, tomate, batata palha, milho, hambúrguer, bacon, presunto, queijo e...', price: 18.00 },
                    { name: 'X calabresa', description: 'Alface, tomate, batata palha, milho, hambúrguer, calabresa, presunto, queijo...', price: 18.00 },
                    { name: 'X frango', description: 'Alface, tomate, batata palha, milho, hambúrguer, frango, presunto, queijo e...', price: 17.00 },
                    { name: 'X tudo', description: 'Alface, tomate, batata palha, milho, hambúrguer, filé de frango, calabresa, ovo...', price: 22.00 },
                    { name: 'X- burguer', description: 'Pão, hamburguer e queijo', price: 12.00 },
                ]
            },
            {
                category: 'Bebidas',
                items: [
                    { name: 'Refrigerante lata', description: '', price: 5.00 },
                    { name: 'Refrigerante 2 Litros', description: '', price: 12.00 },
                    { name: 'Cerveja lata', description: 'Antártica SubZero', price: 5.00 },
                ]
            },
            {
                category: 'Porções',
                items: [
                    { name: 'Batata Frita', description: 'Simples', price: 20.00 },
                    { name: 'Fritas com calabresa', description: 'Queijo, cheddar e bacon', price: 35.00 },
                    { name: 'Calabresa acebolada', description: 'Calabresa com cebola', price: 25.00 },
                    { name: 'Bolinho de Tilápia', description: 'Bolinho Frito de Tilápia', price: 30.00 },
                ]
            }
        ];

        // 3. Insert Data
        for (const cat of menuData) {
            console.log(`Creating category: ${cat.category}`);
            await createCategory(restaurantId, cat.category);
            
            for (const item of cat.items) {
                console.log(`Creating item: ${item.name}`);
                await createMenuItem(restaurantId, {
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    originalPrice: item.price,
                    imageUrl: "",
                    category: cat.category,
                    available: true
                });
            }
        }

        return { success: true, restaurantId, email: userData.email, password: userData.password };
    } catch (err) {
        console.error("Import Error:", err);
        return { success: false, error: err };
    }
};
