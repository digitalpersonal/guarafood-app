import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { createCategory, createMenuItem, fetchMenuForRestaurant } from '../services/databaseService';

const MenuImporter: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [menuData, setMenuData] = useState<any[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 30) {
            addToast({ message: 'Por favor, envie no máximo 30 arquivos por vez.', type: 'error' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        setProgress(10);
        const formData = new FormData();
        Array.from(files).forEach((file: File) => {
            formData.append("menuFiles", file);
        });

        try {
            setProgress(30);
            const response = await fetch("/api/menu/import", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 413) {
                    throw new Error("Os arquivos são muito grandes. Tente enviar menos arquivos por vez (ex: 3 a 5 fotos).");
                }
                const errorText = await response.text();
                let errorMessage = "Falha na extração do cardápio.";
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Erro ${response.status}: falha no servidor.`;
                }
                throw new Error(errorMessage);
            }

            setProgress(80);
            const data = await response.json();
            setMenuData(data);
            setProgress(100);
            addToast({ message: "Cardápio extraído com sucesso! Revise os itens abaixo.", type: 'success' });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error(error);
            addToast({ message: error.message || 'Erro ao extrair cardápio. Tente com menos imagens.', type: 'error' });
            setProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setIsImporting(false);
        }
    };

    const saveMenu = async () => {
        if (!currentUser?.restaurantId) return;
        setIsImporting(true);
        setProgress(10);
        try {
            const existingMenu = await fetchMenuForRestaurant(currentUser.restaurantId, true);
            const existingCategoryNames = existingMenu.map(c => c.name);
            setProgress(40);
            
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
            setProgress(100);
            addToast({ message: 'Cardápio salvo com sucesso!', type: 'success' });
            setMenuData([]);
        } catch (error) {
            console.error(error);
            addToast({ message: 'Erro ao salvar itens.', type: 'error' });
            setProgress(0);
        } finally {
            setIsImporting(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return (
        <div className="space-y-4">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={handleFileUpload} disabled={isImporting} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
            
            {isImporting && progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-orange-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            )}

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
                        {isImporting ? `Salvando... (${progress}%)` : 'Salvar no Cardápio'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MenuImporter;

