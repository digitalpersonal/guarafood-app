
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { fetchRestaurantByIdSecure, updateRestaurant } from '../services/databaseService';
import type { Restaurant, OperatingHours, Order } from '../types';
import Spinner from './Spinner';
import PrintableOrder from './PrintableOrder';
import { getErrorMessage } from '../services/api';

const NotificationSettings: React.FC = () => {
    const { addToast } = useNotification();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    useEffect(() => {
        const savedPref = localStorage.getItem('guarafood-notifications-enabled') === 'true';
        if (savedPref && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }
    }, []);

    const handleToggleNotifications = async () => {
        if (!notificationsEnabled) {
            if (permissionStatus === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('guarafood-notifications-enabled', 'true');
                addToast({ message: 'Notificações ativadas!', type: 'success' });
            } else if (permissionStatus === 'denied') {
                addToast({ message: 'Notificações bloqueadas no navegador.', type: 'error' });
            } else {
                const result = await Notification.requestPermission();
                setPermissionStatus(result);
                if (result === 'granted') {
                    setNotificationsEnabled(true);
                    localStorage.setItem('guarafood-notifications-enabled', 'true');
                }
            }
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('guarafood-notifications-enabled', 'false');
        }
    };
    
    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Alertas Sonoros</h3>
            <div className="flex items-center justify-between p-4 border rounded-xl bg-orange-50 border-orange-100 shadow-sm">
                <div>
                    <span className="font-bold block">Tocar Campainha</span>
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Status: {permissionStatus === 'granted' ? 'Ativo' : 'Pendente'}</span>
                </div>
                 <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={handleToggleNotifications} />
                        <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
                    </div>
                </label>
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
    const [printerWidth, setPrinterWidth] = useState(80);
    const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(getDefaultOperatingHours());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [testOrder, setTestOrder] = useState<Order | null>(null);

    const restaurantId = currentUser?.restaurantId;

    const loadData = useCallback(async () => {
        if (!restaurantId) return;
        try {
            setIsLoading(true);
            const data = await fetchRestaurantByIdSecure(restaurantId);
            if (data) {
                setRestaurant(data);
                setMercadoPagoToken(data.mercado_pago_credentials?.accessToken || '');
                setManualPixKey(data.manualPixKey || '');
                setOperatingHours(data.operatingHours || getDefaultOperatingHours());
                
                // Força o estado da impressora a partir do banco e sincroniza LocalStorage
                const savedWidth = data.printerWidth || 80;
                setPrinterWidth(savedWidth);
                localStorage.setItem('guarafood-printer-width', savedWidth.toString());
            }
        } catch (err) { 
            console.error(err); 
            addToast({ message: 'Erro ao carregar dados.', type: 'error' });
        } finally { 
            setIsLoading(false); 
        }
    }, [restaurantId, addToast]);

    useEffect(() => { loadData(); }, [loadData]);
    
    const handleOperatingHoursChange = (dayIndex: number, field: any, value: any) => {
        setOperatingHours(prev => {
            const newHours = [...prev];
            newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
            return newHours;
        });
    };

    const handleSaveChanges = async () => {
        if (!restaurantId || !restaurant) return;
        setIsSaving(true);
        try {
            await updateRestaurant(restaurantId, {
                mercado_pago_credentials: { accessToken: mercadoPagoToken },
                operatingHours: operatingHours,
                manualPixKey: manualPixKey,
                printerWidth: printerWidth
            });
            localStorage.setItem('guarafood-printer-width', printerWidth.toString());
            addToast({ message: 'Configurações salvas e sincronizadas!', type: 'success' });
        } catch (err: any) {
            console.error("Save Error:", err);
            addToast({ message: `Erro ao salvar: ${getErrorMessage(err)}`, type: 'error' });
        } finally { setIsSaving(false); }
    };
    
    const handleTestPrint = (width: number) => {
        if (!restaurant) return;
        const dummyOrder: Order = {
            id: 'TESTE-01', timestamp: new Date().toISOString(), status: 'Novo Pedido',
            customerName: 'Teste Layout Jerê/Renovação', customerPhone: '(35) 99999-9999',
            items: [{ id: '1', name: 'Pastel de Carne com Queijo', price: 15.00, basePrice: 15.00, quantity: 2, imageUrl: '', description: '' }],
            totalPrice: 35.00, subtotal: 30.00, deliveryFee: 5.00,
            restaurantId: restaurant.id, restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: 'Dinheiro',
        };
        setTestOrder(dummyOrder);
        setTimeout(() => window.print(), 300);
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Spinner message="Carregando painel de ajustes..." /></div>;
    if (!restaurant) return null;

    return (
        <main className="p-4 max-w-2xl mx-auto space-y-6 pb-32">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-black text-gray-800 border-b pb-4 mb-6 uppercase tracking-widest">Painel de Configuração</h2>
                
                <NotificationSettings />

                {/* --- SELETOR DE IMPRESSORA - DESTAQUE NO TOPO --- */}
                <div className="mb-10 bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 shadow-sm">
                    <h3 className="text-md font-black text-orange-800 mb-2 uppercase tracking-tight">Configuração da Impressora</h3>
                    <p className="text-xs text-orange-600/70 mb-4 font-bold">Selecione o tamanho do papel para alinhar o layout:</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button"
                            onClick={() => setPrinterWidth(80)}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${printerWidth === 80 ? 'bg-white border-orange-600 shadow-md scale-105' : 'bg-transparent border-orange-100 text-orange-300'}`}
                        >
                            <span className="font-black text-lg">80mm</span>
                            <span className="text-[9px] font-black uppercase">Padrão (Mesa/USB)</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPrinterWidth(58)}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${printerWidth === 58 ? 'bg-white border-orange-600 shadow-md scale-105' : 'bg-transparent border-orange-100 text-orange-300'}`}
                        >
                            <span className="font-black text-lg">58mm</span>
                            <span className="text-[9px] font-black uppercase">Portátil (Bluetooth)</span>
                        </button>
                    </div>
                    <button 
                        type="button"
                        onClick={() => handleTestPrint(printerWidth)} 
                        className="w-full mt-4 py-3 text-[10px] font-black uppercase bg-gray-800 text-white rounded-xl hover:bg-black transition-all shadow-sm active:scale-95"
                    >
                        Imprimir Cupom de Teste
                    </button>
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Horário de Funcionamento</h3>
                        <div className="space-y-2">
                            {operatingHours.map((day, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="col-span-5 flex items-center">
                                        <input type="checkbox" checked={day.isOpen} onChange={e => handleOperatingHoursChange(index, 'isOpen', e.target.checked)} className="h-5 w-5 mr-3" />
                                        <span className="font-bold text-xs text-gray-700">{daysOfWeek[index]}</span>
                                    </div>
                                    <div className="col-span-3">
                                        <input type="time" value={day.opens} onChange={e => handleOperatingHoursChange(index, 'opens', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
                                    </div>
                                    <div className="col-span-1 text-center text-gray-400 font-bold text-xs">às</div>
                                    <div className="col-span-3">
                                        <input type="time" value={day.closes} onChange={e => handleOperatingHoursChange(index, 'closes', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Recebimento de Pagamentos</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Chave Pix para Visualização</label>
                                <input type="text" value={manualPixKey} onChange={e => setManualPixKey(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" placeholder="Ex: CNPJ ou E-mail" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Token Mercado Pago (Opcional)</label>
                                <input type="password" value={mercadoPagoToken} onChange={e => setMercadoPagoToken(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" placeholder="APP_USR-..." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-6 border-t">
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={isSaving} 
                        className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-100 active:scale-95 transition-all text-lg uppercase tracking-widest"
                    >
                        {isSaving ? 'Salvando...' : 'Sincronizar Lojas'}
                    </button>
                </div>
            </div>

            <div className="hidden print:block">
                <div id="printable-order">
                    {testOrder && <PrintableOrder order={testOrder} printerWidth={printerWidth} />}
                </div>
            </div>
        </main>
    );
};

export default RestaurantSettings;
