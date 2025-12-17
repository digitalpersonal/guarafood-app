
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, Coupon, Order } from '../types';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import { createOrder, type NewOrderData } from '../services/orderService';
import { validateCouponByCode, fetchCouponsForRestaurant } from '../services/databaseService';
import { supabase } from '../services/api';
import { isRestaurantOpen } from '../utils/restaurantUtils';
import Spinner from './Spinner';
import OptimizedImage from './OptimizedImage';

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.507 15.324a3.75 3.75 0 011.084-3.515 11.25 11.25 0 00-4.06-1.17 11.25 11.25 0 0111.25 0 11.25 11.25 0 00-4.06 1.17c.213.914.249 1.87.11 2.766a3.75 3.75 0 01-.235.485 3.75 3.75 0 01-1.084 3.515A11.25 11.25 0 0012 21a11.25 11.25 0 008.25-3.676 3.75 3.75 0 01-1.084-3.515c-.139-.896-.103-1.852.11-2.766z" />
    </svg>
);
const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);
const ShoppingBagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);
const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
);
const StoreIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .415.336.75.75.75Z" />
    </svg>
);

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: Restaurant;
}

type CheckoutStep = 'SUMMARY' | 'DETAILS' | 'PIX_PAYMENT' | 'SUCCESS';
type DeliveryMethod = 'DELIVERY' | 'PICKUP';

