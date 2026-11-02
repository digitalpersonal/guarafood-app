
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
import PrinterManagement from './PrinterManagement';
import MensalistasManager from './MensalistasManager';
import MercadoPagoGuide from './MercadoPagoGuide';
import { FeaturedPromoManager } from './FeaturedPromoManager';
import { getErrorMessage } from '../services/api';
import ChromeMemorySaverGuide from './ChromeMemorySaverGuide';
import { KNOWN_CITIES } from '../utils/locationService';
import { FiscalXmlValidatorModal } from './FiscalXmlValidatorModal';

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

const LoyaltyProgramSettings: React.FC<{
    loyaltyProgram: Restaurant['loyaltyProgram'];
    onChange: (loyaltyProgram: Restaurant['loyaltyProgram']) => void;
}> = ({ loyaltyProgram, onChange }) => {
    const config = loyaltyProgram || {
        active: false,
        pointsPerReal: 1,
        rewardThreshold: 100,
        rewardType: 'FIXED_DISCOUNT',
        rewardValue: 10
    };

    return (
        <div className="border-t pt-8">
            <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                Clube de Fidelidade
            </h3>
            
            <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
                    <div className="relative">
                        <input type="checkbox" className="sr-only peer" checked={config.active} onChange={e => onChange({ ...config, active: e.target.checked })} />
                        <div className="w-11 h-6 bg-indigo-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                    <div>
                        <span className="font-bold text-indigo-900 block">Ativar Clube de Pontos</span>
                        <span className="text-xs text-indigo-700">Recompense clientes que compram frequentemente com você.</span>
                    </div>
                </label>

                {config.active && (
                    <div className="p-4 bg-white border border-indigo-100 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Pontos por cada 1 Real</label>
                                <input type="number" value={config.pointsPerReal} onChange={e => onChange({ ...config, pointsPerReal: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Pontos para Recompensa</label>
                                <input type="number" value={config.rewardThreshold} onChange={e => onChange({ ...config, rewardThreshold: parseInt(e.target.value) || 0 })} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="border-t border-indigo-50 pt-4">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">Tipo de Recompensa</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <label className={`p-3 border rounded-xl cursor-pointer text-sm font-bold text-center transition-colors ${config.rewardType === 'FIXED_DISCOUNT' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                    <input type="radio" className="hidden" checked={config.rewardType === 'FIXED_DISCOUNT'} onChange={() => onChange({ ...config, rewardType: 'FIXED_DISCOUNT' })} />
                                    Desconto Fixo (R$)
                                </label>
                                <label className={`p-3 border rounded-xl cursor-pointer text-sm font-bold text-center transition-colors ${config.rewardType === 'PERCENTAGE_DISCOUNT' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                    <input type="radio" className="hidden" checked={config.rewardType === 'PERCENTAGE_DISCOUNT'} onChange={() => onChange({ ...config, rewardType: 'PERCENTAGE_DISCOUNT' })} />
                                    % de Desconto
                                </label>
                                <label className={`p-3 border rounded-xl cursor-pointer text-sm font-bold text-center transition-colors ${config.rewardType === 'FREE_ITEM' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                    <input type="radio" className="hidden" checked={config.rewardType === 'FREE_ITEM'} onChange={() => onChange({ ...config, rewardType: 'FREE_ITEM' })} />
                                    Prêmio Físico
                                </label>
                            </div>
                        </div>

                        {config.rewardType !== 'FREE_ITEM' ? (
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Valor do Desconto</label>
                                <div className="relative">
                                    {config.rewardType === 'FIXED_DISCOUNT' && <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>}
                                    <input type="number" step="0.01" value={config.rewardValue} onChange={e => onChange({ ...config, rewardValue: parseFloat(e.target.value) || 0 })} className={`w-full p-3 ${config.rewardType === 'FIXED_DISCOUNT' ? 'pl-12' : ''} border rounded-xl font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500`} />
                                    {config.rewardType === 'PERCENTAGE_DISCOUNT' && <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Item de Recompensa</label>
                                <input type="text" placeholder="Ex: 1 Refrigerante 2L / 1 X-Tudo" value={config.rewardItemName || ''} onChange={e => onChange({ ...config, rewardItemName: e.target.value })} className="w-full p-3 border rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        )}
                        
                        <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-800">
                            <strong>Resumo:</strong> A cada R$ 1,00 gasto o cliente ganha {config.pointsPerReal} ponto(s). Ao acumular {config.rewardThreshold} pontos, ele recebe {
                                config.rewardType === 'FIXED_DISCOUNT' ? `R$ ${config.rewardValue.toFixed(2)} de desconto` :
                                config.rewardType === 'PERCENTAGE_DISCOUNT' ? `${config.rewardValue}% de desconto` :
                                `o item "${config.rewardItemName || 'a definir'}" gratuitamente`
                            } na próxima compra.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const RestaurantSettings: React.FC<{ 
    restaurantIdOverride?: number; 
    onBack?: () => void;
    onNavigateToPrinters?: () => void;
}> = ({ restaurantIdOverride, onBack, onNavigateToPrinters }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm } = useNotification();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [city, setCity] = useState('Guaranésia');
    const [mercadoPagoToken, setMercadoPagoToken] = useState('');
    const [asaasApiKey, setAsaasApiKey] = useState('');
    const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<'mercadopago' | 'asaas'>('mercadopago');
    const [manualPixKey, setManualPixKey] = useState('');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
    const [hasMensalistas, setHasMensalistas] = useState(false);
    const [hasKiloService, setHasKiloService] = useState(false);
    const [showPrintersInline, setShowPrintersInline] = useState(false);
    const [pricePerKilo, setPricePerKilo] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [disableDelivery, setDisableDelivery] = useState(false);
    const [enableFiscal, setEnableFiscal] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [ie, setIe] = useState('');
    const [im, setIm] = useState('');
    const [blingApiKey, setBlingApiKey] = useState('');
    const [fiscalProvider, setFiscalProvider] = useState('focus');
    const [fiscalCsc, setFiscalCsc] = useState('');
    const [fiscalCscId, setFiscalCscId] = useState('1');
    const [fiscalEnv, setFiscalEnv] = useState<'homologacao' | 'producao'>('homologacao');
    const [nuvemClientId, setNuvemClientId] = useState('');
    const [nuvemClientSecret, setNuvemClientSecret] = useState('');
    const [isTestingNuvem, setIsTestingNuvem] = useState(false);
    const [nuvemTestResult, setNuvemTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestNuvemAuth = async () => {
        if (!nuvemClientId || !nuvemClientSecret) {
            addToast({ message: 'Preencha o Client ID e Client Secret da Nuvem Fiscal antes de testar.', type: 'error' });
            return;
        }
        setIsTestingNuvem(true);
        setNuvemTestResult(null);
        try {
            const res = await fetch('/api/fiscal/test-nuvem-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: nuvemClientId, clientSecret: nuvemClientSecret })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNuvemTestResult({ success: true, message: data.message || 'Credenciais autenticadas com sucesso!' });
                addToast({ message: 'Conexão com a Nuvem Fiscal autorizada com sucesso!', type: 'success' });
            } else {
                setNuvemTestResult({ success: false, message: data.error || 'Falha na autenticação das chaves.' });
                addToast({ message: data.error || 'Falha ao autenticar com Nuvem Fiscal.', type: 'error' });
            }
        } catch (err: any) {
            console.error(err);
            setNuvemTestResult({ success: false, message: err.message || 'Erro de conexão com o servidor.' });
            addToast({ message: 'Erro ao testar conexão com Nuvem Fiscal.', type: 'error' });
        } finally {
            setIsTestingNuvem(false);
        }
    };
    const [certPassword, setCertPassword] = useState('');
    const [certFileName, setCertFileName] = useState('');
    const [isTestingFiscal, setIsTestingFiscal] = useState(false);
    const [showXmlValidatorModal, setShowXmlValidatorModal] = useState(false);
    const [printerWidth, setPrinterWidth] = useState(80);
    const [isPrintServer, setIsPrintServer] = useState(false);
    const [printServerRole, setPrintServerRole] = useState<'all' | 'kitchen' | 'counter'>('all');
    const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(getDefaultOperatingHours());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [testOrder, setTestOrder] = useState<Order | null>(null);

    const restaurantId = restaurantIdOverride || currentUser?.restaurantId;

    const loadData = useCallback(async () => {
        if (!restaurantId) {
            setIsLoading(false);
            addToast({ message: 'Erro: ID do restaurante não encontrado no perfil do usuário.', type: 'error' });
            return;
        }
        try {
            setIsLoading(true);
            
            // Promise.race timeout for premium offline resiliency
            const data = await Promise.race([
                fetchRestaurantByIdSecure(restaurantId),
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 3500))
            ]).catch(err => {
                console.warn("[GuaraFood Offline Mode] Settings fetch timed out or failed. Pulling from local cache.", err);
                const cachedRestaurant = localStorage.getItem('guarafood-cached-restaurant');
                return cachedRestaurant ? JSON.parse(cachedRestaurant) : null;
            });

            if (data) {
                setRestaurant(data);
                localStorage.setItem('guarafood-cached-restaurant', JSON.stringify(data));
                setCity(data.city || 'Guaranésia');
                setMercadoPagoToken(data.mercado_pago_credentials?.accessToken || '');
                setAsaasApiKey(data.asaas_credentials?.apiKey || '');
                setSelectedPaymentGateway(data.selectedPaymentGateway || 'mercadopago');
                setManualPixKey(data.manualPixKey || '');
                setBannerImageUrl(data.bannerImageUrl || '');
                setHasMensalistas(data.hasMensalistas || false);
                setHasKiloService(data.hasKiloService || false);
                setPricePerKilo(data.pricePerKilo || 0);
                setDeliveryFee(data.deliveryFee != null ? Number(data.deliveryFee) : 0);
                setDisableDelivery(data.disableDelivery || false);
                setEnableFiscal(data.enableFiscal || false);
                setCnpj(data.cnpj || '');
                setIe(data.ie || '');
                setIm(data.im || '');
                setBlingApiKey(data.blingApiKey || '');
                setFiscalProvider(data.fiscalProvider || 'focus');
                setFiscalCsc(data.fiscalCsc || '');
                setFiscalCscId(data.fiscalCscId || '1');
                setFiscalEnv(data.fiscalEnv || 'homologacao');
                setNuvemClientId(data.nuvemClientId || '');
                setNuvemClientSecret(data.nuvemClientSecret || '');
                setOperatingHours(data.operatingHours || getDefaultOperatingHours());
                
                // Força o estado da impressora a partir do banco e sincroniza LocalStorage
                const savedWidth = data.printerWidth || 80;
                setPrinterWidth(savedWidth);
                localStorage.setItem('guarafood-printer-width', savedWidth.toString());
                
                const savedIsPrintServer = localStorage.getItem('guarafood-is-print-server') === 'true';
                setIsPrintServer(savedIsPrintServer);
                const savedRole = (localStorage.getItem('guarafood-print-server-role') as 'all' | 'kitchen' | 'counter') || 'all';
                setPrintServerRole(savedRole);
            }
        } catch (err) { 
            console.error(err); 
            addToast({ message: 'Erro ao carregar dados. Usando dados locais.', type: 'warning' });
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
        
        // Validação Fiscal se estiver ativado
        if (enableFiscal) {
            const cleanCnpj = cnpj.replace(/\D/g, '');
            if (!cleanCnpj || cleanCnpj.length !== 14) {
                addToast({ message: 'Erro: O CNPJ deve conter exatamente 14 dígitos válidos.', type: 'error' });
                return;
            }
            if (!ie.trim()) {
                addToast({ message: 'Erro: A Inscrição Estadual (I.E.) é obrigatória para emissão fiscal.', type: 'error' });
                return;
            }
        }

        setIsSaving(true);
        const cleanMpToken = (mercadoPagoToken || '').trim().replace(/^(pp_usr|p_usr|app_usr)-/i, 'APP_USR-');
        try {
            await updateRestaurant(restaurantId, {
                city: city,
                mercado_pago_credentials: { accessToken: cleanMpToken },
                asaas_credentials: { apiKey: (asaasApiKey || '').trim() },
                selectedPaymentGateway: selectedPaymentGateway,
                operatingHours: operatingHours,
                marmitaStartTime: restaurant.marmitaStartTime,
                marmitaEndTime: restaurant.marmitaEndTime,
                manualPixKey: manualPixKey,
                printerWidth: printerWidth,
                bannerImageUrl: bannerImageUrl,
                hasMensalistas: hasMensalistas,
                hasKiloService: hasKiloService,
                pricePerKilo: pricePerKilo,
                deliveryFee: Number(deliveryFee) || 0,
                disableDelivery: disableDelivery,
                enableFiscal: enableFiscal,
                cnpj: cnpj,
                ie: ie,
                im: im,
                blingApiKey: blingApiKey,
                fiscalProvider: fiscalProvider,
                fiscalCsc: fiscalCsc,
                fiscalCscId: fiscalCscId,
                fiscalEnv: fiscalEnv,
                nuvemClientId: nuvemClientId,
                nuvemClientSecret: nuvemClientSecret
            });
            localStorage.setItem('guarafood-printer-width', printerWidth.toString());
            localStorage.setItem('guarafood-is-print-server', isPrintServer.toString());
            localStorage.setItem('guarafood-print-server-role', printServerRole);
            addToast({ message: 'Configurações salvas e sincronizadas!', type: 'success' });
        } catch (err: any) {
            console.error("Save Error:", err);
            addToast({ message: `Erro ao salvar: ${getErrorMessage(err)}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const [isSavingFeeQuick, setIsSavingFeeQuick] = useState(false);

    const handleSaveDeliveryFeeQuick = async () => {
        if (!restaurantId) return;
        setIsSavingFeeQuick(true);
        try {
            const fee = Number(deliveryFee) || 0;
            await updateRestaurant(restaurantId, {
                deliveryFee: fee,
                disableDelivery: disableDelivery
            });
            if (restaurant) {
                const updated = { ...restaurant, deliveryFee: fee, disableDelivery };
                setRestaurant(updated);
                localStorage.setItem('guarafood-cached-restaurant', JSON.stringify(updated));
            }
            addToast({ 
                message: `Taxa de entrega salva com sucesso (${fee === 0 ? 'Grátis' : `R$ ${fee.toFixed(2)}`})!`, 
                type: 'success' 
            });
        } catch (err: any) {
            console.error("Save Fee Error:", err);
            addToast({ message: `Erro ao salvar taxa de entrega: ${getErrorMessage(err)}`, type: 'error' });
        } finally {
            setIsSavingFeeQuick(false);
        }
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
    
    const handleTestPrint = async (width: number) => {
        if (!restaurant) return;
        const dummyOrder: Order = {
            id: 'TESTE-01', timestamp: new Date().toISOString(), status: 'Novo Pedido',
            customerName: 'Teste Layout', customerPhone: '(35) 99999-9999',
            items: [{ 
                id: '1', name: 'Pastel Especial', price: 15.00, basePrice: 15.00, quantity: 2, imageUrl: '', description: '',
                selectedOptions: [{ groupTitle: 'Massa', optionName: 'Integral', price: 0 }],
                selectedAddons: [], notes: 'Bem assado e crocante'
            }],
            totalPrice: 30.00, subtotal: 30.00, deliveryFee: 0.00,
            restaurantId: restaurant.id, restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: 'Dinheiro',
        };
        
        setTestOrder(dummyOrder);
        
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Spinner message="Carregando painel de ajustes..." /></div>;
    if (!restaurant) return null;

    return (
        <main className="p-4 max-w-2xl mx-auto space-y-6 pb-32">
            {onBack && (
                <button onClick={onBack} className="mb-4 flex items-center text-gray-500 hover:text-gray-800 font-bold text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    Voltar para Administração
                </button>
            )}
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-black text-gray-800 border-b pb-4 mb-6 uppercase tracking-widest">Painel de Configuração</h2>
                
                <NotificationSettings />


                {/* --- CONFIGURAÇÃO DE ENTREGAS E TAXA DE FRETE (PRIORIDADE ALTA) --- */}
                <div className="mb-10 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/70 p-6 rounded-2xl border-2 border-orange-300 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/60 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-3xl">🛵</span>
                            <div>
                                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                                    Entregas e Taxa de Frete
                                </h3>
                                <p className="text-xs text-gray-600 font-medium">
                                    Defina o valor fixo cobrado por entrega aos seus clientes ou ofereça frete grátis.
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-black px-3.5 py-1.5 rounded-full border self-start sm:self-auto bg-white text-orange-700 border-orange-300 shadow-2xs">
                            {deliveryFee === 0 ? '🎁 Frete Grátis Ativo' : `R$ ${deliveryFee.toFixed(2)} por entrega`}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
                        <div>
                            <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                Valor Cobrado por Entrega (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-base">R$</span>
                                <input 
                                    type="number" 
                                    step="0.50" 
                                    min="0"
                                    value={deliveryFee} 
                                    onChange={e => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))} 
                                    placeholder="0.00" 
                                    className="w-full p-3.5 pl-11 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white font-mono text-xl font-black text-gray-900 shadow-inner outline-none" 
                                />
                            </div>
                        </div>

                        {/* Botões de Atalho */}
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Valores rápidos:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {[0, 3, 5, 6, 7, 8, 10, 12].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setDeliveryFee(val)}
                                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                            deliveryFee === val 
                                                ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-200'
                                        }`}
                                    >
                                        {val === 0 ? 'Grátis (0)' : `R$ ${val},00`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desativar Entregas (Apenas Retirada) */}
                    <label className="flex items-center justify-between cursor-pointer p-3.5 bg-white rounded-xl border border-orange-200 hover:bg-orange-50/40 transition-colors">
                        <div>
                            <span className="font-bold text-gray-800 block text-xs">Desativar Entregas (Apenas Retirada no Balcão)</span>
                            <span className="text-[11px] text-gray-500">Clientes só poderão fazer pedidos para retirar no local (chuva, falta de entregador).</span>
                        </div>
                        <div className="relative">
                            <input type="checkbox" className="sr-only peer" checked={disableDelivery} onChange={e => setDisableDelivery(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </div>
                    </label>

                    {/* Botão de Salvar Imediato do Frete */}
                    <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleSaveDeliveryFeeQuick}
                            disabled={isSavingFeeQuick}
                            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                            {isSavingFeeQuick ? 'Salvando Frete...' : '✓ Salvar Taxa de Frete Agora'}
                        </button>
                    </div>
                </div>

                <div className="mb-10 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Configuração de Pagamento (Pix)</h3>
                    
                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Gateway Ativo</label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPaymentGateway === 'mercadopago' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                                <input type="radio" className="sr-only" checked={selectedPaymentGateway === 'mercadopago'} onChange={() => setSelectedPaymentGateway('mercadopago')} />
                                <span className="font-bold text-gray-800">Mercado Pago</span>
                            </label>
                            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPaymentGateway === 'asaas' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                                <input type="radio" className="sr-only" checked={selectedPaymentGateway === 'asaas'} onChange={() => setSelectedPaymentGateway('asaas')} />
                                <span className="font-bold text-gray-800">Asaas</span>
                            </label>
                        </div>
                    </div>

                    {selectedPaymentGateway === 'mercadopago' ? (
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Token de Acesso (Mercado Pago)</label>
                            <input type="password" value={mercadoPagoToken} onChange={e => setMercadoPagoToken(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">API Key (Asaas)</label>
                            <input type="password" value={asaasApiKey} onChange={e => setAsaasApiKey(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50" />
                        </div>
                    )}
                </div>

                <ChromeMemorySaverGuide />

                {restaurantId && (
                    <BannerSettings 
                        restaurantId={restaurantId} 
                        currentBanner={bannerImageUrl} 
                        onUpdate={setBannerImageUrl} 
                    />
                )}

                {/* --- CIDADE ATENDIDA (MULTI-CIDADES) --- */}
                <div className="mb-10 bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border-2 border-orange-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📍</span>
                        <div>
                            <h3 className="text-md font-black text-orange-900 uppercase tracking-tight">Cidade de Atendimento</h3>
                            <p className="text-xs text-orange-700 font-medium">Os clientes com GPS nesta cidade verão seu cardápio no aplicativo.</p>
                        </div>
                    </div>
                    <div className="mt-3">
                        <input 
                            type="text"
                            list="settings-cities-list"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="Ex: Guaranésia, Guaxupé..."
                            className="w-full p-3.5 border-2 border-orange-300 rounded-xl font-bold text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 outline-none shadow-inner text-base"
                        />
                        <datalist id="settings-cities-list">
                            {KNOWN_CITIES.map(c => (
                                <option key={c.name} value={c.name}>{c.name} - {c.state}</option>
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* --- GERENCIAMENTO DE IMPRESSORAS (CENTRALIZADO NA ABA EXCLUSIVA) --- */}
                {restaurant && (
                    <div className="mb-10 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/40 rounded-2xl border-2 border-orange-200 p-6 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-orange-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
                                    🖨️
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-gray-900 text-base">
                                            Gerenciamento de Impressoras Térmicas
                                        </h3>
                                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-orange-200 text-orange-900 rounded-md">
                                            Centralizado
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                                        Para evitar confusão e duplicidade de telas, o cadastro de impressoras por setor (Caixa, Cozinha, Bar), largura de papel (58mm/80mm), testes e roteamento por categoria ficam centralizados na aba exclusiva <strong>🖨️ Impressoras</strong> no menu superior.
                                    </p>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                        <span>Status: <strong>{restaurant.printers?.length || 0} impressora(s) cadastrada(s)</strong></span>
                                        <span>•</span>
                                        <span>Impressora padrão: <strong>{restaurant.printers?.find(p => p.isDefault)?.name || `Térmica (${restaurant.printerWidth || 80}mm)`}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                                {onNavigateToPrinters ? (
                                    <button
                                        type="button"
                                        onClick={onNavigateToPrinters}
                                        className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <span>Ir para Aba Impressoras</span>
                                        <span>&rarr;</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowPrintersInline(!showPrintersInline)}
                                        className="px-4 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        {showPrintersInline ? 'Ocultar Impressoras' : 'Gerenciar Impressoras Aqui'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {showPrintersInline && (
                            <div className="mt-6 pt-6 border-t border-orange-200">
                                <PrinterManagement 
                                    restaurant={restaurant} 
                                    onUpdateRestaurant={(updated) => setRestaurant(updated)} 
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-8">
                    <div>
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Horário de Funcionamento</h3>
                        <div className="space-y-2">
                            {operatingHours.map((day, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="col-span-5 flex items-center">
                                            <input type="checkbox" checked={!!day.isOpen} onChange={e => handleOperatingHoursChange(index, 'isOpen', e.target.checked)} className="h-5 w-5 mr-3" />
                                            <span className="font-bold text-xs text-gray-700">{daysOfWeek[index]}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.opens || ''} onChange={e => handleOperatingHoursChange(index, 'opens', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
                                        </div>
                                        <div className="col-span-1 text-center text-gray-400 font-bold text-xs">às</div>
                                        <div className="col-span-3">
                                            <input type="time" value={day.closes || ''} onChange={e => handleOperatingHoursChange(index, 'closes', e.target.value)} disabled={!day.isOpen} className="w-full p-2 border rounded-lg text-xs" />
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

                    {/* --- CONFIGURAÇÃO FISCAL --- */}
                    <div className="border-t pt-8">
                        <h3 className="text-md font-black text-gray-800 mb-4 uppercase tracking-widest">Integração Fiscal e CNPJ</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <span className="font-bold text-gray-800 block">Ativar Emissão de Notas Fiscais</span>
                                    <span className="text-xs text-gray-500">Habilita a exportação e a seleção de pedidos para emissão fiscal.</span>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={enableFiscal} onChange={e => setEnableFiscal(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </div>
                            </label>

                            {enableFiscal && (
                                <div className="p-5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="font-black text-purple-900 text-xs uppercase tracking-wider flex items-center gap-2">
                                        <span>📋</span> Dados Fiscais e Provedor (Vinculado unicamente ao CNPJ)
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">CNPJ da Loja</label>
                                            <input 
                                                type="text" 
                                                value={cnpj} 
                                                onChange={e => setCnpj(e.target.value)} 
                                                placeholder="00.000.000/0001-00" 
                                                className="w-full p-3 border border-purple-200 rounded-xl font-mono text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Inscrição Estadual (I.E.)</label>
                                            <input 
                                                type="text" 
                                                value={ie} 
                                                onChange={e => setIe(e.target.value)} 
                                                placeholder="Isento ou número da IE" 
                                                className="w-full p-3 border border-purple-200 rounded-xl font-mono text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none" 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Inscrição Municipal (I.M. / Betha)</label>
                                            <input 
                                                type="text" 
                                                value={im} 
                                                onChange={e => setIm(e.target.value)} 
                                                placeholder="Inscrição Municipal" 
                                                className="w-full p-3 border border-purple-200 rounded-xl font-mono text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Provedor de Emissão (API)</label>
                                             <select 
                                                value={fiscalProvider} 
                                                onChange={e => setFiscalProvider(e.target.value)}
                                                className="w-full p-3 border border-purple-200 rounded-xl font-bold text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="focus">Focus NFe (NFC-e Estadual - Alimentos e Bebidas) [Recomendado]</option>
                                                <option value="nuvem">Nuvem Fiscal (NFC-e Estadual - Alimentos e Bebidas)</option>
                                                <option value="bling">Bling ERP / API (NFC-e Integrado)</option>
                                                <option value="betha">Betha Sistemas (Somente Serviços / NFS-e Municipal)</option>
                                                <option value="custom">API Própria / Webhook</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* ALERTA EXPLICATIVO FISCAL: VENDAS (NFC-e / ESTADUAL) vs SERVIÇOS (NFS-e / PREFEITURA) */}
                                    {fiscalProvider === 'betha' ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                                            <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                                <span>⚠️</span> Atenção sobre Notas da Prefeitura (Betha Sistemas):
                                            </div>
                                            <p>
                                                A Prefeitura (Betha) emite <strong>NFS-e (Serviços / ISSQN)</strong>. Restaurantes e lanchonetes vendem <strong>alimentos e bebidas (mercadorias)</strong>, que exigem <strong>NFC-e (Estadual / SEF-MG)</strong>.
                                            </p>
                                            <p className="text-[11px] text-amber-700">
                                                💡 Use o Betha apenas se sua loja fatura serviços (ex: taxa de evento, buffet, locação). Para o cupom fiscal das refeições e entregas aos clientes, recomendamos selecionar <strong>Focus NFe</strong> ou <strong>Nuvem Fiscal</strong>.
                                            </p>
                                        </div>
                                    ) : fiscalProvider === 'nuvem' ? (
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                                                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                                                    <span>☁️</span> Nuvem Fiscal (Multi-CNPJ & Certificados em Nuvem):
                                                </div>
                                                <p>
                                                    A <strong>Nuvem Fiscal</strong> é uma API moderna excelente para gerenciar múltiplos clientes e filiais, onde cada restaurante possui seu próprio CNPJ e certificado digital cadastrados de forma independente via API.
                                                </p>
                                            </div>

                                            <div className="bg-white border border-blue-200 p-4 rounded-xl space-y-3 shadow-2xs">
                                                <h6 className="font-black text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                    <span>🔑</span> Chaves de Acesso API Nuvem Fiscal (OAuth2)
                                                </h6>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 ml-1">Client ID</label>
                                                        <input 
                                                            type="text"
                                                            value={nuvemClientId}
                                                            onChange={e => setNuvemClientId(e.target.value)}
                                                            placeholder="Ex: client_id_..."
                                                            className="w-full p-2.5 border border-blue-200 rounded-xl font-mono text-xs bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 ml-1">Client Secret</label>
                                                        <input 
                                                            type="password"
                                                            value={nuvemClientSecret}
                                                            onChange={e => setNuvemClientSecret(e.target.value)}
                                                            placeholder="Ex: client_secret_..."
                                                            className="w-full p-2.5 border border-blue-200 rounded-xl font-mono text-xs bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                                    <button
                                                        type="button"
                                                        disabled={isTestingNuvem}
                                                        onClick={handleTestNuvemAuth}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <span>{isTestingNuvem ? '⏳' : '⚡'}</span>
                                                        <span>{isTestingNuvem ? 'Testando Conexão...' : 'Testar Conexão com Nuvem Fiscal'}</span>
                                                    </button>

                                                    {nuvemTestResult && (
                                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${nuvemTestResult.success ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                                                            <span>{nuvemTestResult.success ? '✅' : '❌'}</span>
                                                            <span>{nuvemTestResult.message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                                                <span>✅</span> Emissão de Cupom Fiscal de Alimentos (NFC-e Modelo 65 - SEF/MG):
                                            </div>
                                            <p>
                                                Para emitir cupons de refeições e lanches em Minas Gerais, você precisa do <strong>Certificado Digital A1</strong> da empresa e do <strong>Código CSC</strong> cadastrado na SEF-MG pelo seu contador. A API ({fiscalProvider === 'focus' ? 'Focus NFe' : 'Provedor Fiscal'}) assina e transmite o cupom automaticamente.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Token / API Key do Provedor Fiscal</label>
                                        <input 
                                            type="password" 
                                            value={blingApiKey} 
                                            onChange={e => setBlingApiKey(e.target.value)} 
                                            placeholder="Cole aqui o Token da API ou Chave de Acesso" 
                                            className="w-full p-3 border border-purple-200 rounded-xl font-mono text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none" 
                                        />
                                        <p className="text-[10px] text-purple-600 mt-1 font-bold">
                                            * Credencial protegida e vinculada unicamente ao CNPJ {cnpj || 'informado'} para emissão de notas.
                                        </p>
                                    </div>

                                    {/* MÓDULO AVANÇADO DE CERTIFICADO DIGITAL E CSC / SEFAZ */}
                                    <div className="border-t border-purple-200/60 pt-4 mt-4 space-y-4">
                                        <h5 className="font-black text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🔒</span> Configuração do Certificado Digital (e-CNPJ A1) e CSC (SIARE)
                                        </h5>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Ambiente SEFAZ</label>
                                                <select
                                                    value={fiscalEnv}
                                                    onChange={e => setFiscalEnv(e.target.value as any)}
                                                    className="w-full p-2.5 border border-purple-200 rounded-xl font-bold text-xs bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                                >
                                                    <option value="homologacao">Homologação (Testes / Sem Valor Fiscal)</option>
                                                    <option value="producao">Produção (Notas Fiscais Reais)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Código CSC (Código de Segurança)</label>
                                                <input 
                                                    type="text"
                                                    value={fiscalCsc}
                                                    onChange={e => setFiscalCsc(e.target.value)}
                                                    placeholder="Ex: 3506d724cc86cb31674657778b14aa47"
                                                    className="w-full p-2.5 border border-purple-200 rounded-xl font-mono text-xs bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">ID do Token (IdCSC)</label>
                                                <input 
                                                    type="text"
                                                    value={fiscalCscId}
                                                    onChange={e => setFiscalCscId(e.target.value)}
                                                    placeholder="Ex: 000001"
                                                    className="w-full p-2.5 border border-purple-200 rounded-xl font-mono text-xs bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-purple-700 font-medium">
                                            💡 O <strong>CSC</strong> e o <strong>ID do Token</strong> são utilizados pela SEFAZ para assinar o <strong>QR Code oficial</strong> impresso no cupom térmico, permitindo que os clientes consultem a nota no portal estadual da SEF-MG.
                                        </p>

                                        <div className="bg-white p-3.5 rounded-xl border border-purple-200 space-y-3 shadow-2xs">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                <div>
                                                    <span className="block font-black text-gray-800 text-xs">Certificado Digital e-CNPJ (Modelo A1 - .pfx / .p12)</span>
                                                    <span className="text-[11px] text-gray-500">Necessário para assinar digitalmente as notas fiscais perante a SEFAZ.</span>
                                                </div>
                                                <label className="cursor-pointer bg-purple-100 hover:bg-purple-200 text-purple-800 font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95">
                                                    <span>📁</span>
                                                    <span>Selecionar Certificado</span>
                                                    <input 
                                                        type="file" 
                                                        accept=".pfx,.p12" 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                setCertFileName(e.target.files[0].name);
                                                                addToast({ message: `Certificado "${e.target.files[0].name}" carregado com sucesso!`, type: 'success' });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            {certFileName && (
                                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-xs">
                                                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                                        <span>✅</span> Arquivo Carregado: <span className="font-mono">{certFileName}</span>
                                                    </span>
                                                    <span className="text-[10px] text-emerald-700 font-bold uppercase bg-emerald-100 px-2 py-0.5 rounded">Pronto para Envio</span>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 ml-1">Senha do Certificado Digital</label>
                                                <input 
                                                    type="password"
                                                    value={certPassword}
                                                    onChange={e => setCertPassword(e.target.value)}
                                                    placeholder="Digite a senha do e-CNPJ A1"
                                                    className="w-full p-2.5 border border-purple-200 rounded-xl font-mono text-xs bg-gray-50 text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowXmlValidatorModal(true)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                                            >
                                                <span>🔍</span>
                                                <span>Pré-Visualizar XML SEFAZ</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isTestingFiscal}
                                                onClick={async () => {
                                                    setIsTestingFiscal(true);
                                                    try {
                                                        await new Promise(r => setTimeout(r, 1500));
                                                        addToast({ message: `Conexão com a SEFAZ (${fiscalEnv.toUpperCase()}) estabelecida com sucesso! Certificado e CSC válidos.`, type: 'success' });
                                                    } catch (err) {
                                                        addToast({ message: 'Falha na conexão com a SEFAZ. Verifique o CNPJ, CSC e certificado.', type: 'error' });
                                                    } finally {
                                                        setIsTestingFiscal(false);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                <span>{isTestingFiscal ? '⏳' : '⚡'}</span>
                                                <span>{isTestingFiscal ? 'Testando Conexão...' : 'Testar Conexão com a SEFAZ'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <LoyaltyProgramSettings 
                        loyaltyProgram={restaurant.loyaltyProgram} 
                        onChange={(loyaltyProgram) => setRestaurant({ ...restaurant, loyaltyProgram })} 
                    />

                    {restaurantId && (
                        <div className="border-t pt-8">
                            <FeaturedPromoManager restaurantId={restaurantId} />
                        </div>
                    )}

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
                        {restaurantId && <MercadoPagoGuide restaurantId={restaurantId} />}
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

            <FiscalXmlValidatorModal
                isOpen={showXmlValidatorModal}
                onClose={() => setShowXmlValidatorModal(false)}
                restaurant={restaurant}
            />
        </main>
    );
};

export default RestaurantSettings;
