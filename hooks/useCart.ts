import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import type { CartItem, MenuItem, Combo } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: MenuItem | Combo | CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void; // New function
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'guara-food-cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((item: MenuItem | Combo | CartItem) => {
    // Check if it's a pre-built custom item from a modal
    if ('basePrice' in item) {
        const customItem = item as CartItem;
        setCartItems(prevItems => {
            const existingItem = prevItems.find(cartItem => cartItem.id === customItem.id);
            if (existingItem) {
                return prevItems.map(cartItem =>
                    cartItem.id === customItem.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            }
            return [...prevItems, { ...customItem, quantity: 1 }]; // Add new custom item
        });
        return;
    }

    // Original logic for simple items/combos
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
          price: item.price,
          basePrice: item.price, // For simple items, basePrice is the same as price
          imageUrl: item.imageUrl,
          quantity: 1,
          description: item.description,
          originalPrice: item.activePromotion?.name ? item.price : item.originalPrice,
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

  // New function to update notes for a specific item
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
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
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