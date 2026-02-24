
import { supabase } from '../services/api';
import { createCategory, createMenuItem } from '../services/databaseService';

export const importDuGrillRestaurant = async () => {
    const restaurantData = {
        name: "Hambúrgueria Du grill",
        category: "Lanches, Pizza, Bebidas",
        delivery_time: "40-60 min",
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
        email: `dugrill${Date.now()}@guarafood.com`, // Unique email
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
             // Fallback: Fetch by name (order by id desc to get latest)
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
                category: "Hambúrguer Artesanal 150g",
                items: [
                    { name: "1- GRILL BURGUER", description: "Hambúrguer artesanal 150g, duplo queijo cheddar e pão brioche" },
                    { name: "2- GRILL SALADA", description: "Hambúrguer artesanal 150g, queijo cheddar, alface, tomate e pão brioche" },
                    { name: "3- GRILL BACON", description: "Hambúrguer artesanal 150g, queijo cheddar, bacon, alface, tomate e pão brioche" },
                    { name: "4- GRILL EGG", description: "Hambúrguer artesanal 150g, queijo cheddar, ovo, alface, tomate e pão brioche" },
                    { name: "5- GRILL BACON EGG", description: "Hambúrguer artesanal 150g, queijo cheddar, ovo, bacon, alface, tomate e pão brioche" },
                    { name: "6- GRILL GULOSEIMA", description: "Hambúrguer artesanal 150g, queijo cheddar, cebola caramelizada, batata palha e pão brioche" },
                    { name: "7- GRILL FRANGÃO", description: "Frango empanado, queijo cheddar, alface, tomate e pão brioche" },
                    { name: "8- GRILL SALADA DUPLO", description: "2 Hambúrguer artesanal 150g, 2 queijo cheddar, alface, tomate e pão brioche" },
                    { name: "9- GRILL BURGUER DUPLO", description: "2 Hambúrguer artesanal 150g, 2 queijo cheddar e pão brioche" },
                    { name: "10- GRILL CALABRESA", description: "Hambúrguer artesanal 150g, queijo cheddar , calabresa, alface, tomate e pão brioche" },
                    { name: "11- GRILL TUDO", description: "Hambúrguer artesanal 150g, queijo cheddar, ovo, .bacon, calabresa, catupiry, milho, batata palha, alface, tomate e pão brioche." },
                    { name: "Adicional de Batata Frita", description: "Porção adicional" }
                ]
            },
            {
                category: "Hambúrguer Industrial 90g",
                items: [
                    { name: "12- X- BURGUER", description: "Hambúrguer 90 gramas, queijo mussarela e pão de hambúrguer" },
                    { name: "13- X- SALADA", description: "Hambúrguer 90 gramas, queijo mussarela, alface, tomate e pão de hambúrguer" },
                    { name: "14- X- BACON", description: "Hambúrguer 90 gramas, queijo mussarela, bacon, alface, tomate e pão de hambúrguer" },
                    { name: "15- X- EGG", description: "Hambúrguer 90 gramas, ovo, queijo mussarela, alface, tomate e pão de hambúrguer" },
                    { name: "16- X- BACON EGG", description: "Hambúrguer 90 gramas, ovo, bacon, queijo mussarela, alface, tomate e pão de hambúrguer" },
                    { name: "17- X- FRANGO", description: "Filé de frango, queijo mussarela, alface, tomate e pão de hambúrguer" },
                    { name: "18- X - VEGETARIANO", description: "Ovo, queijo mussarela, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer" },
                    { name: "19- X - SALADA DUPLO", description: "2 Hambúrguer 90 gramas, 2 queijo mussarela, alface, tomate e pão de hambúrguer" },
                    { name: "20- X - BURGUER DUPLO", description: "2 Hambúrguer 90 gramas, 2 queijo mussarela e pão de hambúrguer" },
                    { name: "21- X - SALADÃO", description: "Hambúrguer 90 gramas, queijo mussarela, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer" },
                    { name: "22- X-CALABRESA", description: "Hambúrguer 90 gramas, queijo mussarela, calabresa, alface, tomate e pão de hambúrguer" },
                    { name: "23- X-DOG", description: "2 Salsichas, bacon, calabresa, queijo mussarela, milho, batata palha, alface, tomate e pão de hambúrguer" },
                    { name: "24- X - TUDO", description: "Hambúrguer 90g , queijo mussarela, ovo, .bacon, calabresa, catupiry, milho, batata palha, alface, tomate e pão de hambúrguer." },
                    { name: "Adicional de Batata Frita", description: "Porção adicional" }
                ]
            },
            {
                category: "Porções",
                items: [
                    { name: "25- BATATA FRITA", description: "Porção Quente" },
                    { name: "26- BATATA FRITA C/CALABRESA", description: "Porção Quente" },
                    { name: "27- BATATA FRITA C/BACON", description: "Porção Quente" },
                    { name: "28- BATATA FRITA C/MUSSARELA E BACON", description: "Porção Quente" },
                    { name: "29- BATATA MALUCA", description: "Mussarela, bacon e calabresa" },
                    { name: "30- FRANGO À PASSARINHO C/BATATA FRITA", description: "Porção Quente" },
                    { name: "31- CALABRESA ACEBOLADA C/FRITAS", description: "Porção Quente" },
                    { name: "32- CONTRA FILÉ ACEBOLADO C/FRITAS", description: "Porção Quente" },
                    { name: "33- PROVOLONE À MILANESA", description: "Porção Quente" },
                    { name: "34- ÍSCAS DE FILÉ DE FRANGO EMPANADO C/FRITAS", description: "Porção Quente" },
                    { name: "35- TORRESMO C/MANDIOCA", description: "Porção Quente" },
                    { name: "36- SALAME C/ AZEITONAS", description: "Porção Fria" },
                    { name: "37- PROVOLONE C/ AZEITONAS", description: "Porção Fria" },
                    { name: "38- TÁBUA DE FRIOS", description: "Mussarela, presunto, salame, azeitona e provolone" }
                ]
            },
            {
                category: "Crepes",
                items: [
                    { name: "39- CREPES SALGADOS", description: "Opções: Presunto e Queijo, Calabresa e Queijo, Frango e Queijo, Salsicha e Queijo" },
                    { name: "40- CREPES DOCES", description: "Opções: Batom Preto, Batom Branco, Prestígio, Romeu e Julieta" }
                ]
            },
            {
                category: "Salgados",
                items: [
                    { name: "41- COXINHA", description: "" },
                    { name: "42- RISOLE", description: "" },
                    { name: "43- SALSICHA", description: "" },
                    { name: "44- PRESUNTO E QUEIJO", description: "" }
                ]
            },
            {
                category: "Pastéis",
                items: [
                    { name: "Pastéis Sabores", description: "Queijo, Carne, Calabresa, Pizza, Frango" },
                    { name: "Adicionais de Pastel", description: "Catupiry, Queijo, Bacon, Milho, Azeitona, Cheddar" }
                ]
            },
            {
                category: "Bebidas",
                items: [
                    { name: "Garrafas Cervejas 600ml", description: "Brahma, Skol, Antártica" },
                    { name: "Latas Cervejas", description: "Brahma, Skol, Antártica" },
                    { name: "Refrigerantes 2 Litros", description: "Coca-Cola, Fanta, Guaraná, Sprite" },
                    { name: "Refrigerantes Lata", description: "Coca-Cola, Fanta, Guaraná, Sprite" },
                    { name: "Suco Natural", description: "Laranja" },
                    { name: "Suco de Polpa", description: "Abacaxi, Acerola, Maracujá, Goiaba, Caju, Morango, Uva, Abacaxi c/ Hortelã" }
                ]
            },
            {
                category: "Comidas",
                items: [
                    { name: "Pratos Executivos", description: "Salada, Arroz, Feijão, Batata Frita, Carnes (Bovina, Suína, Frango)" },
                    { name: "Marmitex P", description: "Arroz, Feijão, Batata Frita, Carnes" },
                    { name: "Marmitex M", description: "Arroz, Feijão, Batata Frita, Carnes" },
                    { name: "Marmitex G", description: "Arroz, Feijão, Batata Frita, Carnes" },
                    { name: "Panquecas", description: "Molho Vermelho. Sabores: Queijo, Carne, Frango, Presunto e Mussarela" }
                ]
            },
            {
                category: "Combos",
                items: [
                    { name: "Combo Casal - 2 Lanches X-Saladão", description: "Ganhe + 2 caixinhas de batata frita" },
                    { name: "Combo Casal - 2 Lanches X-Burguer", description: "Ganhe + 2 caixinhas de batata frita" },
                    { name: "Combo Casal - 2 Lanches X-Tudo", description: "Ganhe + 2 caixinhas de batata frita" },
                    { name: "Combo Família - 4 Lanches X-Saladão", description: "Ganhe + 1 porção de batata frita" },
                    { name: "Combo Família - 4 Lanches X-Burguer", description: "Ganhe + 1 porção de batata frita" },
                    { name: "Combo Família - 4 Lanches X-Tudo", description: "Ganhe + 1 porção de batata frita" }
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
                    price: 0,
                    originalPrice: 0,
                    imageUrl: "",
                    category: cat.category,
                    available: true
                });
            }
        }

        return { success: true, restaurantId };
    } catch (err) {
        console.error("Import Error:", err);
        return { success: false, error: err };
    }
};
