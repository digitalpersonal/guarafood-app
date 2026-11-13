import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import type { CartItem, MenuItem, Combo } from '../types';
import { useNotification } from './useNotification';
import { triggerHapticFeedback } from '../utils/haptic';

interface CartContextType {
  cartItems: CartItem[];
  cartRestaurantId: number | null;
  addToCart: (item: MenuItem | Combo | CartItem, restaurantIdFallback?: number) => boolean;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'guara-food-cart-v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useNotification();
  
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!storedCart) return [];
      const parsed: CartItem[] = JSON.parse(storedCart);
      if (!Array.isArray(parsed) || parsed.length === 0) return [];
      
      // Determine primary restaurant ID
      const firstValidItem = parsed.find(i => i && (i.restaurantId !== undefined || (i as any).restaurant_id !== undefined));
      if (!firstValidItem) return [];
      
      const primaryRestaurantId = Number(firstValidItem.restaurantId ?? (firstValidItem as any).restaurant_id);
      if (isNaN(primaryRestaurantId)) return [];

      // Filter and sanitize: keep ONLY items that strictly belong to the primary restaurant
      return parsed
        .filter(i => {
          const rId = Number(i.restaurantId ?? (i as any).restaurant_id);
          return !isNaN(rId) && rId === primaryRestaurantId;
        })
        .map(i => ({
          ...i,
          restaurantId: primaryRestaurantId,
          price: Number(i.price),
          basePrice: Number(i.basePrice ?? i.price),
          quantity: Math.max(1, Number(i.quantity) || 1)
        }));
    } catch (error) {
      console.error("[useCart] Erro ao carregar carrinho local:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("[useCart] Erro ao salvar carrinho local:", e);
    }
  }, [cartItems]);

  const cartRestaurantId = useMemo<number | null>(() => {
    if (cartItems.length === 0) return null;
    const firstWithId = cartItems.find(i => i.restaurantId !== undefined && i.restaurantId !== null);
    if (!firstWithId || firstWithId.restaurantId === undefined) return null;
    const num = Number(firstWithId.restaurantId);
    return isNaN(num) ? null : num;
  }, [cartItems]);

  const addToCart = useCallback((item: MenuItem | Combo | CartItem, restaurantIdFallback?: number): boolean => {
    triggerHapticFeedback(30);

    const rawRestId = (item as any).restaurantId ?? (item as any).restaurant_id ?? restaurantIdFallback;
    const itemRestaurantId = (rawRestId !== undefined && rawRestId !== null && !isNaN(Number(rawRestId)))
      ? Number(rawRestId)
      : undefined;

    // Check if cart already has items from another restaurant
    if (cartItems.length > 0) {
      const activeRestId = cartItems.find(i => i.restaurantId !== undefined && i.restaurantId !== null)?.restaurantId;
      if (activeRestId !== undefined && itemRestaurantId !== undefined && Number(activeRestId) !== Number(itemRestaurantId)) {
        addToast({
          message: 'Não é possível adicionar produtos de restaurantes diferentes no mesmo carrinho. Limpe o carrinho atual para pedir deste restaurante.',
          type: 'error'
        });
        return false;
      }
    }

    setCartItems(prevItems => {
      // Secondary check against prevItems to prevent concurrent race conditions
      if (prevItems.length > 0) {
        const activeRestId = prevItems.find(i => i.restaurantId !== undefined && i.restaurantId !== null)?.restaurantId;
        if (activeRestId !== undefined && itemRestaurantId !== undefined && Number(activeRestId) !== Number(itemRestaurantId)) {
          return prevItems;
        }
      }

      const finalRestId = itemRestaurantId !== undefined 
        ? itemRestaurantId 
        : (prevItems.length > 0 ? prevItems[0].restaurantId : undefined);

      if ('basePrice' in item) {
        const customItem = item as CartItem;
        const normalizedCustomItem: CartItem = {
          ...customItem,
          restaurantId: finalRestId,
          price: Number(customItem.price),
          basePrice: Number(customItem.basePrice)
        };
        const existingItem = prevItems.find(cartItem => cartItem.id === normalizedCustomItem.id);
        if (existingItem) {
          return prevItems.map(cartItem =>
            cartItem.id === normalizedCustomItem.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
          );
        }
        return [...prevItems, { ...normalizedCustomItem, quantity: 1 }];
      }

      const isCombo = 'menuItemIds' in item;
      const cartId = isCombo ? `combo-${item.id}` : `item-${item.id}`;
      const existingItem = prevItems.find(cartItem => cartItem.id === cartId);
      if (existingItem) {
        return prevItems.map(cartItem =>
          cartItem.id === cartId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }

      const newCartItem: CartItem = {
        id: cartId,
        restaurantId: finalRestId,
        categoryId: ('categoryId' in item) ? item.categoryId : undefined,
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

    return true;
  }, [cartItems, addToast]);

  const replaceCart = useCallback((items: CartItem[]) => {
    triggerHapticFeedback(50);
    if (!items || items.length === 0) {
      setCartItems([]);
      return;
    }
    // Determine restaurant id from first item
    const firstWithId = items.find(i => i.restaurantId !== undefined || (i as any).restaurant_id !== undefined);
    const targetRestId = firstWithId ? Number(firstWithId.restaurantId ?? (firstWithId as any).restaurant_id) : undefined;
    
    const sanitized = items
      .filter(i => {
        if (targetRestId === undefined) return true;
        const rId = Number(i.restaurantId ?? (i as any).restaurant_id);
        return !isNaN(rId) && rId === targetRestId;
      })
      .map(i => ({
        ...i,
        restaurantId: targetRestId,
        price: Number(i.price),
        basePrice: Number(i.basePrice ?? i.price),
        quantity: Math.max(1, Number(i.quantity) || 1)
      }));

    setCartItems(sanitized);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    triggerHapticFeedback(30);
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    triggerHapticFeedback(30);
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
    triggerHapticFeedback(50);
    setCartItems([]);
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }, []);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    cartRestaurantId,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemNotes,
    clearCart,
    replaceCart,
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
