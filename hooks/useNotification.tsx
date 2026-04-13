
import { useState, useCallback, useContext, createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import Notifications from '../components/Notifications';
import type { ToastOptions, ConfirmOptions, PromptOptions } from '../types';

interface NotificationContextType {
    addToast: (options: ToastOptions) => void;
    confirm: (options: Omit<ConfirmOptions, 'onConfirm' | 'onCancel'>) => Promise<boolean>;
    prompt: (options: Omit<PromptOptions, 'onSubmit' | 'onCancel'>) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastOptions[]>([]);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
    const [promptOptions, setPromptOptions] = useState<PromptOptions | null>(null);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((options: ToastOptions) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { ...options, id }]);
    }, []);

    const confirm = useCallback((options: Omit<ConfirmOptions, 'onConfirm' | 'onCancel'>): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmOptions({
                ...options,
                onConfirm: () => {
                    setConfirmOptions(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmOptions(null);
                    resolve(false);
                },
            });
        });
    }, []);
    
    const prompt = useCallback((options: Omit<PromptOptions, 'onSubmit' | 'onCancel'>): Promise<string | null> => {
         return new Promise((resolve) => {
            setPromptOptions({
                ...options,
                onSubmit: (value: string) => {
                    setPromptOptions(null);
                    resolve(value);
                },
                onCancel: () => {
                    setPromptOptions(null);
                    resolve(null);
                },
            });
        });
    }, []);
    

    const value = useMemo(() => ({ addToast, confirm, prompt }), [addToast, confirm, prompt]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <Notifications
                toasts={toasts}
                removeToast={removeToast}
                confirmOptions={confirmOptions}
                promptOptions={promptOptions}
            />
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
