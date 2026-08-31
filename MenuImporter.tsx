import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { createCategory, createMenuItem, fetchMenuForRestaurant } from '../services/databaseService';

import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { createCategory, createMenuItem, fetchMenuForRestaurant } from '../services/databaseService';

const MenuImporter: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [isImporting, setIsImporting] = useState(false);
    const [menuData, setMenuData] = useState<any[]>([]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append("menuFile", file);

        try {
            const response = await fetch("/api/menu/import", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Falha na extração do cardápio.");

            const data = await response.json();
            setMenuData(data);
            addToast({ message: "Cardápio extraído com sucesso! Revise os itens abaixo.", type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao extrair cardápio.', type: 'error' });
        } finally {
            setIsImporting(false);
        }
    };

    const saveMenu = async () => {
        if (!currentUser?.restaurantId) return;
        setIsImporting(true);
        try {
            const existingMenu = await fetchMenuForRestaurant(currentUser.restaurantId, true);
            const existingCategoryNames = existingMenu.map(c => c.name);
            
            for (const item of menuData) {
                if (!existingCategoryNames.includes(item.categoria)) {
                    await createCategory(currentUser.restaurantId, item.categoria);
                    existingCategoryNames.push(item.categoria);
                }
                await createMenuItem(currentUser.restaurantId, {
                    category: item.categoria,
                    name: item.nome,
                    description: item.descricao || '',
                    price: item.preco,
                    originalPrice: item.preco,
                    imageUrl: '',
                    isPizza: false,
                    isAcai: false,
                    isMarmita: false,
                    availableDays: [],
                    available: true
                });
            }
            addToast({ message: 'Cardápio salvo com sucesso!', type: 'success' });
            setMenuData([]);
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao salvar itens.', type: 'error' });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={isImporting} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
            
            {menuData.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-bold">Itens Extraídos:</h3>
                    <div className="max-h-60 overflow-y-auto border rounded p-2">
                        {menuData.map((item, idx) => (
                            <div key={idx} className="text-sm border-b p-1">
                                <strong>{item.nome}</strong> ({item.categoria}) - R$ {item.preco.toFixed(2)}
                            </div>
                        ))}
                    </div>
                    <button onClick={saveMenu} disabled={isImporting} className="bg-green-600 text-white p-2 rounded w-full">
                        {isImporting ? 'Salvando...' : 'Salvar no Cardápio'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MenuImporter;

export default MenuImporter;
