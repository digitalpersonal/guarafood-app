
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
            <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center sm:text-left">Campainha de Novos Pedidos</h3>
            <p className="text-sm text-gray-500 mb-4">Receba um alerta sonoro e visual no seu dispositivo sempre que um novo pedido chegar.</p>
            <div className="flex items-center justify-between p-4 border rounded-xl bg-orange-50 border-orange-100 shadow-sm">
                <div className="flex flex-col">
                    <span className="font-bold text-orange-900">Ativar Som e Alertas</span>
                    <span className="text-xs text-orange-700/70">Permissão atual: {getPermissionText()}</span>
                </div>
                 <label htmlFor="notification-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input id="notification-toggle" type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={handleToggleNotifications} />
                        <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
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
        <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Impressora Térmica</h3>
            <p className="text-sm text-gray-500 mb-4">Escolha a largura do papel para que o cupom saia com o alinhamento correto.</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <button 
                    onClick={() => handleWidthChange(80)}
                    className={`flex-1 p-4 border-2 rounded-xl transition-all text-left ${printerWidth === 80 ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'}`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-800">Padrão (80mm)</span>
                        {printerWidth === 80 && <div className="w-3 h-3 bg-orange-500 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">Ideal para impressoras de balcão (Epson, Bematech, Elgin).</p>
                </button>

                <button 
                    onClick={() => handleWidthChange(58)}
                    className={`flex-1 p-4 border-2 rounded-xl transition-all text-left ${printerWidth === 58 ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'}`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-800">Compacta (58mm)</span>
                        {printerWidth === 58 && <div className="w-3 h-3 bg-orange-500 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">Para impressoras Bluetooth ou portáteis "Maquininha".</p>
                </button>
            </div>

            <div className="mt-6 space-y-4">
                <button 
                    onClick={() => onTestPrint(printerWidth)} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.253 1.464 2.405 3.06 2.405 4.5 0 1.356-1.07 2.448-2.384 2.448H6.384C5.07 24.948 4 23.856 4 22.5c0-1.44 1.152-3.036 2.405-4.5m11.318 0c.397-1.362.63-2.826.63-4.342 0-1.44-1.152-3.036-2.405-4.5l-1.050-1.242A3.375 3.375 0 0 0 14.25 6H9.75a3.375 3.375 0 0 0-2.345 1.05L6.34 8.292c-1.253 1.464-2.405 3.06-2.405 4.5 0 1.516.233 2.98.63 4.342m6.78-4.571a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
                    </svg>
                    Imprimir Teste ({printerWidth}mm)
                </button>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm">
                    <h4 className="font-extrabold text-blue-900 flex items-center gap-2 mb-2">
                         🚀 IMPRESSÃO AUTOMÁTICA (MODO PROFISSIONAL)
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed mb-4">
                        Para o sistema imprimir <strong>sozinho</strong> e o som de alerta funcionar mesmo se você estiver ouvindo música no YouTube, siga estes passos no Windows:
                    </p>
                    
                    <div className="space-y-4">
                        <div className="bg-white/60 p-3 rounded-lg border border-blue-100">
                            <p className="text-xs font-bold text-blue-900 uppercase mb-1">Passo 1: Evite conflitos de navegadores</p>
                            <p className="text-sm text-blue-800 italic">O jeito mais fácil é usar o <strong>Microsoft Edge</strong> ou <strong>Firefox</strong> para a música, e deixar o Chrome exclusivo para o GuaraFood.</p>
                        </div>

                        <div className="bg-white/60 p-3 rounded-lg border border-blue-100">
                            <p className="text-xs font-bold text-blue-900 uppercase mb-1">Passo 2: O Segredo do Perfil Isolado</p>
                            <p className="text-sm text-blue-800 mb-2">Se quiser usar Chrome para tudo, altere o atalho do GuaraFood para este código (no campo <strong>Destino</strong>):</p>
                            <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-[11px] break-all select-all shadow-inner">
                                --kiosk-printing --user-data-dir="C:/GuaraFoodApp"
                            </div>
                        </div>

                        <div className="bg-blue-100/50 p-3 rounded-lg border border-blue-200">
                             <p className="text-xs text-blue-800">
                                <strong>Por que isolar?</strong> O comando <code>--user-data-dir</code> cria uma instância separada. Assim, sua música no YouTube "normal" não desativa o modo de impressão automática do atalho do GuaraFood.
                             </p>
                        </div>
                    </div>
                </div>
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
    const [showFixModal, setShowFixModal] = useState(false); 
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
            
            if (!data) {
                setError("Restaurante não encontrado.");
                setIsLoading(false);
                return;
            }

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
            const savedData = await updateRestaurant(restaurantId, updatePayload);
            
            setRestaurant(prev => {
                if (!prev) return savedData;
                return {
                    ...savedData,
                    operatingHours: operatingHours,
                    mercado_pago_credentials: { accessToken: mercadoPagoToken },
                    manualPixKey: manualPixKey
                };
            });

            const savedToken = savedData.mercado_pago_credentials?.accessToken || '';
            const isTokenSaved = savedToken === mercadoPagoToken;
            const savedHoursStr = JSON.stringify(savedData.operatingHours);
            const sentHoursStr = JSON.stringify(operatingHours);
            const isHoursSaved = savedHoursStr === sentHoursStr;

            if (!isTokenSaved || !isHoursSaved) {
                setShowFixModal(true); 
                addToast({ message: 'Salvo localmente!', type: 'warning', duration: 6000 });
            } else {
                addToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
            }
            
        } catch (err: any) {
            console.error(err);
            const msg = err.message || JSON.stringify(err);
            setError(`FALHA AO SALVAR: ${msg}`);
            
            if (msg.includes('operating_hours') || msg.includes('mercado_pago_credentials')) {
                setShowFixModal(true);
            }
            
            addToast({ message: "Erro ao salvar. Tente rodar a correção de banco.", type: 'error', duration: 5000 });
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
            <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Painel de Controle</h2>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 rounded-r-xl text-red-900 shadow-sm">
                        <p className="font-bold text-lg mb-1">⚠️ Problema Detectado</p>
                        <p className="text-sm whitespace-pre-wrap">{error}</p>
                        <button 
                            onClick={() => setShowFixModal(true)}
                            className="mt-3 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                        >
                            Corrigir Banco de Dados
                        </button>
                    </div>
                )}

                <div className="space-y-8">
                    {/* STORE LINK SECTION */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-5 rounded-2xl shadow-inner">
                        <h3 className="text-lg font-bold text-orange-900 mb-2">Divulgação da Loja</h3>
                        <p className="text-sm text-orange-800/80 mb-4">Seu cardápio está online! Envie o link para os clientes ou coloque na bio do Instagram.</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={`${window.location.origin}?r=${restaurant.id}`} 
                                className="flex-grow p-3 border-2 border-orange-200 rounded-xl bg-white text-gray-700 text-sm font-medium"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCopyStoreLink} className="flex-1 sm:flex-none bg-orange-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-orange-700 transition-all shadow-md active:scale-95">
                                    Copiar
                                </button>
                                <button onClick={handleWhatsappShare} className="flex-1 sm:flex-none bg-green-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95">
                                    WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>

                    <NotificationSettings />
                    <PrinterSettings onTestPrint={handleTestPrint} />

                     <div className="border-t pt-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Horário de Funcionamento</h3>
                        <p className="text-sm text-gray-500 mb-4">Controle quando sua loja aparece como "Aberta" no aplicativo.</p>
                        <div className="space-y-2">
                            {operatingHours.map((day, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="col-span-5 flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id={`isopen-merchant-${index}`}
                                            checked={day.isOpen}
                                            onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)}
                                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-3"
                                        />
                                        <label htmlFor={`isopen-merchant-${index}`} className="font-bold text-sm text-gray-700">{daysOfWeek[index]}</label>
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="time" 
                                            value={day.opens}
                                            onChange={(e) => handleOperatingHoursChange(index, 'opens', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-2 border rounded-lg text-sm disabled:bg-gray-200 disabled:text-gray-400"
                                        />
                                    </div>
                                    <div className="col-span-1 text-center text-gray-400">às</div>
                                    <div className="col-span-3">
                                        <input 
                                            type="time" 
                                            value={day.closes}
                                            onChange={(e) => handleOperatingHoursChange(index, 'closes', e.target.value)}
                                            disabled={!day.isOpen}
                                            className="w-full p-2 border rounded-lg text-sm disabled:bg-gray-200 disabled:text-gray-400"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-8">
                         <h3 className="text-lg font-semibold text-gray-700 mb-2">Chave Pix Manual</h3>
                         <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CPF, CNPJ, Email ou Celular</label>
                             <input 
                                type="text" 
                                placeholder="Digite aqui sua chave pix..." 
                                value={manualPixKey} 
                                onChange={(e) => setManualPixKey(e.target.value)} 
                                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white focus:border-orange-500 focus:ring-0 transition-all font-mono font-bold"
                            />
                            <p className="text-[10px] text-gray-400 mt-2">Esta chave será exibida para o cliente caso o Pix Automático não esteja disponível ou falhe.</p>
                        </div>
                    </div>

                     <div className="border-t pt-8">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Pix Automático (Mercado Pago)</h3>
                        
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm">
                                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                    </svg>
                                    Credenciais de Automação
                                </h4>
                                <label htmlFor="mercadoPagoToken" className="block text-xs font-bold text-blue-800 uppercase mb-1">
                                    Access Token de Produção:
                                </label>
                                <input
                                    id="mercadoPagoToken"
                                    type="password"
                                    placeholder="APP_USR-..."
                                    value={mercadoPagoToken}
                                    onChange={(e) => setMercadoPagoToken(e.target.value)}
                                    className="w-full p-3 border-2 border-blue-100 rounded-xl bg-white focus:border-blue-500 transition-all font-mono"
                                />
                                
                                <div className="mt-5 pt-5 border-t border-blue-200/50">
                                    <label className="block text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">URL de Webhook (Configurar no Mercado Pago):</label>
                                    <div className="flex gap-2">
                                         <code className="block flex-grow bg-white/80 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 break-all select-all cursor-text font-mono shadow-inner">
                                            {webhookUrl}
                                        </code>
                                    </div>
                                    <p className="text-[10px] text-blue-700/70 mt-2 leading-tight">
                                        O Webhook é o que avisa o GuaraFood que o Pix foi pago para liberar o pedido automaticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t pt-8 flex flex-col sm:flex-row justify-end gap-4">
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="w-full sm:w-auto bg-orange-600 text-white font-black py-4 px-12 rounded-2xl hover:bg-orange-700 transition-all disabled:bg-orange-300 shadow-xl shadow-orange-200 text-lg active:scale-95"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Todas Alterações'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal de Correção de Banco de Dados */}
            {showFixModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full border-t-8 border-red-600">
                        <h3 className="text-2xl font-black text-red-600 mb-4">🚨 Ação Necessária</h3>
                        
                        <p className="text-gray-800 mb-6 text-sm leading-relaxed">
                            O Banco de Dados precisa reconhecer as novas funções de horário e pagamento. <strong>Não se preocupe</strong>, é um processo simples de um clique.
                        </p>
                        
                        <div className="bg-gray-100 p-4 rounded-xl mb-6 border border-gray-200">
                            <p className="font-bold text-gray-800 text-xs uppercase mb-3">Passo 1: Copie o comando abaixo:</p>
                            <code className="block bg-black text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono select-all shadow-inner">
                                NOTIFY pgrst, 'reload schema';
                            </code>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-700 text-sm font-medium">
                                <strong>Passo 2:</strong> Clique no botão azul abaixo para abrir o editor de SQL do seu banco.
                            </p>
                            <p className="text-gray-700 text-sm font-medium">
                                <strong>Passo 3:</strong> Cole o código e aperte <strong>RUN</strong>. Volte aqui e salve novamente.
                            </p>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                             <button 
                                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank')}
                                className="flex-1 bg-blue-600 text-white rounded-xl py-4 font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                            >
                                ABRIR SQL EDITOR
                            </button>
                            <button 
                                onClick={() => setShowFixModal(false)}
                                className="flex-1 px-4 py-4 text-gray-500 hover:text-gray-800 rounded-xl font-bold transition-colors"
                            >
                                Ignorar por enquanto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Area. FIX: use print:block */}
            <div className="hidden print:block">
                <div id="printable-order">
                    {testOrder && <PrintableOrder order={testOrder} printerWidth={testPrinterWidth} />}
                </div>
            </div>
        </main>
    );
};

export default RestaurantSettings;
