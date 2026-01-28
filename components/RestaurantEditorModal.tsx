
import React, { useState, useEffect } from 'react';
import type { Restaurant, OperatingHours, RestaurantCategory } from '../types';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/api';
import { fetchRestaurantCategories } from '../services/databaseService';
import { SUPABASE_URL } from '../config';

interface RestaurantEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    existingRestaurant: Restaurant | null;
}

type FormData = Omit<Restaurant, 'id'>;

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PREDEFINED_PAYMENT_METHODS = [
    "Pix",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Dinheiro",
    "Marcar na minha conta"
];

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const getDefaultOperatingHours = (): OperatingHours[] =>
    daysOfWeek.map((_, index) => ({
        dayOfWeek: index,
        opens: '18:00',
        closes: '23:00',
        isOpen: false,
    }));


const RestaurantEditorModal: React.FC<RestaurantEditorModalProps> = ({ isOpen, onClose, onSaveSuccess, existingRestaurant }) => {
    const { addToast } = useNotification();
    const [formData, setFormData] = useState<FormData>({
        name: '',
        category: '',
        deliveryTime: '',
        rating: 0,
        imageUrl: '',
        paymentGateways: [],
        address: '',
        phone: '',
        openingHours: '',
        closingHours: '',
        deliveryFee: 0,
        mercado_pago_credentials: { accessToken: '' },
        operatingHours: getDefaultOperatingHours(),
        manualPixKey: '',
        active: true,
    });
    
    const [merchantEmail, setMerchantEmail] = useState('');
    const [merchantPassword, setMerchantPassword] = useState('');
    const [changeCredentials, setChangeCredentials] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [showSecondShift, setShowSecondShift] = useState<boolean[]>(Array(7).fill(false));

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await fetchRestaurantCategories();
                setCategories(data);
            } catch (e) { console.error(e); }
        };
        if (isOpen) loadCategories();
    }, [isOpen]);

    const compressLogo = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Canvas error")); return; }
                const MAX_SIZE = 400;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    if (blob) resolve(new File([blob], "logo.jpg", { type: 'image/jpeg' }));
                    else reject(new Error("Blob error"));
                }, 'image/jpeg', 0.5);
            };
            img.onerror = () => reject(new Error("Load error"));
        });
    };

    useEffect(() => {
        if (existingRestaurant) {
            const opHours = existingRestaurant.operatingHours && existingRestaurant.operatingHours.length === 7 
                ? existingRestaurant.operatingHours : getDefaultOperatingHours();
            setShowSecondShift(opHours.map(d => !!(d.opens2 || d.closes2)));
            setFormData({
                ...existingRestaurant,
                mercado_pago_credentials: existingRestaurant.mercado_pago_credentials || { accessToken: '' },
                operatingHours: opHours,
                manualPixKey: existingRestaurant.manualPixKey || '',
                active: existingRestaurant.active !== false
            });
            setLogoPreview(existingRestaurant.imageUrl);
            setChangeCredentials(false);
        } else {
            setFormData({
                name: '', category: '', deliveryTime: '', rating: 0, imageUrl: '', paymentGateways: [],
                address: '', phone: '', openingHours: '', closingHours: '', deliveryFee: 0,
                mercado_pago_credentials: { accessToken: '' }, operatingHours: getDefaultOperatingHours(),
                manualPixKey: '', active: true
            });
            setShowSecondShift(Array(7).fill(false));
            setChangeCredentials(true); 
            setLogoPreview(null);
        }
        setMerchantEmail(''); setMerchantPassword(''); setLogoFile(null); setError('');
    }, [existingRestaurant, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'deliveryFee') ? parseFloat(value) : value }));
    };

    const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            mercado_pago_credentials: { accessToken: value }
        }));
    };

    const handleOperatingHoursChange = (dayIndex: number, field: any, value: any) => {
        setFormData(prev => {
            const newHours = [...(prev.operatingHours || getDefaultOperatingHours())];
            newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
            return { ...prev, operatingHours: newHours };
        });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.category || !formData.address || !formData.phone) {
            setError('Campos obrigatórios faltando.'); return;
        }
        setIsSaving(true);
        let finalImageUrl = existingRestaurant?.imageUrl || '';
        if (logoFile) {
            try {
                const fileName = `${crypto.randomUUID()}.jpg`;
                const { error: upErr } = await supabase.storage.from('restaurant-logos').upload(`public/${fileName}`, logoFile);
                if (upErr) throw upErr;
                const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(`public/${fileName}`);
                finalImageUrl = data.publicUrl;
            } catch (err: any) { setError(err.message); setIsSaving(false); return; }
        }

        const openDays = formData.operatingHours?.filter(d => d.isOpen) || [];
        const dbPayload = {
            name: formData.name, category: formData.category, delivery_time: formData.deliveryTime,
            rating: formData.rating, image_url: finalImageUrl, payment_gateways: formData.paymentGateways,
            address: formData.address, phone: formData.phone, 
            opening_hours: openDays.length > 0 ? openDays[0].opens : '',
            closing_hours: openDays.length > 0 ? openDays[0].closes : '',
            delivery_fee: formData.deliveryFee || 0,
            mercado_pago_credentials: formData.mercado_pago_credentials,
            operating_hours: formData.operatingHours,
            manual_pix_key: formData.manualPixKey,
            active: formData.active
        };

        try {
            if (!existingRestaurant || changeCredentials) {
                const { error: fErr } = await supabase.functions.invoke('create-restaurant-with-user', {
                    body: { restaurantData: dbPayload, userData: { email: merchantEmail, password: merchantPassword } }
                });
                if (fErr) throw fErr;
            } else {
                const { error: uErr } = await supabase.from('restaurants').update(dbPayload).eq('id', existingRestaurant.id);
                if (uErr) throw uErr;
            }
            addToast({ message: 'Salvo!', type: 'success' });
            onSaveSuccess(); onClose();
        } catch (err: any) { setError(err.message); } finally { setIsSaving(false); }
    };

    const webhookUrl = existingRestaurant ? `${SUPABASE_URL}/functions/v1/payment-webhook?restaurantId=${existingRestaurant.id}` : 'Disponível após criar';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-800">{existingRestaurant ? 'Editar' : 'Novo'} Restaurante</h2>
                    <button onClick={onClose} className="text-gray-400 text-3xl">&times;</button>
                </div>
                
                <div className="overflow-y-auto space-y-6 pr-2">
                    {/* SEÇÃO MERCADO PAGO - AGORA NO TOPO DAS CONFIGS TÉCNICAS */}
                    <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 space-y-3 shadow-inner">
                        <h3 className="text-sm font-black text-blue-900 uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            Configuração Mercado Pago
                        </h3>
                        <div>
                            <label className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Access Token (Produção):</label>
                            <input 
                                type="password" 
                                value={formData.mercado_pago_credentials?.accessToken || ''} 
                                onChange={handleCredentialsChange}
                                placeholder="APP_USR-..."
                                className="w-full p-2 border-2 border-blue-100 rounded-lg text-xs font-mono shadow-sm" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">URL Webhook (Para o Painel MP):</label>
                            <div className="flex gap-2">
                                <div className="flex-grow p-2 text-[9px] bg-white border border-blue-200 rounded font-mono truncate shadow-inner">{webhookUrl}</div>
                                <button onClick={() => { navigator.clipboard.writeText(webhookUrl); addToast({message: 'Copiado!', type:'success'}); }} className="p-2 bg-blue-600 text-white rounded-lg shadow active:scale-90 transition-all"><ClipboardIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center p-3 bg-gray-50 rounded-xl border">
                        <img src={logoPreview || ''} className="w-20 h-20 bg-gray-100 rounded-lg border object-cover shadow-sm" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">Logomarca do Estabelecimento</p>
                            <input type="file" accept="image/*" onChange={async e => {
                                if(e.target.files?.[0]) {
                                    const comp = await compressLogo(e.target.files[0]);
                                    setLogoFile(comp); setLogoPreview(URL.createObjectURL(comp));
                                }
                            }} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-700" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Restaurante" className="w-full p-3 border rounded-xl bg-gray-50 font-bold" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="WhatsApp (ex: 359...)" className="p-3 border rounded-xl bg-gray-50" />
                            <input name="deliveryFee" type="number" value={formData.deliveryFee} onChange={handleChange} placeholder="Taxa de Entrega R$" className="p-3 border rounded-xl bg-gray-50" />
                        </div>

                         <div className="p-3 border rounded-xl bg-gray-50">
                             <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Chave Pix de Backup (Manual)</p>
                             <input name="manualPixKey" value={formData.manualPixKey || ''} onChange={handleChange} placeholder="Chave Pix..." className="w-full p-2 border rounded-lg text-sm font-mono" />
                         </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-3">Horários Operacionais</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {formData.operatingHours?.map((day, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={day.isOpen} onChange={e => handleOperatingHoursChange(i, 'isOpen', e.target.checked)} className="h-4 w-4 text-orange-600 rounded" />
                                        <span className="text-xs font-bold w-20">{daysOfWeek[i]}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="time" value={day.opens} onChange={e => handleOperatingHoursChange(i, 'opens', e.target.value)} disabled={!day.isOpen} className="border rounded px-1 py-0.5 text-xs font-mono disabled:opacity-30" />
                                        <span className="text-[10px] text-gray-400">às</span>
                                        <input type="time" value={day.closes} onChange={e => handleOperatingHoursChange(i, 'closes', e.target.value)} disabled={!day.isOpen} className="border rounded px-1 py-0.5 text-xs font-mono disabled:opacity-30" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-2xl shadow-xl">
                        <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">Credenciais de Acesso</h3>
                        {!existingRestaurant || changeCredentials ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="email" placeholder="Email do Lojista" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="p-3 border-none rounded-xl bg-white/10 text-white text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                                <input type="password" placeholder="Senha Temporária" value={merchantPassword} onChange={e => setMerchantPassword(e.target.value)} className="p-3 border-none rounded-xl bg-white/10 text-white text-sm outline-none focus:ring-1 focus:ring-orange-500" />
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-bold italic">Acesso já configurado.</span>
                                <button onClick={() => setChangeCredentials(true)} className="text-[10px] font-black uppercase text-orange-500 hover:underline">Resetar Senha</button>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mt-4 font-bold border border-red-100">{error}</div>}
                
                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-8 py-2 bg-orange-600 text-white rounded-xl font-black shadow-lg shadow-orange-100 active:scale-95 transition-all hover:bg-orange-700">
                        {isSaving ? 'Processando...' : 'Salvar Loja'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default RestaurantEditorModal;
