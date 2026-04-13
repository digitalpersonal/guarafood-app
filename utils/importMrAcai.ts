import { supabase } from '../services/api';
import { createCategory, createMenuItem } from '../services/databaseService';

export const importMrAcaiRestaurant = async () => {
    const restaurantData = {
        name: "MR. Açai",
        category: "Açaí, Sorvetes, Sobremesas",
        delivery_time: "30-50 min",
        rating: 5.0,
        image_url: "",
        payment_gateways: ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"],
        address: "Endereço a confirmar",
        phone: "(35) 99165-6312",
        opening_hours: "13:00",
        closing_hours: "23:00",
        delivery_fee: 0,
        active: true,
        operating_hours: [
            { dayOfWeek: 0, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 1, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 2, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 3, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 4, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 5, opens: '13:00', closes: '23:00', isOpen: true },
            { dayOfWeek: 6, opens: '13:00', closes: '23:00', isOpen: true }
        ]
    };

    const userData = {
        email: `mracai${Date.now()}@guarafood.com`,
        password: "password123"
    };

    try {
        const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('name', restaurantData.name)
            .single();

        if (existingRestaurant) {
            return { success: false, error: `O restaurante "${restaurantData.name}" já existe.` };
        }

        const { data, error } = await supabase.functions.invoke('create-restaurant-with-user', {
            body: { restaurantData, userData }
        });

        if (error) throw error;

        let restaurantId = data?.restaurantId || data?.id;

        if (!restaurantId) {
             const { data: restData, error: restError } = await supabase
                .from('restaurants')
                .select('id')
                .eq('name', restaurantData.name)
                .order('id', { ascending: false })
                .limit(1)
                .single();
             
             if (restError || !restData) throw new Error("Could not retrieve created restaurant ID.");
             restaurantId = restData.id;
        }

        const menuData = [
            {
                category: "Top Mix",
                items: [
                    { name: "Top Mix Kit Kat", description: "Escolha o seu", price: 14.00, isAcai: false },
                    { name: "Top Mix Suflair", description: "Escolha o seu", price: 14.00, isAcai: false },
                    { name: "Top Mix Ovomaltine", description: "Escolha o seu", price: 14.00, isAcai: false }
                ]
            },
            {
                category: "Sundae Expresso",
                items: [
                    { name: "Sundae Expresso 200ml", description: "", price: 6.00, isAcai: false },
                    { name: "Sundae Expresso 300ml", description: "", price: 8.00, isAcai: false },
                    { name: "Sundae Expresso 400ml", description: "", price: 10.00, isAcai: false },
                    { name: "Sundae Expresso 500ml", description: "", price: 12.00, isAcai: false },
                    { name: "Sundae Expresso 700ml", description: "", price: 14.00, isAcai: false }
                ]
            },
            {
                category: "Casquinhas e Cascão",
                items: [
                    { name: "Casquinha", description: "", price: 4.00, isAcai: false },
                    { name: "Casquinha trufada", description: "", price: 5.50, isAcai: false },
                    { name: "Cascão", description: "", price: 7.00, isAcai: false },
                    { name: "Cascão trufado", description: "", price: 9.00, isAcai: false }
                ]
            },
            {
                category: "Ovomaltine Mix",
                items: [
                    { name: "Ovomaltine Mix 360ml - Kit Kat", description: "Add chantilly R$ 2,00", price: 15.00, isAcai: false },
                    { name: "Ovomaltine Mix 360ml - Suflair", description: "Add chantilly R$ 2,00", price: 15.00, isAcai: false },
                    { name: "Ovomaltine Mix 360ml - Ovomaltine", description: "Add chantilly R$ 2,00", price: 15.00, isAcai: false }
                ]
            },
            {
                category: "Açaí Frutas (Normal)",
                items: [
                    { name: "Açaí tradicional 200ml", description: "", price: 6.00, isAcai: true },
                    { name: "Açaí tradicional 300ml", description: "", price: 7.00, isAcai: true },
                    { name: "Açaí tradicional 400ml", description: "", price: 8.00, isAcai: true },
                    { name: "Açaí tradicional 500ml", description: "", price: 9.00, isAcai: true },
                    { name: "Açaí tradicional 700ml", description: "", price: 12.00, isAcai: true },
                    { name: "Açaí tradicional 1000ml", description: "", price: 19.00, isAcai: true },
                    { name: "Açaí morango 200ml", description: "", price: 6.00, isAcai: true },
                    { name: "Açaí morango 300ml", description: "", price: 7.00, isAcai: true },
                    { name: "Açaí morango 400ml", description: "", price: 8.00, isAcai: true },
                    { name: "Açaí morango 500ml", description: "", price: 9.00, isAcai: true },
                    { name: "Açaí morango 700ml", description: "", price: 12.00, isAcai: true },
                    { name: "Açaí morango 1000ml", description: "", price: 19.00, isAcai: true },
                    { name: "Açaí maracujá 200ml", description: "", price: 6.00, isAcai: true },
                    { name: "Açaí maracujá 300ml", description: "", price: 7.00, isAcai: true },
                    { name: "Açaí maracujá 400ml", description: "", price: 8.00, isAcai: true },
                    { name: "Açaí maracujá 500ml", description: "", price: 9.00, isAcai: true },
                    { name: "Açaí maracujá 700ml", description: "", price: 12.00, isAcai: true },
                    { name: "Açaí maracujá 1000ml", description: "", price: 19.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 200ml", description: "", price: 6.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 300ml", description: "", price: 7.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 400ml", description: "", price: 8.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 500ml", description: "", price: 9.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 700ml", description: "", price: 12.00, isAcai: true },
                    { name: "Açaí frutas vermelhas 1000ml", description: "", price: 19.00, isAcai: true },
                    { name: "Açaí papaya 200ml", description: "", price: 6.00, isAcai: true },
                    { name: "Açaí papaya 300ml", description: "", price: 7.00, isAcai: true },
                    { name: "Açaí papaya 400ml", description: "", price: 8.00, isAcai: true },
                    { name: "Açaí papaya 500ml", description: "", price: 9.00, isAcai: true },
                    { name: "Açaí papaya 700ml", description: "", price: 12.00, isAcai: true },
                    { name: "Açaí papaya 1000ml", description: "", price: 19.00, isAcai: true }
                ]
            },
            {
                category: "Açaí Frutas (Trufado)",
                items: [
                    { name: "Açaí trufado 200ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 7.50, isAcai: true },
                    { name: "Açaí trufado 300ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 8.50, isAcai: true },
                    { name: "Açaí trufado 400ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 9.50, isAcai: true },
                    { name: "Açaí trufado 500ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 10.50, isAcai: true },
                    { name: "Açaí trufado 700ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 13.50, isAcai: true },
                    { name: "Açaí trufado 1000ml", description: "Tradicional, morango, maracujá, frutas vermelhas ou papaya", price: 20.50, isAcai: true }
                ]
            },
            {
                category: "Sundae",
                items: [
                    { name: "Sundae 2 bolas", description: "", price: 8.00, isAcai: false },
                    { name: "Sundae 3 bolas", description: "", price: 11.00, isAcai: false },
                    { name: "Sundae 4 bolas", description: "", price: 13.50, isAcai: false }
                ]
            },
            {
                category: "Açaí Shake",
                items: [
                    { name: "Açaí Shake 300ml", description: "Açaí + whey protein = Alta performance", price: 11.00, isAcai: false },
                    { name: "Açaí Shake 400ml", description: "Açaí + whey protein = Alta performance", price: 12.00, isAcai: false },
                    { name: "Açaí Shake 500ml", description: "Açaí + whey protein = Alta performance", price: 13.50, isAcai: false },
                    { name: "Açaí Shake 700ml", description: "Açaí + whey protein = Alta performance", price: 17.00, isAcai: false }
                ]
            },
            {
                category: "Açaí Na Barca",
                items: [
                    { name: "Barca M", description: "5 acompanhamentos", price: 25.99, isAcai: true },
                    { name: "Barca G", description: "7 acompanhamentos", price: 36.99, isAcai: true },
                    { name: "Barca Titanic", description: "7 acompanhamentos", price: 51.99, isAcai: true }
                ]
            },
            {
                category: "Super Promoção",
                items: [
                    { name: "Açaí 400ml + 2 acompanhamentos", description: "", price: 13.00, isAcai: true },
                    { name: "Açaí 400ml + 4 acompanhamentos", description: "", price: 15.00, isAcai: true }
                ]
            },
            {
                category: "Creme de Cupuaçu",
                items: [
                    { name: "Creme de Cupuaçu 200ml", description: "", price: 8.50, isAcai: false },
                    { name: "Creme de Cupuaçu 300ml", description: "", price: 10.00, isAcai: false },
                    { name: "Creme de Cupuaçu 400ml", description: "", price: 13.00, isAcai: false },
                    { name: "Creme de Cupuaçu 500ml", description: "", price: 15.00, isAcai: false },
                    { name: "Creme de Cupuaçu 700ml", description: "", price: 15.00, isAcai: false },
                    { name: "Creme de Cupuaçu 1000ml", description: "", price: 17.50, isAcai: false }
                ]
            },
            {
                category: "Super Milk Shake",
                items: [
                    { name: "Milk Shake 300ml", description: "", price: 9.00, isAcai: false },
                    { name: "Milk Shake 400ml", description: "", price: 10.00, isAcai: false },
                    { name: "Milk Shake 500ml", description: "", price: 11.00, isAcai: false },
                    { name: "Milk Shake 700ml", description: "", price: 13.00, isAcai: false }
                ]
            },
            {
                category: "Açaí Recheados",
                items: [
                    { name: "Açaí TRUFADO de nutella", description: "", price: 15.00, isAcai: true },
                    { name: "Açaí ninho", description: "", price: 15.00, isAcai: true },
                    { name: "Açaí Paçoca", description: "", price: 15.00, isAcai: true },
                    { name: "Açaí Mousse de Limão", description: "", price: 15.00, isAcai: true }
                ]
            },
            {
                category: "Sorvetes",
                items: [
                    { name: "Sorvete 1 bola", description: "Sabores diversos", price: 4.00, isAcai: false },
                    { name: "Sorvete 2 bolas", description: "Sabores diversos", price: 7.00, isAcai: false },
                    { name: "Sorvete 3 bolas", description: "Sabores diversos", price: 10.00, isAcai: false },
                    { name: "Sorvete 4 bolas", description: "Sabores diversos", price: 12.00, isAcai: false }
                ]
            }
        ];

        for (const cat of menuData) {
            await createCategory(restaurantId, cat.category);
            for (const item of cat.items) {
                await createMenuItem(restaurantId, {
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    originalPrice: item.price,
                    imageUrl: "",
                    category: cat.category,
                    isAcai: item.isAcai,
                    available: true
                });
            }
        }

        // Addons
        const addonsData = [
            { name: "Morango", price: 4.00, category: "Frutas" },
            { name: "Kiwi", price: 4.00, category: "Frutas" },
            { name: "Abacaxi", price: 3.50, category: "Frutas" },
            { name: "Banana", price: 3.00, category: "Frutas" },
            { name: "Mousse Morango", price: 3.00, category: "Mousses" },
            { name: "Mousse Maracujá", price: 3.00, category: "Mousses" },
            { name: "Mousse Chocolate", price: 3.00, category: "Mousses" },
            { name: "Bis branco (3UND)", price: 3.00, category: "Derivados" },
            { name: "Bis preto (3UND)", price: 3.00, category: "Derivados" },
            { name: "Nutella", price: 5.00, category: "Derivados" },
            { name: "Leite condensado", price: 3.00, category: "Derivados" },
            { name: "Leite ninho", price: 3.00, category: "Derivados" },
            { name: "Choco ball", price: 3.00, category: "Derivados" },
            { name: "Confetes", price: 3.00, category: "Derivados" },
            { name: "Dadinho", price: 3.00, category: "Derivados" },
            { name: "Ovo maltine", price: 3.00, category: "Derivados" },
            { name: "Ouro branco", price: 3.00, category: "Derivados" },
            { name: "Canudo (5UND)", price: 3.00, category: "Derivados" },
            { name: "Kitkat", price: 3.50, category: "Derivados" },
            { name: "Trento", price: 3.50, category: "Derivados" },
            { name: "Sonho de valsa", price: 3.00, category: "Derivados" },
            { name: "Suflair", price: 3.50, category: "Derivados" },
            { name: "Beijinho", price: 3.00, category: "Derivados" },
            { name: "Brigadeiro", price: 3.00, category: "Derivados" },
            { name: "Chantilly", price: 3.00, category: "Derivados" },
            { name: "Paçoca", price: 3.00, category: "Derivados" },
            { name: "Marshmallow", price: 2.50, category: "Derivados" },
            { name: "Aveia", price: 2.50, category: "Derivados" },
            { name: "Granola", price: 3.00, category: "Derivados" },
            { name: "Castanha", price: 3.00, category: "Derivados" },
            { name: "Sucrilhos", price: 2.50, category: "Derivados" },
            { name: "Mel", price: 3.00, category: "Derivados" },
            { name: "Calda preta", price: 3.00, category: "Derivados" },
            { name: "Calda branca", price: 3.00, category: "Derivados" },
            { name: "Pasta de amendoim", price: 4.00, category: "Derivados" },
            { name: "Creme bombom", price: 4.00, category: "Derivados" },
            { name: "Creme cookies", price: 4.00, category: "Derivados" },
            { name: "Creme cookies branco", price: 4.00, category: "Derivados" },
            { name: "Cereja em calda (5UND)", price: 5.00, category: "Derivados" },
            { name: "Dentadura fini (5UND)", price: 3.00, category: "Derivados" },
            { name: "Beijinho fini (5UND)", price: 3.00, category: "Derivados" },
            { name: "Bananinha fini (5UND)", price: 3.00, category: "Derivados" }
        ];

        for (const addon of addonsData) {
            await supabase.from('addons').insert({
                restaurant_id: restaurantId,
                name: addon.name,
                price: addon.price,
                category: addon.category,
                available: true
            });
        }

        return { success: true, restaurantId };
    } catch (err) {
        console.error("Import Error:", err);
        return { success: false, error: err };
    }
};
