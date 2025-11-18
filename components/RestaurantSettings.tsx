
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
// Use fetchRestaurantByIdSecure to get the token
import { fetchRestaurantByIdSecure, updateRestaurant } from '../services/databaseService';
import type { Restaurant, OperatingHours } from '../types';
import Spinner from './Spinner';

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
    const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(getDefaultOperatingHours());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        try {
            const openDays = operatingHours.filter(d => d.isOpen);
            const openingHoursSummary = openDays.length > 0 ? openDays[0].opens : '';
            const closingHoursSummary = openDays.length > 0 ? openDays[0].closes : '';

            const updatePayload: Partial<Restaurant> = {
                mercado_pago_credentials: { accessToken: mercadoPagoToken },
                operatingHours: operatingHours,
                openingHours: openingHoursSummary,
                closingHours: closingHoursSummary
            };
            await updateRestaurant(restaurantId, updatePayload);
            addToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
        } catch (err) {
            console.error(err);
            addToast({ message: `Erro ao salvar: ${err}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-4"><Spinner message="Carregando configurações..." /></div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!restaurant) return null;

    return (
        <main className="p-4 space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Configurações do Restaurante</h2>
                
                <div className="space-y-6">
                    <NotificationSettings />

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
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Gateway de Pagamento (Pix Automático)</h3>
                        <p className="text-sm text-gray-500 mb-4">Conecte sua conta do Mercado Pago para receber pagamentos via Pix de forma automática. O dinheiro irá direto para sua conta.</p>
                        <div>
                            <label htmlFor="mercadoPagoToken" className="block text-sm font-medium text-gray-600 mb-1">
                                Access Token do Vendedor (Mercado Pago)
                            </label>
                            <input
                                id="mercadoPagoToken"
                                type="password"
                                placeholder="APP_USR-..."
                                value={mercadoPagoToken}
                                onChange={(e) => setMercadoPagoToken(e.target.value)}
                                className="w-full p-3 border rounded-lg bg-gray-50"
                            />
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
        </main>
    );
};

export default RestaurantSettings;
