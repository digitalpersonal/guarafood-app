



import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../hooks/useCart';
import type { Restaurant } from '../types';
import { useAnimation } from '../hooks/useAnimation';
import { useNotification } from '../hooks/useNotification';
import CheckoutModal from './CheckoutModal';


const CartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);


const Cart: React.FC<{ restaurant?: Restaurant | null }> = ({ restaurant }) => {
    const { cartItems, updateQuantity, removeFromCart, totalPrice, totalItems, clearCart } = useCart();
    const { addToast } = useNotification();
    const { setCartElement } = useAnimation();
    const cartButtonRef = useRef<HTMLButtonElement>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        if (cartButtonRef.current) {
            setCartElement(cartButtonRef.current);
        }
        return () => {
            setCartElement(null);
        };
    }, [totalItems, setCartElement]);


    const handleCheckout = () => {
        if (!restaurant) {
            addToast({ message: "Erro: Restaurante não selecionado.", type: 'error' });
            return;
        }
        setIsCheckoutOpen(true);
    };

    if (totalItems === 0 && !isCartOpen) {
        return null;
    }
    
    if (!isCartOpen) {
        return (
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    ref={cartButtonRef}
                    onClick={() => setIsCartOpen(true)}
                    className="bg-orange-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center space-x-2 hover:bg-orange-700 transition-colors"
                    aria-label={`Abrir carrinho com ${totalItems} itens`}
                >
                    <CartIcon className="w-8 h-8"/>
                    <span className="absolute -top-1 -right-1 bg-white text-orange-600 rounded-full text-xs font-bold w-6 h-6 flex items-center justify-center border-2 border-orange-600">{totalItems}</span>
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={() => setIsCartOpen(false)}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md m-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b flex justify-between items-start gap-4">
                        <div className="flex-grow min-w-0">
                             <h2 className="text-xl font-bold text-gray-800 truncate" title={restaurant ? restaurant.name : 'Seu Pedido'}>
                                {restaurant ? restaurant.name : 'Seu Pedido'}
                            </h2>
                            {restaurant && (
                                <p className="text-xs text-gray-500 truncate" title={restaurant.address}>{restaurant.address}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-4 flex-shrink-0">
                            {cartItems.length > 0 && (
                                <button 
                                    onClick={clearCart} 
                                    className="text-sm text-orange-600 font-semibold hover:underline flex items-center space-x-1"
                                    aria-label="Limpar todo o carrinho"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    <span>Limpar</span>
                                </button>
                            )}
                            <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar carrinho">&times;</button>
                        </div>
                    </div>
                    
                    {cartItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 flex-grow flex flex-col justify-center items-center">
                            <CartIcon className="w-16 h-16 mx-auto text-gray-300 mb-4"/>
                            Sua sacola está vazia.
                        </div>
                    ) : (
                        <div className="overflow-y-auto p-4 flex-grow">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex items-start space-x-4 mb-4">
                                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover" loading="lazy"/>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-800">
                                            {item.name} {item.sizeName && `(${item.sizeName})`}
                                        </p>
                                        {item.halves && item.halves.length > 1 && (
                                            <p className="text-xs text-gray-500 pl-1">
                                                (Meia {item.halves.map(h => h.name).join(' / Meia ')})
                                            </p>
                                        )}
                                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                                            <ul className="text-xs text-gray-500 pl-1 mt-1">
                                                {item.selectedAddons.map(addon => (
                                                    <li key={addon.id}>
                                                        + {addon.name} {addon.price > 0 && `(R$ ${addon.price.toFixed(2)})`}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                         {item.originalPrice ? (
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-sm text-orange-600 font-bold">R$ {item.price.toFixed(2)}</p>
                                                <p className="text-xs text-gray-500 line-through">R$ {item.originalPrice.toFixed(2)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-orange-600 font-bold mt-1">R$ {item.price.toFixed(2)}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border text-gray-600 flex items-center justify-center text-lg">-</button>
                                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border text-gray-600 flex items-center justify-center text-lg">+</button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500" aria-label={`Remover ${item.name}`}>
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {cartItems.length > 0 && (
                         <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors flex justify-between items-center"
                            >
                                <span>Finalizar Pedido</span>
                                <span>R$ {totalPrice.toFixed(2)}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isCheckoutOpen && restaurant && (
                <CheckoutModal 
                    isOpen={isCheckoutOpen} 
                    onClose={() => setIsCheckoutOpen(false)}
                    restaurant={restaurant}
                />
            )}
        </>
    );
};

export default Cart;