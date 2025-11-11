
import React, { createContext, useState, useContext, useCallback, useRef, ReactNode, useEffect } from 'react';

interface FlyingItem {
    id: number;
    imageUrl: string;
    startRect: DOMRect;
}

interface AnimationContextType {
    addFlyingItem: (imageUrl: string, startRect: DOMRect) => void;
    setCartElement: (element: HTMLElement | null) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

const FlyToCartAnimation: React.FC<{
    item: FlyingItem;
    cartElement: HTMLElement | null;
    onComplete: (id: number) => void;
}> = ({ item, cartElement, onComplete }) => {
    const elRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const el = elRef.current;
        if (!el || !cartElement) {
            // If cart is not visible, end animation immediately
            onComplete(item.id);
            return;
        };

        const { top: startTop, left: startLeft, width, height } = item.startRect;
        
        el.style.left = `${startLeft}px`;
        el.style.top = `${startTop}px`;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;

        const cartRect = cartElement.getBoundingClientRect();
        const endLeft = cartRect.left + cartRect.width / 2;
        const endTop = cartRect.top + cartRect.height / 2;

        requestAnimationFrame(() => {
            el.style.transform = `translate(${endLeft - startLeft}px, ${endTop - startTop}px) scale(0.1)`;
            el.style.opacity = '0';
        });

        const handleAnimationEnd = () => {
            onComplete(item.id);
        };

        el.addEventListener('transitionend', handleAnimationEnd);

        return () => {
            el.removeEventListener('transitionend', handleAnimationEnd);
        };
    }, [item, cartElement, onComplete]);

    // FIX: Replaced JSX with React.createElement to fix parsing errors in a .ts file.
    return React.createElement('img', {
        ref: elRef,
        src: item.imageUrl,
        alt: "",
        'aria-hidden': "true",
        className: "fixed z-[100] rounded-md object-cover transition-all duration-700 ease-in-out pointer-events-none",
        style: {
            transform: 'translate(0, 0) scale(1)',
            opacity: '1',
        },
    });
};

export const AnimationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
    const cartElementRef = useRef<HTMLElement | null>(null);

    const addFlyingItem = useCallback((imageUrl: string, startRect: DOMRect) => {
        setFlyingItems(prev => [...prev, { id: Date.now(), imageUrl, startRect }]);
    }, []);

    const removeFlyingItem = useCallback((id: number) => {
        setFlyingItems(prev => prev.filter(item => item.id !== id));
    }, []);
    
    const setCartElement = useCallback((element: HTMLElement | null) => {
        cartElementRef.current = element;
    }, []);

    const value = { addFlyingItem, setCartElement };

    // FIX: Replaced JSX with React.createElement to fix parsing errors in a .ts file.
    return React.createElement(
        AnimationContext.Provider,
        { value: value },
        children,
        ...flyingItems.map(item =>
            React.createElement(FlyToCartAnimation, {
                key: item.id,
                item: item,
                cartElement: cartElementRef.current,
                onComplete: removeFlyingItem,
            })
        )
    );
};

export const useAnimation = (): AnimationContextType => {
    const context = useContext(AnimationContext);
    if (context === undefined) {
        throw new Error('useAnimation must be used within an AnimationProvider');
    }
    return context;
};