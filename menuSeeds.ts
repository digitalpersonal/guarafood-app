
import { supabase } from '../services/api';

export const TOKA_DO_PASTEL_MENU = {
    categories: [
        { name: 'Pastéis Tradicionais', display_order: 0 },
        { name: 'Pastéis Especiais', display_order: 1 },
        { name: 'Pastéis Doces', display_order: 2 },
        { name: 'Combos', display_order: 3 },
        { name: 'Lanches', display_order: 4 },
        { name: 'Bebidas', display_order: 5 },
        { name: 'Porções', display_order: 6 }
    ],
    items: [
        { category: 'Pastéis Tradicionais', name: 'Frango Mineiro', description: 'Frango, palmito, milho e catupiry', price: 12.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de 4 Queijos', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Calabresa', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Carne', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Frango com Catupiry', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Palmito', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Pizza', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Queijo', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Queijo com Alho', description: '', price: 10.00 },
        { category: 'Pastéis Tradicionais', name: 'Quatro Queijos II', description: 'Mussarela, provolone, parmesão, catupiry e bacon', price: 12.00 },
        { category: 'Pastéis Tradicionais', name: 'Queijo Mineiro', description: 'Mussarela, milho e catupiry', price: 11.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Bauru', description: 'Presunto, mussarela, tomate e orégano', price: 11.00 },
        { category: 'Pastéis Tradicionais', name: 'Pastel de Costela', description: 'Costela de vaca desfiada', price: 15.00 },
        { category: 'Pastéis Tradicionais', name: 'Bauru de Costela', description: 'Costela de vaca desfiada, mussarela, tomate e orégano', price: 18.00 },
        { category: 'Pastéis Especiais', name: 'Pastel de Carne Especial', description: 'Carne, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
        { category: 'Pastéis Especiais', name: 'Pastel de Frango Especial', description: 'Frango, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
        { category: 'Pastéis Especiais', name: 'Calabresa Especial', description: 'Calabresa, batata palha, milho, ovo, bacon, mussarela, presunto e catupiry', price: 16.00 },
        { category: 'Pastéis Especiais', name: 'Pizza Especial', description: 'Pizza, batata palha, milho, bacon, ovo mussarela, presunto e catupiry', price: 16.00 },
        { category: 'Pastéis Especiais', name: 'Palmito Especial', description: 'Palmito, batata palha, milho, bacon, ovo, mussarela, presunto e catupiry', price: 16.00 },
        { category: 'Pastéis Especiais', name: 'Frango Cremoso', description: 'Frango, creme de milho, bacon e mussarela', price: 17.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate preto', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate Branco', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate Avelã', description: '', price: 16.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate com Banana', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Pastel Misto', description: '', price: 16.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Prestígio', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate com Morango', description: '', price: 17.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Chocolate branco com sonho de valsa', description: '', price: 16.00 },
        { category: 'Pastéis Doces', name: 'Romeu e Julieta', description: 'Goiabada com Queijo', price: 14.00 },
        { category: 'Pastéis Doces', name: 'Misto com maracujá', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Chocolate Preto com maracujá', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Chocolate branco com maracujá', description: '', price: 15.00 },
        { category: 'Pastéis Doces', name: 'Pastel de Doce de leite', description: '', price: 14.00 },
        { category: 'Combos', name: 'COMBO 1', description: '1 x SALADA + 1 x BACON + 1 XGG + 1 x BURGUER+ FRITAS COM QUEIJO - 1...', price: 95.00 },
        { category: 'Combos', name: 'COMBO 2', description: '2 x SALADA + 6 unidades de MINI PASTÉIS + 1 KUAT 2 litros', price: 45.00 },
        { category: 'Combos', name: 'Combo 03', description: '1 x TUDO + 3 un de MINI PASTÉIS + REFRIGERANTE LATA OU CERVEJA LATA', price: 38.00 },
        { category: 'Combos', name: 'COMBO 04', description: '1 x BACON + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', price: 30.00 },
        { category: 'Combos', name: 'COMBO 05', description: '1 x SALADA + FRITAS COM QUEIJO + 1 REFRIGERANTE LATA', price: 27.00 },
        { category: 'Combos', name: 'COMBO 6', description: '2 x BACON + FRITAS COM QUEIJO + 1 Refrigerante a disponibilidade do...', price: 70.00 },
        { category: 'Combos', name: 'Combo de Pastel', description: '05 un pastéis tradicional (sabores variados)+ 06 un de mini pastéis (02...', price: 65.00 },
        { category: 'Combos', name: 'Combo Família', description: '2 X- Bacon, 2 X-Egg...', price: 95.00 },
        { category: 'Combos', name: 'Combo 7', description: '2 X-Tudo duplo + 1 Refrigerante 2 lts', price: 80.00 },
        { category: 'Lanches', name: 'X salada', description: 'Alface, tomate, hambúrguer e queijo e presunto', price: 15.00 },
        { category: 'Lanches', name: 'X egg', description: 'Alface, tomate, batata palha, milho, hambúrguer, ovo, presunto, queijo', price: 16.00 },
        { category: 'Lanches', name: 'X bacon', description: 'Alface, tomate, batata palha, milho, hambúrguer, bacon, presunto, queijo e...', price: 18.00 },
        { category: 'Lanches', name: 'X calabresa', description: 'Alface, tomate, batata palha, milho, hambúrguer, calabresa, presunto, queijo...', price: 18.00 },
        { category: 'Lanches', name: 'X frango', description: 'Alface, tomate, batata palha, milho, hambúrguer, frango, presunto, queijo e...', price: 17.00 },
        { category: 'Lanches', name: 'X tudo', description: 'Alface, tomate, batata palha, milho, hambúrguer, filé de frango, calabresa, ovo...', price: 22.00 },
        { category: 'Lanches', name: 'X- burguer', description: 'Pão, hamburguer e queijo', price: 12.00 },
        { category: 'Bebidas', name: 'Refrigerante lata', description: '', price: 5.00 },
        { category: 'Bebidas', name: 'Refrigerante 2 Litros', description: '', price: 12.00 },
        { category: 'Bebidas', name: 'Cerveja lata', description: 'Antártica SubZero', price: 5.00 },
        { category: 'Porções', name: 'Batata Frita', description: 'Simples', price: 20.00 },
        { category: 'Porções', name: 'Fritas com calabresa', description: 'Queijo, cheddar e bacon', price: 35.00 },
        { category: 'Porções', name: 'Calabresa acebolada', description: 'Calabresa with onion', price: 25.00 },
        { category: 'Porções', name: 'Bolinho de Tilápia', description: 'Bolinho Frito de Tilápia', price: 30.00 }
    ]
};

export const PASTELARIA_RENOVACAO_MENU = {
    categories: [
        { name: 'Lanches', display_order: 0 },
        { name: 'Lanches Especiais', display_order: 1 },
        { name: 'Porções', display_order: 2 },
        { name: 'Pastéis', display_order: 3 },
        { name: 'Pastéis Doces', display_order: 4 },
        { name: 'Hot Dogs', display_order: 5 },
        { name: 'Bebidas', display_order: 6 }
    ],
    items: [
        { category: 'Pastéis', name: 'CARNE', description: '', price: 12.00 },
        { category: 'Lanches', name: 'X-BURGUER', description: 'Hambúrguer, presunto e mussarela', price: 15.00 }
    ]
};

export async function seedRestaurantMenu(restaurantId: number, menuData: typeof TOKA_DO_PASTEL_MENU) {
    try {
        // 1. Create categories
        const categoryMap: Record<string, number> = {};
        
        for (const cat of menuData.categories) {
            const { data, error } = await supabase
                .from('menu_categories')
                .insert({
                    restaurant_id: restaurantId,
                    name: cat.name,
                    display_order: cat.display_order
                })
                .select('id, name')
                .single();
            
            if (error) throw error;
            categoryMap[data.name] = data.id;
        }

        // 2. Create items
        const itemsToInsert = menuData.items.map(item => ({
            restaurant_id: restaurantId,
            category_id: categoryMap[item.category],
            name: item.name,
            description: item.description,
            price: item.price,
            available: true
        }));

        const { error: itemsError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;

        return { success: true };
    } catch (error) {
        console.error("Error seeding menu:", error);
        return { success: false, error };
    }
}
