
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { fetchRestaurantByIdSecure, updateRestaurant, reloadSchemaCache } from '../services/databaseService';
import type { Restaurant, OperatingHours, Order } from '../types';
import Spinner from './Spinner';
import { SUPABASE_URL } from '../config';
import PrintableOrder from './PrintableOrder';

const NotificationSettings: React.FC = () => {
    const { addToast } = useNotification();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    useEffect(() => {
        const savedPref = localStorage.getItem('guarafood-notifications-enabled') === 'true';
        if (savedPref && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }

        if (navigator.permissions) {
            navigator.permissions.query({ name: 'notifications' }).then(permission => {
                permission.onchange = () => {
                    setPermissionStatus(permission.state);
                    if (permission.state !== 'granted') {
                        setNotificationsEnabled(false);
                        localStorage.setItem('guarafood-notifications-enabled', 'false');
                    }
                };
            });
        }
    }, []);

    const handleToggleNotifications = async () => {
        if (!notificationsEnabled) {
            if (permissionStatus === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('guarafood-notifications-enabled', 'true');
                addToast({ message: 'Notificações ativadas!', type: 'success' });
                new Notification('GuaraFood', { body: 'Tudo pronto para receber notificações!', icon: '/vite.svg' });
            } else if (permissionStatus === 'denied') {
                addToast({ message: 'Você bloqueou as notificações. Altere nas configurações do seu navegador.', type: 'error' });
            } else {
                const result = await Notification.requestPermission();
                setPermissionStatus(result);
                if (result === 'granted') {
                    setNotificationsEnabled(true);
                    localStorage.setItem('guarafood-notifications-enabled', 'true');
                    addToast({ message: 'Notificações ativadas!', type: 'success' });
                    new Notification('GuaraFood', { body: 'Tudo pronto para receber notificações!', icon: '/vite.svg' });
                } else {
                    addToast({ message: 'Permissão para notificações não concedida.', type: 'info' });
                }
            }
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('guarafood-notifications-enabled', 'false');
            addToast({ message: 'Notificações desativadas.', type: 'info' });
        }
    };
    
    const getPermissionText = () => {
        switch(permissionStatus) {
            case 'granted': return 'Permitido';
            case 'denied': return 'Bloqueado';
            default: return 'Pendente';
        }
    }

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Notificações de Novos Pedidos</h3>
            <p className="text-sm text-gray-500 mb-4">Receba um alerta sonoro e visual no seu dispositivo sempre que um novo pedido chegar.</p>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">Ativar Alertas de Pedidos</span>
                    <span className="text-xs text-gray-500">Status da permissão: {getPermissionText()}</span>
                </div>
                 <label htmlFor="notification-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input id="notification-toggle" type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={handleToggleNotifications} />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </div>
                </label>
            </div>
        </div>
    );
};

