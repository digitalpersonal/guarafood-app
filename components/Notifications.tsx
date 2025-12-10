
import React, { useEffect, useState, useRef } from 'react';
import type { ToastOptions, ConfirmOptions, PromptOptions } from '../types';

// --- ICONS ---
const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
);
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
);
const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);

// --- TOAST COMPONENT ---
const Toast: React.FC<{ options: ToastOptions; onRemove: (id: number) => void }> = ({ options, onRemove }) => {
    const { id, message, type = 'info', duration = 4000 } = options;
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onRemove(id!), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onRemove]);
    
    const colors = {
        success: 'border-green-500 bg-green-50 text-green-800',
        error: 'border-orange-500 bg-orange-50 text-orange-800',
        info: 'border-blue-500 bg-blue-50 text-blue-800',
        warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
    };
    const icons = { 
        success: <SuccessIcon className="w-6 h-6 text-green-500"/>, 
        error: <ErrorIcon className="w-6 h-6 text-orange-500"/>, 
        info: <InfoIcon className="w-6 h-6 text-blue-500"/>,
        warning: <WarningIcon className="w-6 h-6 text-yellow-500"/> 
    };

    return (
        <div className={`flex items-start w-full max-w-sm p-4 my-2 rounded-lg shadow-lg border-l-4 ${colors[type]} ${isExiting ? 'toast-out' : 'toast-in'}`}>
            <div className="flex-shrink-0">{icons[type]}</div>
            <div className="ml-3 text-sm font-medium">{message}</div>
        </div>
    );
};

// --- MODAL COMPONENTS ---
const ConfirmationModal: React.FC<{ options: ConfirmOptions }> = ({ options }) => {
    const { title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false } = options;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-gray-600 mt-2">{message}</p>
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-white font-bold ${isDestructive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const PromptModal: React.FC<{ options: PromptOptions }> = ({ options }) => {
    const [value, setValue] = useState('');
    const { title, message, placeholder, onSubmit, onCancel, submitText = 'Submit', cancelText = 'Cancel' } = options;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-gray-600 mt-2">{message}</p>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 mt-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
                <div className="flex justify-end space-x-3 mt-6">
                    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">{cancelText}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700">{submitText}</button>
                </div>
            </form>
        </div>
    );
};


// --- MAIN NOTIFICATIONS CONTAINER ---
interface NotificationsProps {
    toasts: ToastOptions[];
    removeToast: (id: number) => void;
    confirmOptions: ConfirmOptions | null;
    promptOptions: PromptOptions | null;
}

const Notifications: React.FC<NotificationsProps> = ({ toasts, removeToast, confirmOptions, promptOptions }) => {
    return (
        <>
            <div className="fixed top-4 right-4 z-[200] space-y-2">
                {toasts.map(toast => (
                    <Toast key={toast.id} options={toast} onRemove={removeToast} />
                ))}
            </div>
            {confirmOptions && <ConfirmationModal options={confirmOptions} />}
            {promptOptions && <PromptModal options={promptOptions} />}
        </>
    );
};

export default Notifications;
