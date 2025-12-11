
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { fetchRestaurantByIdSecure, updateRestaurant } from '../services/databaseService';
import type { Restaurant, OperatingHours, Order } from '../types';
import Spinner from './Spinner';
import { SUPABASE_URL } from '../config';
import PrintableOrder from './PrintableOrder';

// --- COMPONENTS AUXILIARES ---

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
    const [showFixModal, setShowFixModal] = useState(false); // Modal para fix de colunas
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
            const data = await fetchRestaurantByIdSecure(restaurantId);
            
            // Garantir que operatingHours venha preenchido, senão default
            let loadedHours = data.operatingHours;
            if (!loadedHours || loadedHours.length !== 7) {
                loadedHours = getDefaultOperatingHours();
            }

            setRestaurant(data);
            setMercadoPagoToken(data.mercado_pago_credentials?.accessToken || '');
            setManualPixKey(data.manualPixKey || '');
            setOperatingHours(loadedHours);
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
        if (!restaurantId || !restaurant) return;
        setIsSaving(true);
        setError(null);

        // 1. Prepare Data
        const openDays = operatingHours.filter(d => d.isOpen);
        const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
        const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

        const updatePayload: Partial<Restaurant> = {
            mercado_pago_credentials: { accessToken: mercadoPagoToken },
            operatingHours: operatingHours,
            openingHours: openingHoursSummary,
            closingHours: closingHoursSummary,
            manualPixKey: manualPixKey
        };

        try {
            // 2. Send to Database and WAIT for response
            const savedData = await updateRestaurant(restaurantId, updatePayload);
            
            // 3. STRICT VERIFICATION
            // First, ensure we actually got data back.
            if (!savedData) {
                throw new Error("O banco de dados não retornou confirmação do salvamento.");
            }

            // Check if what we got back from the DB matches what we sent.
            // If the DB ignored the new columns, these values will match the OLD data (or be null/undefined).
            
            // Safe access using optional chaining
            const savedToken = savedData.mercado_pago_credentials?.accessToken || '';
            const isTokenSaved = savedToken === mercadoPagoToken;
            
            // For complex objects like arrays, stringify comparison is safer
            const savedHoursStr = JSON.stringify(savedData.operatingHours);
            const sentHoursStr = JSON.stringify(operatingHours);
            const isHoursSaved = savedHoursStr === sentHoursStr;

            if (!isTokenSaved || !isHoursSaved) {
                console.error("Verification Failed:", {
                    sent: { token: mercadoPagoToken, hours: sentHoursStr },
                    received: { token: savedToken, hours: savedHoursStr }
                });
                
                throw new Error("DIVERGÊNCIA: O banco de dados confirmou o recebimento, mas os dados não foram persistidos. As colunas 'operating_hours' ou 'mercado_pago_credentials' parecem estar travadas ou ausentes no cache da API.");
            }

            // 4. Update Local State with Verified Data
            setRestaurant(savedData);
            addToast({ message: 'Configurações salvas e verificadas com sucesso!', type: 'success' });
            
        } catch (err: any) {
            console.error(err);
            const msg = err.message || JSON.stringify(err);
            setError(`FALHA AO SALVAR: ${msg}`);
            
            // If it's a divergence or specific column error, show the fix modal
            if (msg.includes('DIVERGÊNCIA') || msg.includes('operating_hours') || msg.includes('mercado_pago_credentials')) {
                setShowFixModal(true);
            }
            
            addToast({ message: "Erro crítico ao salvar. Veja detalhes no alerta vermelho.", type: 'error', duration: 8000 });
            // IMPORTANT: We do NOT update local state here, so the user's changes remain on screen
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTestPrint = (width: number) => {
        if (!restaurant) return;
        setTestPrinterWidth(width);
        
        const dummyOrder: Order = {
            id: 'TESTE-123456',
            timestamp: new Date().toISOString(),
            status: 'Novo Pedido',
            customerName: 'Cliente Teste',
            customerPhone: '(11) 99999-9999',
            customerAddress: {
                zipCode: '00000-000',
                street: 'Rua de Teste',
                number: '100',
                neighborhood: 'Centro',
                complement: 'Apto 10'
            },
            items: [
                {
                    id: '1',
                    name: 'Item de Teste',
                    price: 15.00,
                    basePrice: 15.00,
                    quantity: 1,
                    imageUrl: '',
                    description: 'Teste de impressão',
                }
            ],
            totalPrice: 20.00,
            subtotal: 15.00,
            deliveryFee: 5.00,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address,
            restaurantPhone: restaurant.phone,
            paymentMethod: 'Dinheiro',
        };
        
        setTestOrder(dummyOrder);
        setTimeout(() => {
            window.print();
        }, 500);
    };
    
    const handleCopyStoreLink = () => {
        if (restaurantId) {
            const url = `${window.location.origin}?r=${restaurantId}`; 
            navigator.clipboard.writeText(url);
            addToast({ message: 'Link copiado!', type: 'success' });
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
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Configurações do Restaurante</h2>
                
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 rounded text-red-900 shadow-md">
                        <p className="font-bold text-lg mb-1">⚠️ Erro de Salvamento</p>
                        <p className="text-sm whitespace-pre-wrap">{error}</p>
                        <button 
                            onClick={() => setShowFixModal(true)}
                            className="mt-3 bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 transition-colors"
                        >
                            Ver Solução / Corrigir Banco de Dados
                        </button>
                    </div>
                )}

                <div className="space-y-6">
                    {/* STORE LINK SECTION */}
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-orange-800 mb-2">Link da Loja</h3>
                        <p className="text-sm text-orange-700 mb-3">Compartilhe este link com seus clientes.</p>
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
                        <p className="text-sm text-gray-500 mb-4">Defina os dias em que seu restaurante abre. Isso controla se o cliente pode fazer pedidos.</p>
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
                                        <input 
                                            type="time" 
                                            value={day.opens}
                                            onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-1 border rounded-md disabled:bg-gray-200"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <input 
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
                         <h3 className="text-lg font-semibold text-gray-700 mb-2">Chave Pix Manual</h3>
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <label className="block text-xs font-bold text-gray-700 mb-1">Chave Pix (CPF, Email, Celular)</label>
                             <input 
                                type="text" 
                                placeholder="Ex: 123.456.789-00" 
                                value={manualPixKey} 
                                onChange={(e) => setManualPixKey(e.target.value)} 
                                className="w-full p-3 border rounded-lg bg-white"
                            />
                        </div>
                    </div>

                     <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Gateway de Pagamento (Opcional)</h3>
                        
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-blue-800 mb-2">Mercado Pago (Pix Automático)</h4>
                                <label htmlFor="mercadoPagoToken" className="block text-sm font-medium text-gray-600 mb-1 mt-3">
                                    Access Token:
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
                                    <label className="block text-xs font-bold text-blue-600 mb-1">URL de Webhook:</label>
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
                            className="bg-orange-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 shadow-lg text-lg"
                        >
                            {isSaving ? 'Verificando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal de Correção de Banco de Dados */}
            {showFixModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full">
                        <h3 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">🚨 Correção Obrigatória de Banco de Dados</h3>
                        
                        <p className="text-gray-700 mb-4 text-sm">
                            O sistema detectou que o Banco de Dados não está salvando os horários ou o token. Isso ocorre por <strong>Cache de Esquema</strong> (API desatualizada).
                        </p>
                        
                        <div className="bg-gray-100 p-4 rounded-lg mb-4 border border-gray-300">
                            <p className="font-bold text-gray-800 mb-2">PASSO 1: Copie o comando abaixo:</p>
                            <code className="block bg-black text-green-400 p-3 rounded text-xs overflow-x-auto font-mono select-all">
                                NOTIFY pgrst, 'reload schema';
                            </code>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-700 text-sm">
                                <strong>PASSO 2:</strong> Vá ao <strong>Supabase Dashboard</strong> &gt; <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.
                            </p>
                            <p className="text-gray-700 text-sm">
                                <strong>PASSO 3:</strong> Cole o comando e clique em <strong>RUN</strong>. Tente salvar novamente após isso.
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowFixModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold"
                            >
                                Fechar
                            </button>
                            <button 
                                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                            >
                                Abrir Supabase SQL Editor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Area */}
            <div className="hidden">
                <div id="printable-order">
                    {testOrder && <PrintableOrder order={testOrder} printerWidth={testPrinterWidth} />}
                </div>
            </div>
        </main>
    );
};

export default RestaurantSettings;