const steps: { id: CheckoutStep; title: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'SUMMARY', title: 'Resumo', icon: ShoppingBagIcon },
    { id: 'DETAILS', title: 'Dados e Pagamento', icon: UserIcon },
    { id: 'PIX_PAYMENT', title: 'Pagar com Pix', icon: CreditCardIcon },
    { id: 'SUCCESS', title: 'Confirmado', icon: CheckCircleIcon },
];

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, restaurant }) => {
    const { cartItems, totalPrice, clearCart } = useCart();
    const { addToast } = useNotification();
    const [currentStep, setCurrentStep] = useState<CheckoutStep>('SUMMARY');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(''); 
    const [changeFor, setChangeFor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('DELIVERY');
    const [wantsSachets, setWantsSachets] = useState(false);
    const [address, setAddress] = useState({
        zipCode: '37810-000', 
        street: '',
        number: '',
        neighborhood: '',
        complement: '',
    });
    const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
    const [pixError, setPixError] = useState<string | null>(null);
    const [isManualPix, setIsManualPix] = useState(false);
    const [countdown, setCountdown] = useState(300);
    const countdownIntervalRef = useRef<number | null>(null);
    const pixChannelRef = useRef<any>(null);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [hasAvailableCoupons, setHasAvailableCoupons] = useState(false);

    // --- AUTOCOMPLETE LOGIC (NATIVE DATALIST) ---
    const [knownCustomers, setKnownCustomers] = useState<Record<string, { phone: string, address: any }>>({});

    // Load known customers on open
    useEffect(() => {
        if (isOpen) {
            const loaded: Record<string, { phone: string, address: any }> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('customerData-')) {
                    try {
                        const rawName = key.replace('customerData-', '');
                        // Capitalize for display
                        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                        const data = JSON.parse(localStorage.getItem(key) || '{}');
                        if (data.phone && data.address) {
                            loaded[displayName] = data;
                        }
                    } catch (e) { console.error("Error loading data", e); }
                }
            }
            setKnownCustomers(loaded);
        }
    }, [isOpen]);

    // Handle Name Change and Silent Autofill
    const handleNameChange = (val: string) => {
        setCustomerName(val);
        
        // Se houver correspondência exata, preenche o resto silenciosamente
        const matched = knownCustomers[val];
        if (matched) {
            setCustomerPhone(matched.phone);
            setAddress({
                ...matched.address,
                zipCode: matched.address.zipCode || '37810-000'
            });
            // Toast discreto apenas para informar o usuário que os dados voltaram
            addToast({ message: "Dados automáticos!", type: 'success', duration: 1500 });
        }
    };

    const isOpenNow = isRestaurantOpen(restaurant);

    const paymentOptions = useMemo(() => {
        return restaurant.paymentGateways && restaurant.paymentGateways.length > 0 
            ? restaurant.paymentGateways 
            : ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Marcar na minha conta"];
    }, [restaurant]);

    const resetState = () => {
        setCurrentStep('SUMMARY');
        setCustomerName('');
        setCustomerPhone('');
        setPaymentMethod(paymentOptions[0] || 'Pix'); 
        setChangeFor('');
        setIsSubmitting(false);
        setCouponCodeInput('');
        setAppliedCoupon(null);
        setFormError(null);
        setPixData(null);
        setPixError(null);
        setIsManualPix(false);
        setWantsSachets(false); 
        setCountdown(300);
        setDeliveryMethod('DELIVERY');
        setAddress({ zipCode: '37810-000', street: '', number: '', neighborhood: '', complement: '' });
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (pixChannelRef.current) {
            pixChannelRef.current.unsubscribe();
            pixChannelRef.current = null;
        }
    };

    useEffect(() => {
        if (isOpen) {
            resetState();
            const checkCoupons = async () => {
                try {
                    const coupons = await fetchCouponsForRestaurant(restaurant.id);
                    const hasActive = coupons.some(c => {
                        const now = new Date();
                        const expirationDate = new Date(c.expirationDate);
                        expirationDate.setHours(23, 59, 59, 999);
                        return c.isActive && now <= expirationDate;
                    });
                    setHasAvailableCoupons(hasActive);
                } catch (e) {
                    console.error("Failed to check coupons", e);
                    setHasAvailableCoupons(false);
                }
            };
            checkCoupons();
        }
    }, [isOpen, restaurant.id]);

    const { finalPrice, discountAmount } = useMemo(() => {
        if (!appliedCoupon) return { finalPrice: totalPrice, discountAmount: 0 };
        let discount = appliedCoupon.discountType === 'FIXED' ? appliedCoupon.discountValue : totalPrice * (appliedCoupon.discountValue / 100);
        return { finalPrice: Math.max(0, totalPrice - discount), discountAmount: discount };
    }, [totalPrice, appliedCoupon]);

    const effectiveDeliveryFee = deliveryMethod === 'PICKUP' ? 0 : (restaurant.deliveryFee || 0);
    const finalPriceWithFee = finalPrice + effectiveDeliveryFee;
    
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };
    
    const handleApplyCoupon = async () => {
        if (!couponCodeInput.trim()) { setFormError("Por favor, insira um código."); return; }
        setIsApplyingCoupon(true);
        setFormError(null);
        setAppliedCoupon(null);
        try {
            const coupon = await validateCouponByCode(couponCodeInput, restaurant.id);
            if (!coupon || !coupon.isActive || new Date(coupon.expirationDate) < new Date()) throw new Error("Cupom inválido ou expirado.");
            if (coupon.minOrderValue && totalPrice < coupon.minOrderValue) throw new Error(`Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)}.`);
            setAppliedCoupon(coupon);
            addToast({ message: 'Cupom aplicado!', type: 'success' });
        } catch (err: any) { setFormError(err.message); } finally { setIsApplyingCoupon(false); }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCodeInput('');
        setFormError(null);
    };

    const saveOrderToHistory = (orderId: string) => {
        try {
            const existing = localStorage.getItem('guarafood-active-orders');
            const orders = existing ? JSON.parse(existing) : [];
            if (!orders.includes(orderId)) {
                orders.push(orderId);
                localStorage.setItem('guarafood-active-orders', JSON.stringify(orders));
            }
        } catch (e) {
            console.error("Failed to save order ID history", e);
        }
    };

    const saveOrderDetailsToHistory = (order: Order) => {
        try {
            const existing = localStorage.getItem('guarafood-order-history');
            const orders = existing ? JSON.parse(existing) : [];
            const exists = orders.some((o: Order) => o.id === order.id);
            if (!exists) {
                orders.push(order);
                if (orders.length > 50) orders.shift();
                localStorage.setItem('guarafood-order-history', JSON.stringify(orders));
            }
        } catch (e) {
            console.error("Failed to save order details history", e);
        }
    };

    const handlePixPayment = async (orderData: NewOrderData) => {
        setIsSubmitting(true);
        setPixError(null);
        try {
            const response = await supabase.functions.invoke('create-payment', {
                body: { restaurantId: restaurant.id, orderData },
            });
            
            if (response.error) throw new Error(response.error.message || "Falha na conexão");
            if (response.data && response.data.error) throw new Error(response.data.error);

            const { orderId, qrCode, qrCodeBase64 } = response.data;
            setPixData({ qrCode, qrCodeBase64 });
            setCurrentStep('PIX_PAYMENT');

            countdownIntervalRef.current = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        setPixError("Tempo esgotado.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            const channel = supabase.channel(`order-status:${orderId}`);
            pixChannelRef.current = channel;
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    const updatedOrder = payload.new as Order;
                    if (updatedOrder.status === 'Novo Pedido') {
                        if (pixChannelRef.current) { pixChannelRef.current.unsubscribe(); pixChannelRef.current = null; }
                        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                        saveOrderToHistory(orderId);
                        saveOrderDetailsToHistory(updatedOrder);
                        window.dispatchEvent(new Event('guarafood:update-orders'));
                        setCurrentStep('SUCCESS');
                        localStorage.setItem(`customerData-${customerName.toLowerCase()}`, JSON.stringify({ phone: customerPhone, address }));
                        clearCart();
                    }
                }
            ).subscribe();

        } catch (err: any) {
            console.error("Pix Auto Error:", err);
            if (restaurant.manualPixKey) {
                setPixError(err.message || 'Erro desconhecido');
                setIsManualPix(true);
                setCurrentStep('PIX_PAYMENT');
            } else {
                setPixError(`Erro ao gerar Pix: ${err.message}. Tente outra forma.`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayOnDelivery = async (orderData: NewOrderData) => {
        setIsSubmitting(true);
        try {
            const order = await createOrder(orderData);
            saveOrderToHistory(order.id);
            saveOrderDetailsToHistory(order);
            window.dispatchEvent(new Event('guarafood:update-orders'));
            localStorage.setItem(`customerData-${customerName.toLowerCase()}`, JSON.stringify({ phone: customerPhone, address }));
            addToast({ message: 'Pedido enviado!', type: 'success' });
            clearCart();
            setCurrentStep('SUCCESS');
        } catch (err) {
            console.error('Failed to create order:', err);
            addToast({ message: `Erro ao enviar pedido`, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmManualPix = async () => {
        const customerAddress = deliveryMethod === 'PICKUP' 
            ? { zipCode: '00000-000', street: 'Retirada no Local', number: 'S/N', neighborhood: restaurant.name, complement: 'Cliente irá buscar' }
            : { zipCode: address.zipCode, street: address.street, number: address.number, neighborhood: address.neighborhood, complement: address.complement };

        const orderData: NewOrderData = {
            customerName, customerPhone, items: cartItems, totalPrice: finalPriceWithFee, subtotal: totalPrice,
            discountAmount, couponCode: appliedCoupon?.code, deliveryFee: effectiveDeliveryFee, restaurantId: restaurant.id,
            restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: "Pix (Comprovante via WhatsApp)", customerAddress, wantsSachets
        };
        await handlePayOnDelivery(orderData);
    };

    const handleSubmitDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOpenNow) { addToast({ message: "Restaurante Fechado.", type: 'error' }); return; }
        if (!customerName || !customerPhone || !paymentMethod) { setFormError('Preencha nome, telefone e pagamento.'); return; }
        if (deliveryMethod === 'DELIVERY' && (!address.street || !address.number || !address.neighborhood)) { setFormError('Endereço incompleto.'); return; }
        
        setFormError(null);
        let finalPaymentMethod = paymentMethod;
        if (paymentMethod.toLowerCase() === 'dinheiro' && changeFor) {
            const changeValue = parseFloat(changeFor);
            if (!isNaN(changeValue) && changeValue > 0) finalPaymentMethod = `Dinheiro (Troco para R$ ${changeValue.toFixed(2)})`;
        }

        const customerAddress = deliveryMethod === 'PICKUP' 
            ? { zipCode: '00000-000', street: 'Retirada no Local', number: 'S/N', neighborhood: restaurant.name, complement: 'Cliente irá buscar' }
            : { zipCode: address.zipCode, street: address.street, number: address.number, neighborhood: address.neighborhood, complement: address.complement };

        const orderData: NewOrderData = {
            customerName, customerPhone, items: cartItems, totalPrice: finalPriceWithFee, subtotal: totalPrice,
            discountAmount, couponCode: appliedCoupon?.code, deliveryFee: effectiveDeliveryFee, restaurantId: restaurant.id,
            restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: finalPaymentMethod, customerAddress, wantsSachets
        };

        if (paymentMethod === 'Pix') await handlePixPayment(orderData);
        else await handlePayOnDelivery(orderData);
    };

    const handleBackFromPix = () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (pixChannelRef.current) pixChannelRef.current.unsubscribe();
        setCurrentStep('DETAILS');
        setPixData(null);
        setPixError(null);
        setIsManualPix(false);
    };

    const handleNextStep = () => {
        if (currentStep === 'SUMMARY') {
            if (cartItems.length === 0) return;
            if (!isOpenNow) return;
            setCurrentStep('DETAILS');
        }
    };

    const handlePrevStep = () => {
        if (currentStep === 'DETAILS') setCurrentStep('SUMMARY');
        else if (currentStep === 'PIX_PAYMENT') handleBackFromPix();
    };

    if (!isOpen) return null;

    const currentStepIndex = steps.findIndex(step => step.id === currentStep);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={currentStep === 'SUCCESS' ? undefined : onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                {currentStep !== 'SUCCESS' && (
                    <div className="p-4 border-b flex justify-between items-start gap-4">
                        <div className="flex-grow min-w-0">
                             <h2 className="text-xl font-bold text-gray-800 truncate">{restaurant.name}</h2>
                             <p className="text-[10px] text-gray-500 truncate">{restaurant.address}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                    </div>
                )}

                {/* Stepper */}
                {currentStep !== 'SUCCESS' && (
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b">
                        {steps.map((step, index) => {
                            if (step.id === 'PIX_PAYMENT' && paymentMethod !== 'Pix' && index > currentStepIndex) return null;
                            if (step.id === 'SUCCESS' && currentStep !== 'SUCCESS' && index > currentStepIndex) return null;
                            const isCurrent = index === currentStepIndex;
                            const isCompleted = index < currentStepIndex;
                            const textColor = isCompleted ? 'text-orange-600' : isCurrent ? 'text-orange-500' : 'text-gray-400';
                            const circleBg = isCompleted ? 'bg-orange-600' : isCurrent ? 'bg-orange-500' : 'bg-gray-300';
                            return (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${circleBg} text-white`}>
                                            {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-[10px] mt-1 text-center whitespace-nowrap font-bold ${textColor}`}>{step.title}</span>
                                    </div>
                                    {index < steps.length - 1 && <div className={`flex-1 border-t-2 mx-1 ${index < currentStepIndex ? 'border-orange-600' : 'border-gray-300'}`}></div>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* --- SUMMARY STEP --- */}
                {currentStep === 'SUMMARY' && (
                    <div className="overflow-y-auto p-4 space-y-4">
                        <h3 className="text-xl font-bold text-gray-800">Seu Pedido</h3>
                        <div className="space-y-3">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex items-start space-x-3 border-b pb-3 last:border-b-0">
                                    <OptimizedImage src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-800 text-sm">{item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`}</p>
                                        <p className="text-xs text-orange-600 font-bold mt-1">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>R$ {totalPrice.toFixed(2)}</span></div>
                            {appliedCoupon && <div className="flex justify-between text-green-600 font-semibold"><span>Desconto</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-gray-600"><span>Entrega</span><span>{deliveryMethod === 'PICKUP' ? 'Grátis' : `R$ ${(restaurant.deliveryFee || 0).toFixed(2)}`}</span></div>
                            <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2"><span>Total</span><span>R$ {finalPriceWithFee.toFixed(2)}</span></div>
                        </div>
                    </div>
                )}

                {/* --- DETAILS STEP --- */}
                {currentStep === 'DETAILS' && (
                    <form onSubmit={handleSubmitDetails} id="checkout-form" className="overflow-y-auto space-y-4 p-4 relative">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Dados e Pagamento</h3>
                        
                        <div className="bg-gray-100 p-1 rounded-lg flex mb-4">
                            <button type="button" onClick={() => setDeliveryMethod('DELIVERY')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all ${deliveryMethod === 'DELIVERY' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}><TruckIcon className="w-5 h-5" />Entrega</button>
                            <button type="button" onClick={() => setDeliveryMethod('PICKUP')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all ${deliveryMethod === 'PICKUP' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}><StoreIcon className="w-5 h-5" />Retirada</button>
                        </div>

                        {/* NATIVE DATALIST AUTOCOMPLETE */}
                        <div className="relative">
                            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                            <input 
                                id="customerName" 
                                list="known-customers-list"
                                type="text" 
                                value={customerName} 
                                onChange={(e) => handleNameChange(e.target.value)}
                                required 
                                autoComplete="name" 
                                className="mt-1 w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400"
                                placeholder="Seu nome"
                            />
                            <datalist id="known-customers-list">
                                {Object.keys(knownCustomers).map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                            <input id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" placeholder="(00) 00000-0000" />
                        </div>
                        
                        {deliveryMethod === 'DELIVERY' && (
                            <div className="border-t pt-4 space-y-3">
                                <h4 className="text-sm font-bold text-gray-800">Endereço</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <input name="street" placeholder="Rua" type="text" value={address.street} onChange={handleAddressChange} required className="col-span-3 p-3 border rounded-lg bg-gray-50 text-sm" />
                                    <input name="number" placeholder="Nº" type="text" value={address.number} onChange={handleAddressChange} required className="p-3 border rounded-lg bg-gray-50 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input name="neighborhood" placeholder="Bairro" type="text" value={address.neighborhood} onChange={handleAddressChange} required className="p-3 border rounded-lg bg-gray-50 text-sm" />
                                    <input name="complement" placeholder="Obs / Ap" type="text" value={address.complement} onChange={handleAddressChange} className="p-3 border rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Pagamento</span>
                            <div className="space-y-2">
                                {paymentOptions.map(gateway => (
                                     <label key={gateway} className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                        <input type="radio" name="payment" value={gateway} checked={paymentMethod === gateway} onChange={e => setPaymentMethod(e.target.value)} className="h-4 w-4 text-orange-600" />
                                        <div className="ml-3 flex flex-col">
                                            <span className="text-sm font-semibold text-gray-700">{gateway}</span>
                                            {gateway.toLowerCase().includes('cartão') && <span className="text-[10px] text-blue-600">ⓘ Maquininha na entrega.</span>}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        {hasAvailableCoupons && (
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cupom</label>
                                {appliedCoupon ? (
                                    <div className="flex justify-between items-center p-3 border rounded-lg bg-green-50 border-green-300">
                                        <p className="text-green-800 text-xs font-bold">Cupom "{appliedCoupon.code}" ativo!</p>
                                        <button type="button" onClick={handleRemoveCoupon} className="text-red-600 font-bold">&times;</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value.toUpperCase())} placeholder="CÓDIGO" className="flex-grow p-3 border rounded-lg bg-gray-50 uppercase text-sm" />
                                        <button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon} className="bg-gray-800 text-white font-bold px-4 rounded-lg disabled:opacity-50 text-xs">{isApplyingCoupon ? '...' : 'Aplicar'}</button>
                                    </div>
                                )}
                            </div>
                        )}
                        {formError && <p className="text-red-500 text-xs mt-2 font-bold">{formError}</p>}
                    </form>
                )}

                {/* --- PIX STEP --- */}
                {currentStep === 'PIX_PAYMENT' && (
                    <div className="text-center flex flex-col items-center p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{isManualPix ? 'Pix Manual' : 'Pague para Confirmar'}</h3>
                        {isManualPix ? (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg w-full mb-4">
                                <p className="text-[10px] text-orange-700 font-bold uppercase mb-1">Chave Pix</p>
                                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-orange-100">
                                    <span className="text-lg font-mono font-bold text-gray-800 break-all select-all">{restaurant.manualPixKey}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(restaurant.manualPixKey || ''); addToast({ message: 'Copiado!', type: 'success' }); }} className="bg-orange-600 text-white p-2 rounded shadow-md"><ClipboardIcon className="w-5 h-5"/></button>
                                </div>
                                <button onClick={handleConfirmManualPix} className="mt-6 bg-green-600 text-white font-bold py-4 px-6 rounded-xl w-full shadow-lg" disabled={isSubmitting}>JÁ FIZ O PAGAMENTO</button>
                            </div>
                        ) : (
                            pixData ? (
                                <>
                                    <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="PIX" className="w-48 h-48 mx-auto my-2 border-4 border-gray-700 p-1 rounded-lg" />
                                    <button onClick={() => { navigator.clipboard.writeText(pixData.qrCode); addToast({ message: 'Copiado!', type: 'success' }); }} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg my-2 w-full max-w-xs shadow-lg flex justify-center items-center gap-2"><ClipboardIcon className="w-5 h-5"/>Copiar Código</button>
                                    <p className="text-2xl font-bold text-orange-600 mt-2">R$ {finalPriceWithFee.toFixed(2)}</p>
                                    <div className="mt-4 text-[10px] font-bold text-gray-500">Tempo: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</div>
                                </>
                            ) : <Spinner message="Gerando Pix..." />
                        )}
                        {pixError && <p className="text-red-500 text-xs mt-2 font-bold">{pixError}</p>}
                    </div>
                )}

                {/* --- SUCCESS STEP --- */}
                {currentStep === 'SUCCESS' && (
                    <div className="text-center flex flex-col items-center justify-center p-8 bg-blue-50 h-full">
                        <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-gray-800">Pedido Confirmado!</h3>
                        <p className="text-sm text-blue-700 mt-4 px-4">Acompanhe pelo rastreador no rodapé.</p>
                        <button onClick={() => { window.dispatchEvent(new Event('guarafood:update-orders')); onClose(); }} className="mt-8 bg-green-600 text-white font-bold py-4 px-12 rounded-full shadow-lg">Entendi</button>
                    </div>
                )}
                
                {/* Footer Actions */}
                {(currentStep === 'SUMMARY' || currentStep === 'DETAILS' || (currentStep === 'PIX_PAYMENT' && !isManualPix)) && (
                    <div className="mt-auto p-4 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
                        <button type="button" onClick={handlePrevStep} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold text-sm">{currentStep === 'SUMMARY' ? 'Fechar' : 'Voltar'}</button>
                        <div className="flex flex-col items-end">
                            <span className="font-bold text-[10px] text-gray-400">Total: <span className="text-orange-600 text-lg">R$ {finalPriceWithFee.toFixed(2)}</span></span>
                            <button onClick={currentStep === 'SUMMARY' ? handleNextStep : undefined} type={currentStep === 'DETAILS' ? 'submit' : 'button'} form={currentStep === 'DETAILS' ? 'checkout-form' : undefined} disabled={isSubmitting || (currentStep === 'SUMMARY' && !isOpenNow)} className="mt-1 bg-orange-600 text-white font-bold py-2.5 px-8 rounded-lg disabled:opacity-50 text-sm">
                                {isSubmitting ? '...' : currentStep === 'SUMMARY' ? 'Continuar' : (paymentMethod === 'Pix' ? 'Pagar' : 'Confirmar')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutModal;
