
import React, { useState, useEffect } from 'react';
import type { Restaurant, CartItem } from '../types';
import { Scale, ShoppingBag, X, CheckCircle2 } from 'lucide-react';

interface KiloEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: CartItem) => void;
    restaurant: Restaurant;
}

const KiloEntryModal: React.FC<KiloEntryModalProps> = ({ isOpen, onClose, onAddToCart, restaurant }) => {
    const [weight, setWeight] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setWeight('');
            setIsAdding(false);
        }
    }, [isOpen]);

    const pricePerKilo = restaurant.pricePerKilo || 0;
    const numericWeight = parseFloat(weight.replace(',', '.')) || 0;
    const totalPrice = numericWeight * pricePerKilo;

    const handleAddToCart = () => {
        if (numericWeight <= 0) return;

        setIsAdding(true);
        
        const cartItem: CartItem = {
            id: `kilo-${Date.now()}`,
            name: `Açaí por Peso (${(numericWeight * 1000).toFixed(0)}g)`,
            price: totalPrice,
            basePrice: pricePerKilo,
            imageUrl: 'https://images.pexels.com/photos/5945763/pexels-photo-5945763.jpeg?auto=compress&cs=tinysrgb&w=400',
            quantity: 1,
            description: `Venda por peso: ${numericWeight.toFixed(3)}kg x R$ ${pricePerKilo.toFixed(2)}/kg`,
            isKiloItem: true,
            weight: numericWeight,
            restaurantId: restaurant.id
        };

        setTimeout(() => {
            onAddToCart(cartItem);
            onClose();
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[150] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Scale className="w-6 h-6" />
                            Venda por Peso
                        </h2>
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Preço por Kg: R$ {pricePerKilo.toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Informe o Peso (kg)</label>
                        <div className="relative inline-block w-full">
                            <input 
                                type="text" 
                                inputMode="decimal"
                                autoFocus
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                placeholder="0,000"
                                className="w-full text-5xl font-black text-center p-4 border-b-4 border-emerald-100 focus:border-emerald-500 outline-none transition-colors text-emerald-900 placeholder:text-gray-100"
                            />
                            <span className="absolute right-4 bottom-4 text-gray-300 font-black text-xl">kg</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valor Total</span>
                        <div className="text-4xl font-black text-emerald-900 flex items-baseline gap-1">
                            <span className="text-sm font-bold text-emerald-400">R$</span>
                            {totalPrice.toFixed(2)}
                        </div>
                    </div>

                    <button 
                        onClick={handleAddToCart}
                        disabled={numericWeight <= 0 || isAdding}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${numericWeight > 0 && !isAdding ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                        {isAdding ? (
                            <CheckCircle2 className="w-6 h-6 animate-in zoom-in" />
                        ) : (
                            <>
                                <ShoppingBag className="w-5 h-5" />
                                <span>Adicionar ao Pedido</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KiloEntryModal;
