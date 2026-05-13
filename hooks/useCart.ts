
import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import type { CartItem, MenuItem, Combo } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: MenuItem | Combo | CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'guara-food-cart-v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((item: MenuItem | Combo | CartItem) => {
    if ('basePrice' in item) {
        const customItem = item as CartItem;
        setCartItems(prevItems => {
            const existingItem = prevItems.find(cartItem => cartItem.id === customItem.id);
            if (existingItem) {
                return prevItems.map(cartItem =>
                    cartItem.id === customItem.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            }
            return [...prevItems, { ...customItem, quantity: 1 }];
        });
        return;
    }

    const isCombo = 'menuItemIds' in item;
    const cartId = isCombo ? `combo-${item.id}` : `item-${item.id}`;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === cartId);
      if (existingItem) {
        return prevItems.map(cartItem =>
          cartItem.id === cartId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      const newCartItem: CartItem = {
          id: cartId,
          name: item.name,
          price: Number(item.price),
          basePrice: Number(item.price),
          imageUrl: item.imageUrl,
          quantity: 1,
          description: item.description,
          originalPrice: item.activePromotion?.name ? Number(item.price) : (item.originalPrice ? Number(item.originalPrice) : undefined),
          promotionName: item.activePromotion?.name,
      };
      return [...prevItems, newCartItem];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, [removeFromCart]);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setCartItems(prevItems =>
        prevItems.map(item =>
            item.id === itemId ? { ...item, notes } : item
        )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemNotes,
    clearCart,
    totalPrice,
    totalItems,
  };

  return React.createElement(CartContext.Provider, { value }, children);
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
