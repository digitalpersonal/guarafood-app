
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Restaurant, Coupon, Order } from '../types';
import { useCart } from '../hooks/useCart';
import { useNotification } from '../hooks/useNotification';
import { createOrder, type NewOrderData } from '../services/orderService';
import { validateCouponByCode } from '../services/databaseService';
import { supabase } from '../services/api';
import { isRestaurantOpen } from '../utils/restaurantUtils';
import Spinner from './Spinner';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: Restaurant;
}

type CheckoutStep = 'SUMMARY' | 'DETAILS' | 'PIX_PAYMENT' | 'SUCCESS';

// Icons for the stepper
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
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


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
    
    // Address State
    const [address, setAddress] = useState({
        zipCode: '37810-000', 
        street: '',
        number: '',
        neighborhood: '',
        complement: '',
    });

    // Pix Payment State
    const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
    const [pixError, setPixError] = useState<string | null>(null);
    const [isManualPix, setIsManualPix] = useState(false); // NEW: State for manual pix fallback
    const [countdown, setCountdown] = useState(300); // 5 minutes
    const countdownIntervalRef = useRef<number | null>(null);
    const pixChannelRef = useRef<any>(null);


    // Coupon and Form Error State
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    // Check restaurant status
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
        setCountdown(300);
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
        }
    }, [isOpen]);

    const { finalPrice, discountAmount } = useMemo(() => {
        if (!appliedCoupon) return { finalPrice: totalPrice, discountAmount: 0 };
        let discount = appliedCoupon.discountType === 'FIXED' ? appliedCoupon.discountValue : totalPrice * (appliedCoupon.discountValue / 100);
        return { finalPrice: Math.max(0, totalPrice - discount), discountAmount: discount };
    }, [totalPrice, appliedCoupon]);

    const deliveryFee = restaurant.deliveryFee || 0;
    const finalPriceWithFee = finalPrice + deliveryFee;
    
    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };

     const handleNameBlur = () => {
        if (!customerName) return;
        const storedData = localStorage.getItem(`customerData-${customerName.toLowerCase()}`);
        if (storedData) {
            const { phone, address: savedAddress } = JSON.parse(storedData);
            setCustomerPhone(phone);
            // Ensure zipCode is set to the fixed value, overriding stored data if necessary
            setAddress({
                ...savedAddress,
                zipCode: '37810-000'
            });
            addToast({ message: 'Seus dados foram preenchidos. Verifique se estão corretos!', type: 'info' });
        }
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
            
            // Check duplicates
            const exists = orders.some((o: Order) => o.id === order.id);
            if (!exists) {
                orders.push(order);
                // Limit history size
                if (orders.length > 50) orders.shift();
                localStorage.setItem('guarafood-order-history', JSON.stringify(orders));
            }
        } catch (e) {
            console.error("Failed to save order details history", e);
        }
    };

    const handlePixPayment = async (orderData: NewOrderData) => {
        // Fallback Logic Check
        const hasAutoPix = !!restaurant.mercado_pago_credentials?.accessToken;
        const hasManualPix = !!restaurant.manualPixKey;

        // If no auto credentials, go straight to manual
        if (!hasAutoPix && hasManualPix) {
            setIsManualPix(true);
            setCurrentStep('PIX_PAYMENT');
            return;
        }

        setIsSubmitting(true);
        setPixError(null);
        try {
            const response = await supabase.functions.invoke('create-payment', {
                body: { restaurantId: restaurant.id, orderData },
            });
            
            if (response.error) {
                throw new Error(response.error.message || "Falha na conexão com o servidor de pagamento");
            }

            if (response.data && response.data.error) {
                 throw new Error(response.data.error);
            }

            const { orderId, qrCode, qrCodeBase64 } = response.data;
            setPixData({ qrCode, qrCodeBase64 });
            setCurrentStep('PIX_PAYMENT');

            // Start countdown
            countdownIntervalRef.current = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        setPixError("Tempo esgotado. Por favor, inicie um novo pedido.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Listen for payment confirmation
            const channel = supabase.channel(`order-status:${orderId}`);
            pixChannelRef.current = channel;
            channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    const updatedOrder = payload.new as Order;
                    if (updatedOrder.status === 'Novo Pedido') {
                        if (pixChannelRef.current) {
                            pixChannelRef.current.unsubscribe();
                            pixChannelRef.current = null;
                        }
                        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                        
                        saveOrderToHistory(orderId);
                        saveOrderDetailsToHistory(updatedOrder);
                        
                        // Force tracker update
                        window.dispatchEvent(new Event('guarafood:update-orders'));

                        setCurrentStep('SUCCESS');
                        localStorage.setItem(`customerData-${customerName.toLowerCase()}`, JSON.stringify({ phone: customerPhone, address }));
                        setTimeout(() => {
                            clearCart();
                            onClose();
                        }, 6000); 
                    }
                }
            ).subscribe();

        } catch (err: any) {
            console.error("Pix Auto Error:", err);
            // FALLBACK TO MANUAL PIX ON ERROR
            if (hasManualPix) {
                addToast({ message: "Geração automática indisponível. Usando chave Pix manual.", type: 'info', duration: 5000 });
                setIsManualPix(true);
                setCurrentStep('PIX_PAYMENT');
            } else {
                setPixError(`Erro ao gerar Pix: ${err.message || 'Erro desconhecido'}. Tente outra forma de pagamento.`);
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
            
            // Force tracker update
            window.dispatchEvent(new Event('guarafood:update-orders'));

            localStorage.setItem(`customerData-${customerName.toLowerCase()}`, JSON.stringify({ phone: customerPhone, address }));
            addToast({ message: 'Pedido enviado com sucesso!', type: 'success' });
            clearCart();
            setCurrentStep('SUCCESS');
            setTimeout(() => onClose(), 6000);
        } catch (err) {
            console.error('Failed to create order:', err);
            addToast({ message: `Erro ao enviar pedido: ${err}`, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmManualPix = async () => {
        // Re-construct order data for submission
        const orderData: NewOrderData = {
            customerName, customerPhone, items: cartItems, totalPrice: finalPriceWithFee, subtotal: totalPrice,
            discountAmount, couponCode: appliedCoupon?.code, deliveryFee, restaurantId: restaurant.id,
            restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: "Pix (Comprovante via WhatsApp)", // Adjusted for manual
            customerAddress: {
                zipCode: address.zipCode,
                street: address.street,
                number: address.number,
                neighborhood: address.neighborhood,
                complement: address.complement,
            },
        };
        await handlePayOnDelivery(orderData);
    };

    const handleSubmitDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOpenNow) {
            addToast({ message: "Restaurante Fechado. Não é possível enviar o pedido.", type: 'error' });
            return;
        }
        if (!customerName || !customerPhone || !paymentMethod || !address.street || !address.number || !address.neighborhood) {
            setFormError('Preencha todos os campos obrigatórios, incluindo o endereço completo.');
            return;
        }
        
        const phoneDigits = customerPhone.replace(/\D/g, '');
        if (!/^\d{10,11}$/.test(phoneDigits)) {
            setFormError('Por favor, insira um número de telefone válido com DDD (10 ou 11 dígitos).');
            return;
        }

        setFormError(null);

        let finalPaymentMethod = paymentMethod;
        const paymentLower = paymentMethod.toLowerCase();

        if (paymentLower === 'dinheiro' && changeFor) {
            const changeValue = parseFloat(changeFor);
            if (!isNaN(changeValue) && changeValue > 0) {
                finalPaymentMethod = `Dinheiro (Troco para R$ ${changeValue.toFixed(2)})`;
            }
        }

        const orderData: NewOrderData = {
            customerName, customerPhone, items: cartItems, totalPrice: finalPriceWithFee, subtotal: totalPrice,
            discountAmount, couponCode: appliedCoupon?.code, deliveryFee, restaurantId: restaurant.id,
            restaurantName: restaurant.name, restaurantAddress: restaurant.address, restaurantPhone: restaurant.phone,
            paymentMethod: finalPaymentMethod,
            customerAddress: {
                zipCode: address.zipCode,
                street: address.street,
                number: address.number,
                neighborhood: address.neighborhood,
                complement: address.complement,
            },
        };

        if (paymentMethod === 'Pix') {
            await handlePixPayment(orderData);
        } else {
            await handlePayOnDelivery(orderData);
        }
    };

    const handleBackFromPix = () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (pixChannelRef.current) {
            pixChannelRef.current.unsubscribe();
            pixChannelRef.current = null;
        }
        setCurrentStep('DETAILS');
        setPixData(null);
        setPixError(null);
        setIsManualPix(false);
        addToast({ message: "Pagamento Pix cancelado.", type: 'info' });
    };

    const handleNextStep = () => {
        setFormError(null);
        if (currentStep === 'SUMMARY') {
            if (cartItems.length === 0) {
                addToast({ message: "Seu carrinho está vazio. Adicione itens antes de prosseguir.", type: 'error' });
                return;
            }
            if (!isOpenNow) {
                addToast({ message: "Restaurante Fechado. Não é possível prosseguir.", type: 'error' });
                return;
            }
            setCurrentStep('DETAILS');
        }
    };

    const handlePrevStep = () => {
        setFormError(null);
        if (currentStep === 'DETAILS') {
            setCurrentStep('SUMMARY');
        } else if (currentStep === 'PIX_PAYMENT') {
            handleBackFromPix();
        }
    };

    if (!isOpen) return null;

    const currentStepIndex = steps.findIndex(step => step.id === currentStep);

    const handleCopyPixCode = () => {
        if (pixData?.qrCode) {
            navigator.clipboard.writeText(pixData.qrCode);
            addToast({ message: 'Código Pix copiado!', type: 'success' });
        }
    };
    
    const handleCopyManualKey = () => {
        if (restaurant.manualPixKey) {
            navigator.clipboard.writeText(restaurant.manualPixKey);
            addToast({ message: 'Chave Pix copiada!', type: 'success' });
        }
    }

    const renderStepper = () => (
        <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b" role="navigation" aria-label="Progresso do Checkout">
            {steps.map((step, index) => {
                if (step.id === 'PIX_PAYMENT' && paymentMethod !== 'Pix' && index > currentStepIndex) return null;
                if (step.id === 'SUCCESS' && currentStep !== 'SUCCESS' && index > currentStepIndex) return null;
                
                const isCurrent = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const textColor = isCompleted ? 'text-orange-600' : isCurrent ? 'text-orange-500' : 'text-gray-400';
                const circleBg = isCompleted ? 'bg-orange-600' : isCurrent ? 'bg-orange-500' : 'bg-gray-300';
                const iconColor = isCompleted ? 'text-white' : 'text-gray-700';

                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center flex-1" aria-current={isCurrent ? 'step' : undefined}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${circleBg} ${isCompleted ? 'text-white' : iconColor}`}>
                                {isCompleted ? <CheckCircleIcon className="w-5 h-5" aria-hidden="true"/> : <step.icon className="w-5 h-5" aria-hidden="true"/>}
                            </div>
                            <span className={`text-xs mt-1 text-center whitespace-nowrap ${textColor}`}>{step.title}</span>
                        </div>
                        {index < steps.length - 1 && index < currentStepIndex && (
                            <div className="flex-1 border-t-2 border-orange-600 mx-1" aria-hidden="true"></div>
                        )}
                         {index < steps.length - 1 && index >= currentStepIndex && (
                            <div className="flex-1 border-t-2 border-gray-300 mx-1" aria-hidden="true"></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );

    const renderSummary = () => (
        <div className="overflow-y-auto p-4 space-y-4 pr-2 -mr-2" role="region" aria-labelledby="order-summary-heading">
            <h3 id="order-summary-heading" className="text-xl font-bold text-gray-800 mb-4">Seu Pedido</h3>
            
            {/* ALERT IF CLOSED */}
            {!isOpenNow && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r" role="alert">
                    <p className="font-bold flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        Restaurante Fechado
                    </p>
                    <p className="text-sm">No momento não estamos recebendo pedidos. Por favor, verifique o horário de funcionamento.</p>
                </div>
            )}

            {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <ShoppingBagIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" aria-hidden="true"/>
                    Sua sacola está vazia. Adicione alguns itens!
                </div>
            ) : (
                <div className="space-y-3" role="list">
                    {cartItems.map(item => (
                        <div key={item.id} className="flex items-start space-x-3 border-b pb-3 last:border-b-0 last:pb-0" role="listitem">
                            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" loading="lazy"/>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800">
                                    {item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`}
                                </p>
                                {item.halves && item.halves.length > 1 && (
                                    <p className="text-xs text-gray-500 pl-1">
                                        (Meia {item.halves.map(h => h.name).join(' / Meia ')})
                                    </p>
                                )}
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                    <ul className="text-xs text-gray-500 pl-1 mt-1" role="list">
                                        {item.selectedAddons.map(addon => (
                                            <li key={addon.id} role="listitem">
                                                + {addon.name} {addon.price > 0 && `(R$ ${addon.price.toFixed(2)})`}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="text-sm text-orange-600 font-bold mt-1">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-semibold">
                        <span>Desconto ({appliedCoupon.code})</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-gray-600">
                    <span>Taxa de Entrega</span>
                    <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2 mt-1">
                    <span>Total</span>
                    <span>R$ {finalPriceWithFee.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );

    const renderDetails = () => (
        <form onSubmit={handleSubmitDetails} id="checkout-form" className="overflow-y-auto space-y-4 p-4 pr-2 -mr-2" role="form" aria-labelledby="details-payment-heading">
            <h3 id="details-payment-heading" className="text-xl font-bold text-gray-800 mb-4">Seus Dados e Pagamento</h3>
            <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input id="customerName" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={handleNameBlur} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" aria-required="true"/>
            </div>
            <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                <input id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" aria-required="true"/>
            </div>
             <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-2">Endereço de Entrega</h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700">Rua</label>
                            <input id="street" name="street" type="text" value={address.street} onChange={handleAddressChange} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" aria-required="true"/>
                        </div>
                        <div>
                            <label htmlFor="number" className="block text-sm font-medium text-gray-700">Nº</label>
                            <input id="number" name="number" type="text" value={address.number} onChange={handleAddressChange} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" aria-required="true"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700">Bairro</label>
                            <input id="neighborhood" name="neighborhood" type="text" value={address.neighborhood} onChange={handleAddressChange} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" aria-required="true"/>
                        </div>
                        <div>
                            <label htmlFor="complement" className="block text-sm font-medium text-gray-700">Complemento</label>
                            <input id="complement" name="complement" type="text" value={address.complement} onChange={handleAddressChange} className="mt-1 w-full p-3 border rounded-lg bg-gray-50"/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="border-t pt-4">
                <span className="block text-sm font-medium text-gray-700">Forma de Pagamento</span>
                <div className="mt-2 space-y-2" role="radiogroup" aria-label="Selecione a forma de pagamento">
                    {paymentOptions.map(gateway => (
                         <div key={gateway}>
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500">
                                <input type="radio" name="payment" value={gateway} checked={paymentMethod === gateway} onChange={e => setPaymentMethod(e.target.value)} className="h-4 w-4 text-orange-600 focus:ring-orange-500"/>
                                <div className="ml-3 flex flex-col">
                                    <span className="text-gray-700">{gateway}</span>
                                    {gateway.toLowerCase().includes('cartão') && (
                                        <span className="text-xs text-blue-600 font-medium mt-0.5">
                                            ⓘ O entregador levará a maquininha.
                                        </span>
                                    )}
                                     {gateway === 'Marcar na minha conta' && (
                                        <span className="text-xs text-orange-600 font-bold mt-0.5 flex items-center">
                                            <WarningIcon className="w-3 h-3 inline mr-1" />
                                            Sujeito a aprovação do estabelecimento.
                                        </span>
                                    )}
                                </div>
                            </label>
                            {gateway === 'Dinheiro' && paymentMethod === 'Dinheiro' && (
                                <div className="mt-2 pl-4">
                                    <label htmlFor="changeFor" className="block text-sm font-medium text-gray-700">Troco para quanto? (Opcional)</label>
                                    <input id="changeFor" type="number" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="Ex: 50" className="mt-1 w-full p-2 border rounded-lg bg-gray-50"/>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700">Cupom de Desconto</label>
                {appliedCoupon ? (
                    <div className="mt-1 flex justify-between items-center p-3 border rounded-lg bg-green-50 border-green-300">
                        <p className="text-green-800 font-semibold">Cupom "{appliedCoupon.code}" aplicado!</p>
                        <button type="button" onClick={handleRemoveCoupon} className="text-red-600 font-bold text-lg" aria-label={`Remover cupom ${appliedCoupon.code}`}>&times;</button>
                    </div>
                ) : (
                    <div className="mt-1 flex gap-2">
                        <input id="couponCode" type="text" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value.toUpperCase())} placeholder="Ex: BEMVINDO10" className="flex-grow p-3 border rounded-lg bg-gray-50 uppercase"/>
                        <button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon} className="bg-gray-800 text-white font-bold px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-400">
                            {isApplyingCoupon ? 'Validando...' : 'Aplicar'}
                        </button>
                    </div>
                )}
                {formError && <p className="text-red-500 text-sm mt-1">{formError}</p>}
            </div>
        </form>
    );

    const renderPixPayment = () => {
        if (isManualPix) {
            return (
                <div className="text-center flex flex-col items-center p-4" role="region" aria-labelledby="manual-pix-heading">
                    <h3 id="manual-pix-heading" className="text-xl font-bold text-gray-800 mb-2">Pagamento Pix Manual</h3>
                    <p className="text-sm text-gray-600 mb-4 px-4">
                        O sistema automático está indisponível. Por favor, faça o Pix manualmente usando a chave abaixo e envie o comprovante se solicitado.
                    </p>
                    
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg w-full max-w-sm mb-4">
                        <p className="text-xs text-orange-700 font-bold uppercase mb-1">Chave Pix do Restaurante</p>
                        <div className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-orange-100">
                            <span className="text-lg font-mono font-bold text-gray-800 break-all select-all">{restaurant.manualPixKey}</span>
                            <button 
                                onClick={handleCopyManualKey} 
                                className="bg-orange-600 text-white p-2 rounded hover:bg-orange-700 flex-shrink-0 shadow-md"
                                aria-label="Copiar chave"
                            >
                                <ClipboardIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    <p className="text-2xl font-bold text-gray-800 mb-6">Valor: R$ {finalPriceWithFee.toFixed(2)}</p>

                    <button 
                        onClick={handleConfirmManualPix} 
                        className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors w-full max-w-xs shadow-lg animate-pulse"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Spinner message="Enviando..." /> : 'JÁ FIZ O PAGAMENTO'}
                    </button>
                </div>
            );
        }

        return (
            <div className="text-center flex flex-col items-center p-4" role="region" aria-labelledby="pix-payment-heading">
                <h3 id="pix-payment-heading" className="text-xl font-bold text-gray-800 mb-2">Pague com Pix para confirmar</h3>
                <p className="text-sm text-gray-500 mb-4">Use o app do seu banco para escanear o QR Code ou copie o código abaixo.</p>
                {pixData ? (
                    <>
                        <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="PIX QR Code" className="w-48 h-48 mx-auto my-2 border-4 border-gray-700 p-1 rounded-lg" />
                        <button 
                            onClick={handleCopyPixCode} 
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors my-2 w-full max-w-xs shadow-lg" 
                            aria-label="Copiar código Pix"
                        >
                            <ClipboardIcon className="w-5 h-5"/>
                            <span>Copiar Código Pix</span>
                        </button>
                        <div className="w-full max-w-xs mt-2 relative">
                             <textarea 
                                readOnly 
                                value={pixData.qrCode} 
                                className="font-mono bg-gray-100 p-2 rounded-lg text-xs w-full h-16 resize-none text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                aria-label="Código Pix Copia e Cola"
                            />
                        </div>
                       
                        <p className="text-2xl font-bold text-orange-600 mt-2">R$ {finalPriceWithFee.toFixed(2)}</p>
                        <div className="mt-4 text-sm font-semibold text-gray-700" aria-live="polite">Tempo restante: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</div>
                    </>
                ) : isSubmitting ? (
                    <Spinner message="Gerando QR Code..." />
                ) : null}
                {pixError && <p className="text-red-500 text-sm mt-2" role="alert">{pixError}</p>}
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="text-center flex flex-col items-center justify-center p-8" role="status" aria-live="assertive">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h3 className="text-2xl font-bold text-gray-800">Pedido Confirmado!</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 mb-6 w-full shadow-sm">
                <div className="flex flex-col items-center">
                    <p className="text-lg font-bold text-blue-800 mb-1 flex items-center gap-2">
                        <EyeIcon className="w-5 h-5"/>
                        Acompanhe seu Pedido
                    </p>
                    <p className="text-sm text-blue-700">
                        Uma barra de rastreamento aparecerá no <strong>rodapé da tela inicial</strong>. Fique de olho nela para saber quando seu pedido sair para entrega!
                    </p>
                </div>
            </div>

             <p className="text-sm text-gray-500">Redirecionando em 6 segundos...</p>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={currentStep === 'SUCCESS' ? undefined : onClose} aria-modal="true" role="dialog" aria-labelledby="checkout-modal-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                         <h2 id="checkout-modal-title" className="text-xl font-bold text-gray-800 truncate" title={restaurant.name}>
                            {currentStep === 'SUCCESS' ? 'Sucesso!' : restaurant.name}
                        </h2>
                        {currentStep !== 'SUCCESS' && (
                            <p className="text-xs text-gray-500 truncate">{restaurant.address}</p>
                        )}
                    </div>
                    {currentStep !== 'SUCCESS' && (
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
                    )}
                </div>

                {currentStep !== 'SUCCESS' && renderStepper()}

                {currentStep === 'SUMMARY' && renderSummary()}
                {currentStep === 'DETAILS' && renderDetails()}
                {currentStep === 'PIX_PAYMENT' && renderPixPayment()}
                {currentStep === 'SUCCESS' && renderSuccess()}
                
                {(currentStep === 'SUMMARY' || currentStep === 'DETAILS' || (currentStep === 'PIX_PAYMENT' && !isManualPix)) && (
                    <div className="mt-auto p-4 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
                        {currentStep === 'SUMMARY' && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                            >
                                Voltar para o carrinho
                            </button>
                        )}
                        {currentStep === 'DETAILS' && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                            >
                                Voltar
                            </button>
                        )}
                        {currentStep === 'PIX_PAYMENT' && !isManualPix && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                            >
                                Cancelar Pix
                            </button>
                        )}

                        <div className="flex flex-col items-end">
                            <span className="font-bold text-lg text-orange-600">Total: R$ {finalPriceWithFee.toFixed(2)}</span>
                            {currentStep === 'SUMMARY' && (
                                <button
                                    onClick={handleNextStep}
                                    disabled={cartItems.length === 0 || !isOpenNow} // Disable if closed
                                    className="mt-2 bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Continuar
                                </button>
                            )}
                            {currentStep === 'DETAILS' && (
                                <button
                                    type="submit"
                                    form="checkout-form"
                                    disabled={isSubmitting}
                                    className="mt-2 w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300"
                                >
                                    {isSubmitting ? <Spinner message="Processando..." /> : (paymentMethod === 'Pix' ? 'Pagar com Pix' : 'Finalizar Pedido')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                 {currentStep === 'PIX_PAYMENT' && isManualPix && (
                    <div className="mt-auto p-4 border-t bg-gray-50 rounded-b-lg flex justify-start">
                         <button
                            type="button"
                            onClick={handlePrevStep}
                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                        >
                            Voltar / Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutModal;