const PrinterSettings: React.FC<{ onTestPrint: (width: number) => void }> = ({ onTestPrint }) => {
    const { addToast } = useNotification();
    const [printerWidth, setPrinterWidth] = useState<number>(80);

    useEffect(() => {
        const savedWidth = localStorage.getItem('guarafood-printer-width');
        if (savedWidth) {
            setPrinterWidth(parseInt(savedWidth, 10));
        }
    }, []);

    const handleWidthChange = (width: number) => {
        setPrinterWidth(width);
        localStorage.setItem('guarafood-printer-width', width.toString());
        addToast({ message: `Largura de impressão definida para ${width}mm`, type: 'success' });
    };

    return (
        <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Configuração de Impressão</h3>
            <p className="text-sm text-gray-500 mb-4">Ajuste o tamanho do cupom de acordo com sua impressora térmica.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${printerWidth === 80 ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white hover:bg-gray-50'}`} onClick={() => handleWidthChange(80)}>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">Padrão (80mm)</span>
                        {printerWidth === 80 && <span className="text-orange-600 font-bold">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Para impressoras térmicas comuns (ex: Epson TM-T20).</p>
                </div>

                <div className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all ${printerWidth === 58 ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white hover:bg-gray-50'}`} onClick={() => handleWidthChange(58)}>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">Mini (58mm)</span>
                        {printerWidth === 58 && <span className="text-orange-600 font-bold">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Para impressoras portáteis ou compactas.</p>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button 
                    onClick={() => onTestPrint(printerWidth)} 
                    className="text-sm text-gray-700 font-semibold border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 0 0-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
                    </svg>
                    Testar Impressão ({printerWidth}mm)
                </button>
            </div>
        </div>
    );
};

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const getDefaultOperatingHours = (): OperatingHours[] =>
    daysOfWeek.map((_, index) => ({
        dayOfWeek: index,
        opens: '18:00',
        closes: '23:00',
        isOpen: false,
    }));


const RestaurantSettings: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [mercadoPagoToken, setMercadoPagoToken] = useState('');
    const [manualPixKey, setManualPixKey] = useState('');
    const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(getDefaultOperatingHours());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testOrder, setTestOrder] = useState<Order | null>(null);
    const [testPrinterWidth, setTestPrinterWidth] = useState(80);

    const restaurantId = currentUser?.restaurantId;

    const loadData = useCallback(async () => {
        if (!restaurantId) {
            setError("ID do restaurante não encontrado.");
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            // Use the secure fetch to retrieve existing credentials
            const data = await fetchRestaurantByIdSecure(restaurantId);
            setRestaurant(data);
            setMercadoPagoToken(data.mercado_pago_credentials?.accessToken || '');
            setManualPixKey(data.manualPixKey || '');
            if (data.operatingHours && data.operatingHours.length === 7) {
                setOperatingHours(data.operatingHours);
            } else {
                setOperatingHours(getDefaultOperatingHours());
            }
            setError(null);
        } catch (err) {
            setError('Falha ao carregar as configurações do restaurante.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleReloadSchema = async () => {
        try {
            setIsLoading(true);
            await reloadSchemaCache();
            await loadData();
            addToast({ message: "Conexão recarregada!", type: "success" });
        } catch (e) {
            addToast({ message: "Erro ao recarregar.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleOperatingHoursChange = (dayIndex: number, field: 'isOpen' | 'opens' | 'closes', value: string | boolean) => {
        setOperatingHours(prev => {
            const newHours = [...prev];
            const day = { ...newHours[dayIndex] };
            (day as any)[field] = value;
            newHours[dayIndex] = day;
            return newHours;
        });
    };

    const handleSaveChanges = async () => {
        if (!restaurantId) return;
        setIsSaving(true);
        setError(null);
        
        try {
            const openDays = operatingHours.filter(d => d.isOpen);
            const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
            const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

            // Ensure mercadoPagoToken is a string and handle empty string
            const mpCreds = mercadoPagoToken ? { accessToken: mercadoPagoToken } : { accessToken: '' };

            const updatePayload: Partial<Restaurant> = {
                mercado_pago_credentials: mpCreds,
                operatingHours: operatingHours,
                openingHours: openingHoursSummary,
                closingHours: closingHoursSummary,
                manualPixKey: manualPixKey
            };
            
            // Call update
            const updatedRestaurant = await updateRestaurant(restaurantId, updatePayload);
            
            // SUCCESS SCENARIO - Optimistic Update
            // We TRUST that if no error was thrown, the DB accepted the data.
            // Even if the returned 'updatedRestaurant' has stale data due to cache,
            // we preserve the local state for these critical fields to avoid visual revert.
            
            addToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
            
            setRestaurant({
                ...updatedRestaurant,
                // FORCE local state to prevent revert if API cache is stale
                operatingHours: operatingHours, 
                mercado_pago_credentials: mpCreds, 
                manualPixKey: manualPixKey 
            });
            
            // We do NOT call loadData() here to prevent fetching potentially stale data
            // This ensures the UI reflects what the user just saved.
            
        } catch (err: any) {
            console.error(err);
            let msg = `Erro ao salvar: ${err.message}`;
            if (msg.includes('mercado_pago_credentials') || msg.includes('operating_hours')) {
                 msg = "ERRO CRÍTICO NO BANCO DE DADOS: As colunas necessárias para salvar horários ou credenciais não existem.\n\nSOLUÇÃO OBRIGATÓRIA: Vá ao SQL Editor do Supabase e rode o comando: \nALTER TABLE restaurants ADD COLUMN IF NOT EXISTS operating_hours jsonb, ADD COLUMN IF NOT EXISTS mercado_pago_credentials jsonb DEFAULT '{}';";
            }
            setError(msg);
            addToast({ message: "Erro ao salvar. Verifique o alerta vermelho na tela.", type: 'error', duration: 10000 });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTestPrint = (width: number) => {
        if (!restaurant) return;
        setTestPrinterWidth(width);
        
        // Create a dummy order object
        const dummyOrder: Order = {
            id: 'TESTE-123456',
            timestamp: new Date().toISOString(),
            status: 'Novo Pedido',
            customerName: 'Cliente Teste',
            customerPhone: '(11) 99999-9999',
            customerAddress: {
                zipCode: '00000-000',
                street: 'Rua de Teste da Impressora',
                number: '100',
                neighborhood: 'Centro',
                complement: 'Apto 10'
            },
            items: [
                {
                    id: '1',
                    name: 'X-Burger Especial',
                    price: 25.50,
                    basePrice: 20.00,
                    quantity: 1,
                    imageUrl: '',
                    description: 'Sem cebola',
                    sizeName: 'Grande',
                    selectedAddons: [{ id: 1, name: 'Bacon', price: 3.00, restaurantId: restaurant.id }, { id: 2, name: 'Ovo', price: 2.50, restaurantId: restaurant.id }]
                },
                {
                    id: '2',
                    name: 'Coca-Cola Lata',
                    price: 6.00,
                    basePrice: 6.00,
                    quantity: 2,
                    imageUrl: '',
                    description: 'Gelada'
                }
            ],
            totalPrice: 37.50,
            subtotal: 37.50,
            deliveryFee: 5.00,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address,
            restaurantPhone: restaurant.phone,
            paymentMethod: 'Dinheiro',
        };
        
        setTestOrder(dummyOrder);
        // Delay print to allow render
        setTimeout(() => {
            window.print();
            // Clear test order after print dialog opens to keep DOM clean, or keep it.
            // setTestOrder(null); 
        }, 500);
    };
    
    const handleCopyStoreLink = () => {
        if (restaurantId) {
            const url = `${window.location.origin}?r=${restaurantId}`; 
            navigator.clipboard.writeText(url);
            addToast({ message: 'Link da loja copiado!', type: 'success' });
        }
    };
    
    const handleWhatsappShare = () => {
        if (restaurantId && restaurant) {
            const url = `${window.location.origin}?r=${restaurantId}`;
            const text = `Peça agora no *${restaurant.name}* pelo nosso app: ${url}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const webhookUrl = restaurantId ? `${SUPABASE_URL}/functions/v1/payment-webhook?restaurantId=${restaurantId}` : 'Carregando...';

    if (isLoading) return <div className="p-4"><Spinner message="Carregando configurações..." /></div>;
    
    if (!restaurant) return null;

    return (
        <main className="p-4 space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Configurações do Restaurante</h2>
                    <button 
                        onClick={handleReloadSchema} 
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="Tente isso se as configurações não estiverem salvando"
                    >
                        Recarregar Conexão
                    </button>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* STORE LINK SECTION */}
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-orange-800 mb-2">Link da Loja</h3>
                        <p className="text-sm text-orange-700 mb-3">Compartilhe este link com seus clientes para que eles abram direto no seu cardápio.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={`${window.location.origin}?r=${restaurant.id}`} 
                                className="flex-grow p-2 border rounded-lg bg-white text-gray-600 text-sm"
                            />
                            <button onClick={handleCopyStoreLink} className="bg-orange-600 text-white font-bold px-3 py-2 rounded-lg hover:bg-orange-700 text-sm">
                                Copiar
                            </button>
                            <button onClick={handleWhatsappShare} className="bg-green-600 text-white font-bold px-3 py-2 rounded-lg hover:bg-green-700 text-sm">
                                WhatsApp
                            </button>
                        </div>
                    </div>

                    <NotificationSettings />
                    <PrinterSettings onTestPrint={handleTestPrint} />

                     <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Horário de Funcionamento</h3>
                        <p className="text-sm text-gray-500 mb-4">Defina os dias e horários em que seu restaurante estará aberto para receber pedidos. Isso será exibido para os clientes.</p>
                        <div className="space-y-3">
                            {operatingHours.map((day, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 border">
                                    <div className="col-span-4 flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`isopen-merchant-${index}`}
                                            checked={day.isOpen}
                                            onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                                        />
                                        <label htmlFor={`isopen-merchant-${index}`} className="font-semibold text-gray-700">{daysOfWeek[index]}</label>
                                    </div>
                                    <div className="col-span-4">
                                        <label htmlFor={`opens-merchant-${index}`} className="text-xs text-gray-500">Abre às</label>
                                        <input 
                                            id={`opens-merchant-${index}`}
                                            type="time" 
                                            value={day.opens}
                                            onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-1 border rounded-md disabled:bg-gray-200"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <label htmlFor={`closes-merchant-${index}`} className="text-xs text-gray-500">Fecha às</label>
                                        <input 
                                            id={`closes-merchant-${index}`}
                                            type="time" 
                                            value={day.closes}
                                            onChange={(e) => handleOperatingHoursChange(index, 'closes', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-1 border rounded-md disabled:bg-gray-200"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-6">
                         <h3 className="text-lg font-semibold text-gray-700 mb-2">Chave Pix Manual (Modo Simplificado)</h3>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <p className="text-sm text-gray-600 mb-3">
                                 <strong>Não conseguiu configurar o terminal?</strong> Use esta opção! <br/>
                                 Insira sua chave Pix abaixo. O cliente verá essa chave, fará o pagamento no banco dele e o pedido chegará para você aprovar.
                             </p>
                             <label className="block text-xs font-bold text-gray-700 mb-1">Sua Chave Pix (CPF, CNPJ, Email ou Celular)</label>
                             <input 
                                type="text" 
                                placeholder="Ex: 123.456.789-00 ou seu@email.com" 
                                value={manualPixKey} 
                                onChange={(e) => setManualPixKey(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white"
                            />
                        </div>
                    </div>

                     <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Gateway de Pagamento (Pix Automático)</h3>
                        <p className="text-sm text-gray-500 mb-4">Opção avançada: Conecte sua conta do Mercado Pago para receber confirmação automática.</p>
                        
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-blue-800 mb-2">Configuração Mercado Pago</h4>
                                <label htmlFor="mercadoPagoToken" className="block text-sm font-medium text-gray-600 mb-1 mt-3">
                                    Access Token de Produção:
                                </label>
                                <input
                                    id="mercadoPagoToken"
                                    type="password"
                                    placeholder="APP_USR-..."
                                    value={mercadoPagoToken}
                                    onChange={(e) => setMercadoPagoToken(e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-white"
                                />
                                
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-blue-600 mb-1">URL de Webhook (Copie e cole no Mercado Pago):</label>
                                    <code className="block bg-white p-3 rounded border border-blue-200 text-xs text-gray-600 break-all select-all cursor-text font-mono">
                                        {webhookUrl}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t pt-6 flex justify-end">
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="bg-orange-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Hidden Print Area for Testing */}
            <div className="hidden">
                <div id="printable-order">
                    {testOrder && <PrintableOrder order={testOrder} printerWidth={testPrinterWidth} />}
                </div>
            </div>
        </main>
    );
};

export default RestaurantSettings;
