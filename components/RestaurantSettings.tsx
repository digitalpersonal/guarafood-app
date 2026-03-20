
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { useSound } from '../hooks/useSound';
import { supabase } from '../services/api';
import { fetchRestaurantByIdSecure, updateRestaurant } from '../services/databaseService';
import { clearTodayTableOrders } from '../services/orderService';
import type { Restaurant, OperatingHours, Order } from '../types';
import Spinner from './Spinner';
import PrintableOrder from './PrintableOrder';
import MensalistasManager from './MensalistasManager';
import { getErrorMessage } from '../services/api';

const NotificationSettings: React.FC = () => {
    const { addToast } = useNotification();
    const { playNotification, initAudioContext } = useSound();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    useEffect(() => {
        const savedPref = localStorage.getItem('guarafood-notifications-enabled') === 'true';
        if (savedPref) {
            setNotificationsEnabled(true);
        }
    }, []);

    const handleToggleNotifications = async () => {
        initAudioContext();
        if (!notificationsEnabled) {
            // Se já está garantido, apenas ativa
            if (permissionStatus === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('guarafood-notifications-enabled', 'true');
                addToast({ message: 'Alertas sonoros ativados!', type: 'success' });
                playNotification();
            } else {
                // Se não está negado, tenta pedir permissão para notificações visuais também
                if (permissionStatus !== 'denied' && typeof Notification !== 'undefined') {
                    try {
                        const result = await Notification.requestPermission();
                        setPermissionStatus(result);
                    } catch (e) {
                        console.error("Erro ao pedir permissão de notificação", e);
                    }
                }
                
                // Ativa o alerta sonoro de qualquer forma (pois som via Web Audio não depende da permissão de notificação)
                setNotificationsEnabled(true);
                localStorage.setItem('guarafood-notifications-enabled', 'true');
                
                if (permissionStatus === 'denied') {
                    addToast({ 
                        message: 'Alerta sonoro ativado! (Notificações visuais bloqueadas no navegador)', 
                        type: 'warning' 
                    });
                } else {
                    addToast({ message: 'Alertas sonoros ativados!', type: 'success' });
                }
                playNotification();
            }
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('guarafood-notifications-enabled', 'false');
        }
    };
    
    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Alertas Sonoros</h3>
            <div className="space-y-3">
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
                
                {notificationsEnabled && (
                    <button 
                        onClick={() => { initAudioContext(); playNotification(); }}
                        className="w-full py-2 text-[10px] font-black uppercase bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-all"
                    >
                        Testar Som da Campainha
                    </button>
                )}
            </div>
        </div>
    );
};

