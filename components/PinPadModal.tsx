import React, { useState, useEffect } from 'react';
import type { StaffMember } from '../types';

interface PinPadModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: StaffMember[];
    onSuccess: (member: StaffMember) => void;
    title?: string;
}

const PinPadModal: React.FC<PinPadModalProps> = ({ isOpen, onClose, staff, onSuccess, title = 'Acesso Restrito' }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
        }
    }, [isOpen]);

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            const newPin = pin + num.toString();
            setPin(newPin);
            if (newPin.length === 4) {
                validatePin(newPin);
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const validatePin = (inputPin: string) => {
        const member = staff.find(s => s.pin === inputPin && s.active);
        if (member) {
            onSuccess(member);
            setPin('');
            setError('');
        } else {
            setError('PIN incorreto ou inativo');
            setPin('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-8 text-center bg-gray-50 border-b">
                    <h2 className="text-2xl font-black text-gray-800 mb-2">{title}</h2>
                    <p className="text-gray-500 text-sm">Digite seu PIN de 4 dígitos</p>
                    
                    <div className="flex justify-center gap-4 mt-6 mb-2">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'bg-orange-600 scale-110' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold mt-2 animate-pulse">{error}</p>}
                </div>

                <div className="p-6 grid grid-cols-3 gap-4 bg-white">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="aspect-square rounded-2xl bg-gray-50 text-2xl font-black text-gray-700 hover:bg-orange-100 hover:text-orange-600 active:scale-90 transition-all shadow-sm border border-gray-100"
                        >
                            {num}
                        </button>
                    ))}
                    <button onClick={onClose} className="aspect-square rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider">
                        Cancelar
                    </button>
                    <button
                        onClick={() => handleNumberClick(0)}
                        className="aspect-square rounded-2xl bg-gray-50 text-2xl font-black text-gray-700 hover:bg-orange-100 hover:text-orange-600 active:scale-90 transition-all shadow-sm border border-gray-100"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="aspect-square rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PinPadModal;
