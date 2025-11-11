import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
// Fix: The database functions are in databaseService, not geminiService.
import { fetchRestaurantById, updateRestaurant } from '../services/databaseService';
import type { Restaurant } from '../types';
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
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </div>
                </label>
            </div>
        </div>
    );
};


const RestaurantSettings: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [mercadoPagoToken, setMercadoPagoToken] = useState('');
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
            const data = await fetchRestaurantById(restaurantId);
            setRestaurant(data);
            setMercadoPagoToken(data.mercado_pago_credentials?.accessToken || '');
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

    const handleSaveChanges = async () => {
        if (!restaurantId) return;
        setIsSaving(true);
        try {
            const updatePayload: Partial<Restaurant> = {
                mercado_pago_credentials: { accessToken: mercadoPagoToken }
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
                            className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300"
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
