
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{existingRestaurant ? 'Editar' : 'Novo'} Restaurante</h2>
                </div>
                
                <div className="overflow-y-auto space-y-6 pr-2">
                    <div className="flex gap-4 items-center">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" className="w-20 h-20 bg-gray-100 rounded border object-cover" />
                        ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs text-center">Sem Logo</div>
                        )}
                        <input type="file" accept="image/*" onChange={async e => {
                            if(e.target.files?.[0]) {
                                const comp = await compressLogo(e.target.files[0]);
                                setLogoFile(comp); setLogoPreview(URL.createObjectURL(comp));
                            }
                        }} className="text-xs" />
                    </div>

                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome" className="w-full p-2 border rounded" />
                    
                    <div className="border rounded p-3 bg-white">
                        <h3 className="font-bold text-sm mb-2">Categorias do Restaurante</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {categories.map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 text-gray-700">
                                    {cat.iconUrl && <img src={cat.iconUrl} alt={cat.name} className="w-5 h-5 object-cover rounded-full" />}
                                    <input
                                        type="checkbox"
                                        checked={(formData.category || '').split(',').map(c => c.trim()).includes(cat.name)}
                                        onChange={(e) => {
                                            const currentCategories = (formData.category || '').split(',').map(c => c.trim()).filter(c => c !== '');
                                            if (e.target.checked) {
                                                setFormData(prev => ({ ...prev, category: [...currentCategories, cat.name].join(', ') }));
                                            } else {
                                                setFormData(prev => ({ ...prev, category: currentCategories.filter(c => c !== cat.name).join(', ') }));
                                            }
                                        }}
                                    />
                                    {cat.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="p-2 border rounded" />
                        <input name="deliveryFee" type="number" value={formData.deliveryFee} onChange={handleChange} placeholder="Taxa Entrega" className="p-2 border rounded" />
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold mb-2">Formas de Pagamento</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {PREDEFINED_PAYMENT_METHODS.map(method => (
                                <label key={method} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.paymentGateways.includes(method)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData(prev => ({ ...prev, paymentGateways: [...prev.paymentGateways, method] }));
                                            } else {
                                                setFormData(prev => ({ ...prev, paymentGateways: prev.paymentGateways.filter(m => m !== method) }));
                                            }
                                        }}
                                    />
                                    {method}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* SEÇÃO MERCADO PAGO - ADICIONADA */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                        <h3 className="text-sm font-black text-blue-900 uppercase">Configuração Mercado Pago</h3>
                        <div>
                            <label className="text-[10px] font-bold text-blue-700">ACCESS TOKEN (PRODUÇÃO)</label>
                            <input 
                                type="password" 
                                value={formData.mercado_pago_credentials?.accessToken || ''} 
                                onChange={handleCredentialsChange}
                                placeholder="APP_USR-..."
                                className="w-full p-2 border border-blue-200 rounded text-sm font-mono" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-700">WEBHOOK URL (PARA O MP)</label>
                            <div className="flex gap-2">
                                <input readOnly value={webhookUrl} className="flex-grow p-2 text-[10px] bg-white border border-blue-200 rounded font-mono truncate" />
                                <button onClick={() => { navigator.clipboard.writeText(webhookUrl); addToast({message: 'Copiado!', type:'success'}); }} className="p-2 bg-blue-600 text-white rounded"><ClipboardIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold mb-2">Funcionamento</h3>
                        {formData.operatingHours?.map((day, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1 text-xs">
                                <input type="checkbox" checked={day.isOpen} onChange={e => handleOperatingHoursChange(i, 'isOpen', e.target.checked)} />
                                <span className="w-20">{daysOfWeek[i]}</span>
                                <input type="time" value={day.opens} onChange={e => handleOperatingHoursChange(i, 'opens', e.target.value)} disabled={!day.isOpen} className="border rounded p-1" />
                                <input type="time" value={day.closes} onChange={e => handleOperatingHoursChange(i, 'closes', e.target.value)} disabled={!day.isOpen} className="border rounded p-1" />
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-100 rounded">
                        <h3 className="font-bold text-sm mb-2">Acesso</h3>
                        {!existingRestaurant || changeCredentials ? (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="email" placeholder="Email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="p-2 border rounded bg-white" />
                                <input type="password" placeholder="Senha" value={merchantPassword} onChange={e => setMerchantPassword(e.target.value)} className="p-2 border rounded bg-white" />
                            </div>
                        ) : (
                            <button onClick={() => setChangeCredentials(true)} className="text-xs text-blue-600 font-bold underline">Alterar Login/Senha</button>
                        )}
                    </div>
                </div>

                {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="p-2 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="p-2 bg-orange-600 text-white rounded font-bold">{isSaving ? '...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};
export default RestaurantEditorModal;