const BannerSettings: React.FC<{ restaurantId: number, currentBanner: string | undefined, onUpdate: (url: string) => void }> = ({ restaurantId, currentBanner, onUpdate }) => {
    const { addToast } = useNotification();
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState(currentBanner || '');

    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(img.src);
                    reject(new Error("Não foi possível processar a imagem."));
                    return;
                }
                const MAX_WIDTH = 1200; 
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) {
                        const compressedFile = new File([blob], "banner.jpg", { type: 'image/jpeg' });
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Falha na compressão."));
                    }
                }, 'image/jpeg', 0.7); 
            };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const compressed = await compressImage(file);
                const fileName = `banner-${Date.now()}.jpg`;
                const filePath = `${restaurantId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, compressed);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                setPreview(data.publicUrl);
                onUpdate(data.publicUrl);
                addToast({ message: 'Imagem de capa atualizada!', type: 'success' });
            } catch (err: any) {
                console.error(err);
                addToast({ message: 'Erro ao enviar imagem.', type: 'error' });
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Capa do Cardápio</h3>
            <div className="p-4 border rounded-xl bg-gray-50 border-gray-200 shadow-sm">
                <div className="relative h-32 w-full bg-gray-200 rounded-lg overflow-hidden mb-4">
                    {preview ? (
                        <img src={preview} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs font-bold uppercase">Sem imagem personalizada</div>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    )}
                </div>
                <label className="block">
                    <span className="sr-only">Escolher foto de capa</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-orange-50 file:text-orange-700
                            hover:file:bg-orange-100 cursor-pointer disabled:opacity-50"
                    />
                </label>
                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Recomendado: 1200x600px. Deixe em branco para usar o padrão da categoria.</p>
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
    const { addToast, confirm } = useNotification();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [mercadoPagoToken, setMercadoPagoToken] = useState('');
    const [manualPixKey, setManualPixKey] = useState('');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
    const [hasMensalistas, setHasMensalistas] = useState(false);
    const [hasKiloService, setHasKiloService] = useState(false);
    const [pricePerKilo, setPricePerKilo] = useState(0);
    const [printerWidth, setPrinterWidth] = useState(80);
    const [isPrintServer, setIsPrintServer] = useState(false);
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
                setBannerImageUrl(data.bannerImageUrl || '');
                setHasMensalistas(data.hasMensalistas || false);
                setHasKiloService(data.hasKiloService || false);
                setPricePerKilo(data.pricePerKilo || 0);
                setOperatingHours(data.operatingHours || getDefaultOperatingHours());
                
                // Força o estado da impressora a partir do banco e sincroniza LocalStorage
                const savedWidth = data.printerWidth || 80;
                setPrinterWidth(savedWidth);
                localStorage.setItem('guarafood-printer-width', savedWidth.toString());
                
                const savedIsPrintServer = localStorage.getItem('guarafood-is-print-server') === 'true';
                setIsPrintServer(savedIsPrintServer);
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
                marmitaStartTime: restaurant.marmitaStartTime,
                marmitaEndTime: restaurant.marmitaEndTime,
                manualPixKey: manualPixKey,
                printerWidth: printerWidth,
                bannerImageUrl: bannerImageUrl,
                hasMensalistas: hasMensalistas,
                hasKiloService: hasKiloService,
                pricePerKilo: pricePerKilo
            });
            localStorage.setItem('guarafood-printer-width', printerWidth.toString());
            localStorage.setItem('guarafood-is-print-server', isPrintServer.toString());
            addToast({ message: 'Configurações salvas e sincronizadas!', type: 'success' });
        } catch (err: any) {
            console.error("Save Error:", err);
            addToast({ message: `Erro ao salvar: ${getErrorMessage(err)}`, type: 'error' });
        } finally { setIsSaving(false); }
    };
    
    const handleCleanupTableOrders = async () => {
        if (!restaurantId) return;
        
        const confirmed = await confirm({
            title: 'Limpar Pedidos de Mesa',
            message: 'Tem certeza que deseja apagar TODOS os pedidos de mesa feitos HOJE? Essa ação não pode ser desfeita e removerá os dados do financeiro e histórico.',
            confirmText: 'Sim, Limpar',
            cancelText: 'Cancelar'
        });

        if (confirmed) {
            setIsSaving(true);
            try {
                await clearTodayTableOrders(restaurantId);
                addToast({ message: 'Pedidos de mesa de hoje foram removidos com sucesso.', type: 'success' });
            } catch (err: any) {
                console.error("Cleanup Error:", err);
                addToast({ message: `Erro ao limpar pedidos: ${getErrorMessage(err)}`, type: 'error' });
            } finally {
                setIsSaving(false);
            }
        }
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

                {restaurantId && (
                    <BannerSettings 
                        restaurantId={restaurantId} 
                        currentBanner={bannerImageUrl} 
                        onUpdate={setBannerImageUrl} 
                    />
                )}

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
                    
                    <div className="mt-6 pt-6 border-t border-orange-200">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <span className="font-bold text-orange-900 block">Modo Servidor de Impressão</span>
                                <span className="text-xs text-orange-700">Ative APENAS no computador que tem a impressora conectada.</span>
                            </div>
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={isPrintServer} onChange={e => setIsPrintServer(e.target.checked)} />
                                <div className="w-11 h-6 bg-orange-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Horário de Funcionamento</h3>
                        <div className="space-y-2">
                            {operatingHours.map((day, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
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
                                    <div className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="col-span-5 flex items-center">
                                            <span className="font-bold text-[10px] text-gray-400 uppercase ml-8">2º Turno</span>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.opens2 || ''} onChange={e => handleOperatingHoursChange(index, 'opens2', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
                                        </div>
                                        <div className="col-span-1 text-center text-gray-400 font-bold text-xs">às</div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.closes2 || ''} onChange={e => handleOperatingHoursChange(index, 'closes2', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- CONFIGURAÇÃO DE MARMITAS --- */}
                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Gerenciamento de Mensalistas</h3>
                        <div className="mb-4">
                            <label className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <span className="font-bold text-gray-800 block">Ativar Mensalistas</span>
                                    <span className="text-xs text-gray-500">Exibir o módulo de mensalistas no painel financeiro.</span>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={hasMensalistas} onChange={e => setHasMensalistas(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>
                        </div>
                        <MensalistasManager />
                    </div>

                    {/* --- CONFIGURAÇÃO DE COMIDA POR KILO --- */}
                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Serviço de Comida por Kilo</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <span className="font-bold text-gray-800 block">Ativar Venda por Peso</span>
                                    <span className="text-xs text-gray-500">Permite adicionar itens ao pedido informando apenas o peso.</span>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={hasKiloService} onChange={e => setHasKiloService(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </div>
                            </label>

                            {hasKiloService && (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 ml-1">Valor do Quilo (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600">R$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={pricePerKilo} 
                                            onChange={e => setPricePerKilo(parseFloat(e.target.value) || 0)} 
                                            className="w-full p-3 pl-12 border border-emerald-200 rounded-xl font-mono text-lg bg-white text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none" 
                                            placeholder="0,00" 
                                        />
                                    </div>
                                    <p className="text-[10px] text-emerald-600 mt-2 font-bold uppercase italic">
                                        * O sistema calculará automaticamente: Peso (kg) x Valor do Quilo
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Configuração de Marmitas</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Início (Almoço)</label>
                                <input type="time" value={restaurant.marmitaStartTime || '10:00'} onChange={e => setRestaurant({...restaurant, marmitaStartTime: e.target.value})} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Fim (Almoço)</label>
                                <input type="time" value={restaurant.marmitaEndTime || '15:30'} onChange={e => setRestaurant({...restaurant, marmitaEndTime: e.target.value})} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Manutenção de Dados</h3>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <h4 className="font-bold text-red-800 mb-2 text-sm">Zona de Perigo</h4>
                            <p className="text-xs text-red-600 mb-4">Ações irreversíveis para correção de dados.</p>
                            <button 
                                onClick={handleCleanupTableOrders}
                                className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-xs uppercase hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                            >
                                Limpar Pedidos de Mesa (Hoje)
                            </button>
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
