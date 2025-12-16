
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Coupon } from '../types';
// Fix: The database functions are in databaseService, not geminiService.
import { fetchCouponsForRestaurant } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import { getErrorMessage } from '../services/api';

// Reusable Icons
const CouponIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-3.75h.008v.008H7.5v-.008zm0 3h.008v.008H7.5v-.008zm0 3h.008v.008H7.5v-.008zM16.5 6H20a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0120 21H4.5A2.25 2.25 0 012.25 18.75V8.25A2.25 2.25 0 014.5 6h12m0-3V3h-2.25A2.25 2.25 0 0012 1.5H9.75A2.25 2.25 0 007.5 3V3.75m4.5 0V3m-3.75 0V3h2.25A2.25 2.25 0 0112 1.5h2.25A2.25 2.25 0 0116.5 3z" />
    </svg>
);
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v3.043c0 .317-.135.619-.372.83h-9.312a1.125 1.125 0 01-1.125-1.125v-3.043c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
);


interface CouponDisplayProps {
    restaurantId: number;
    className?: string;
}

const CouponDisplay: React.FC<CouponDisplayProps> = ({ restaurantId, className }) => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useNotification();

    const loadCoupons = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchCouponsForRestaurant(restaurantId);
            setCoupons(data);
        } catch (err) {
            console.error("Failed to load coupons:", err);
            // Silent fail for coupons in customer view is often better than showing an error block
            // setError(`Falha ao carregar cupons: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    const isCouponActive = useCallback((coupon: Coupon) => {
        const now = new Date();
        const expirationDate = new Date(coupon.expirationDate);
        expirationDate.setHours(23, 59, 59, 999); // Set to end of day for comparison
        return coupon.isActive && now <= expirationDate;
    }, []);

    const activeCoupons = useMemo(() => {
        return coupons.filter(isCouponActive);
    }, [coupons, isCouponActive]);

    const handleCopyCode = useCallback((code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => addToast({ message: `Código "${code}" copiado!`, type: 'success' }))
            .catch(err => addToast({ message: 'Falha ao copiar código.', type: 'error' }));
    }, [addToast]);

    if (isLoading) {
        // Optional: return null here too if you don't want a spinner for this specific section
        return null; 
    }

    if (error) {
        return null; // Hide on error
    }

    if (activeCoupons.length === 0) {
        return null; // Hides the component entirely if no coupons
    }

    return (
        <div className={`p-4 bg-purple-50 border-b-2 border-t-2 border-purple-200 ${className}`}>
            <h2 className="text-2xl font-bold mb-4 text-purple-700 flex items-center gap-2">
                <CouponIcon className="w-6 h-6" />
                Cupons Ativos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCoupons.map(coupon => (
                    <div key={coupon.id} className="bg-white p-4 rounded-lg shadow-sm border border-purple-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${isCouponActive(coupon) ? 'bg-green-500' : 'bg-gray-500'}`}>
                                    {isCouponActive(coupon) ? 'ATIVO' : 'EXPIRADO'}
                                </span>
                                <h3 className="font-bold text-gray-900 text-lg">{coupon.code}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                            <p className="text-md font-semibold text-purple-700">
                                {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `R$ ${coupon.discountValue.toFixed(2)} OFF`}
                            </p>
                            {coupon.minOrderValue && (
                                <p className="text-xs text-gray-500 mt-1">Pedido mínimo: R$ {coupon.minOrderValue.toFixed(2)}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Expira em: {new Date(coupon.expirationDate).toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="mt-4 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                            aria-label={`Copiar código do cupom ${coupon.code}`}
                        >
                            <ClipboardIcon className="w-5 h-5"/>
                            <span>Copiar Código</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CouponDisplay;
