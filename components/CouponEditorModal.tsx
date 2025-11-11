import React, { useState, useEffect } from 'react';
import type { Coupon } from '../types';

interface CouponEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (couponData: Omit<Coupon, 'id' | 'restaurantId'>) => void;
    existingCoupon: Coupon | null;
}

const CouponEditorModal: React.FC<CouponEditorModalProps> = ({ isOpen, onClose, onSave, existingCoupon }) => {
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [minOrderValue, setMinOrderValue] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const today = new Date();
        today.setDate(today.getDate() + 7); // Default expiration to 1 week from now
        const defaultExpiration = today.toISOString().split('T')[0];

        if (existingCoupon) {
            setCode(existingCoupon.code);
            setDescription(existingCoupon.description);
            setDiscountType(existingCoupon.discountType);
            setDiscountValue(String(existingCoupon.discountValue));
            setMinOrderValue(String(existingCoupon.minOrderValue || ''));
            setExpirationDate(existingCoupon.expirationDate.split('T')[0]);
            setIsActive(existingCoupon.isActive);
        } else {
            setCode('');
            setDescription('');
            setDiscountType('PERCENTAGE');
            setDiscountValue('');
            setMinOrderValue('');
            setExpirationDate(defaultExpiration);
            setIsActive(true);
        }
        setError('');
    }, [existingCoupon, isOpen]);

    const handleSubmit = () => {
        if (!code || !discountValue || !expirationDate) {
            setError('Código, Valor do Desconto e Data de Expiração são obrigatórios.');
            return;
        }
        const numericDiscount = parseFloat(discountValue);
        if (isNaN(numericDiscount) || numericDiscount <= 0) {
            setError('O valor do desconto deve ser um número positivo.');
            return;
        }
        const numericMinOrder = minOrderValue ? parseFloat(minOrderValue) : 0;
        if (isNaN(numericMinOrder) || numericMinOrder < 0) {
            setError('O valor mínimo do pedido deve ser um número válido.');
            return;
        }
        if (new Date(expirationDate) < new Date(new Date().toDateString())) {
            setError('A data de expiração não pode ser no passado.');
            return;
        }

        onSave({
            code,
            description,
            discountType,
            discountValue: numericDiscount,
            minOrderValue: numericMinOrder > 0 ? numericMinOrder : undefined,
            expirationDate: new Date(expirationDate).toISOString(),
            isActive,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{existingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}</h2>
                
                <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                    <input type="text" placeholder="Código do Cupom (ex: BEMVINDO10)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full p-3 border rounded-lg bg-gray-50 uppercase"/>
                    <textarea placeholder="Descrição (para seu controle interno)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50" rows={2}/>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full p-3 border rounded-lg bg-gray-50">
                            <option value="PERCENTAGE">Porcentagem (%)</option>
                            <option value="FIXED">Valor Fixo (R$)</option>
                        </select>
                        <input type="number" placeholder="Valor do Desconto" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="number" placeholder="Pedido Mínimo (Opcional)" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <div>
                             <label htmlFor="expirationDate" className="block text-xs font-medium text-gray-500 mb-1">Data de Expiração</label>
                            <input id="expirationDate" type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50"/>
                        </div>
                    </div>
                     <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                        <input type="checkbox" id="is-active-toggle" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                        <label htmlFor="is-active-toggle" className="font-semibold text-gray-700">Cupom Ativo</label>
                    </div>

                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">Salvar Cupom</button>
                </div>
            </div>
        </div>
    );
};

export default CouponEditorModal;
