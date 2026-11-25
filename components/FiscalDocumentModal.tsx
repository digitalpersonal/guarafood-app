import React, { useState, useEffect, useRef } from 'react';
import type { Order } from '../types';

interface FiscalDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onConfirm: (document: string | null, customerName?: string, customDescription?: string, customPrice?: number) => void;
    actionLabel?: string;
}

export const formatCpfCnpj = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const isValidCpfCnpj = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
        if (/^(\d)\1{10}$/.test(digits)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
        let rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(digits[9], 10)) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
        rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        return rev === parseInt(digits[10], 10);
    }
    if (digits.length === 14) {
        if (/^(\d)\1{13}$/.test(digits)) return false;
        return true;
    }
    return false;
};

export const FiscalDocumentModal: React.FC<FiscalDocumentModalProps> = ({
    isOpen,
    onClose,
    order,
    onConfirm,
    actionLabel = 'Imprimir Cupom Fiscal'
}) => {
    const [choice, setChoice] = useState<'yes' | 'no'>('yes');
    const [documentValue, setDocumentValue] = useState<string>('');
    const [nameValue, setNameValue] = useState<string>('');
    const [descriptionValue, setDescriptionValue] = useState<string>('');
    const [priceValue, setPriceValue] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && order) {
            const initialDoc = order.customerDocument || '';
            setDocumentValue(formatCpfCnpj(initialDoc));
            setNameValue(order.customerName || '');
            
            const firstItemName = order.items?.[0]?.name || 'Refeição';
            setDescriptionValue(firstItemName);
            setPriceValue(order.totalPrice ? order.totalPrice.toFixed(2) : '0.00');

            setChoice(initialDoc ? 'yes' : 'no');
            setErrorMsg('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, order]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !order) return null;

    const orderNum = order.order_number 
        ? `#${String(order.order_number).padStart(3, '0')}`
        : `#${order.id.slice(-4).toUpperCase()}`;

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCpfCnpj(e.target.value);
        setDocumentValue(formatted);
        setErrorMsg('');
        if (formatted) setChoice('yes');
    };

    const handleProceedWithDoc = () => {
        const clean = documentValue.replace(/\D/g, '');
        if (clean.length > 0) {
            if (clean.length !== 11 && clean.length !== 14) {
                setErrorMsg('O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).');
                return;
            }
            if (clean.length === 11 && !isValidCpfCnpj(clean)) {
                setErrorMsg('CPF inválido. Verifique os números digitados.');
                return;
            }
        }

        const parsedPrice = parseFloat(priceValue.replace(',', '.')) || order.totalPrice;
        const docToPass = choice === 'yes' && clean.length > 0 ? documentValue : null;
        onConfirm(docToPass, nameValue.trim() || order.customerName, descriptionValue.trim() || order.items?.[0]?.name || 'Refeição', parsedPrice);
    };

    const handleProceedWithoutDoc = () => {
        const parsedPrice = parseFloat(priceValue.replace(',', '.')) || order.totalPrice;
        onConfirm(null, nameValue.trim() || order.customerName, descriptionValue.trim() || order.items?.[0]?.name || 'Refeição', parsedPrice);
    };

    const cleanDigits = documentValue.replace(/\D/g, '');
    const isDocValid = cleanDigits.length === 0 || (cleanDigits.length === 11 && isValidCpfCnpj(cleanDigits)) || cleanDigits.length === 14;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-scaleUp transform transition-all max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-900 text-white p-5 sm:p-6 relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-all active:scale-95 cursor-pointer"
                        title="Fechar (Esc)"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                            NFC-e • SEFAZ • Personalização
                        </span>
                        <span className="text-xs text-blue-200 font-mono font-bold">
                            Pedido {orderNum}
                        </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                        <span>🧾</span>
                        <span>Emitir Nota Fiscal</span>
                    </h3>
                    <p className="text-xs text-blue-100 mt-1">
                        Confirme o CPF/CNPJ, edite a descrição do item e o valor antes da impressão.
                    </p>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-4 bg-gray-50/50 overflow-y-auto flex-grow">
                    {/* Edição de Item e Valor */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                            <span>✏️</span>
                            <span>Editar Item e Valor a Ser Impreso:</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-8">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide block mb-1">
                                    Descrição do Item:
                                </label>
                                <input
                                    type="text"
                                    value={descriptionValue}
                                    onChange={(e) => setDescriptionValue(e.target.value)}
                                    placeholder="Ex: Refeição, Lanche, etc."
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>
                            <div className="sm:col-span-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide block mb-1">
                                    Valor Total (R$):
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={priceValue}
                                    onChange={(e) => setPriceValue(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botões de Decisão Sim / Não para CPF */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setChoice('no');
                                setDocumentValue('');
                                setErrorMsg('');
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                choice === 'no'
                                    ? 'bg-purple-50 border-purple-600 shadow-sm'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-base mb-1">🚫</span>
                            <div>
                                <span className="text-xs font-black text-gray-900 block">SEM CPF</span>
                                <span className="text-[10px] text-gray-500 block leading-tight">
                                    Consumidor não identificado
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setChoice('yes');
                                setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                choice === 'yes'
                                    ? 'bg-purple-50 border-purple-600 shadow-sm'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-base mb-1">👤</span>
                            <div>
                                <span className="text-xs font-black text-purple-900 block">COM CPF/CNPJ</span>
                                <span className="text-[10px] text-gray-500 block leading-tight">
                                    Informar documento
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Campo de Documento quando 'SIM' selecionado */}
                    {choice === 'yes' && (
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3 animate-fadeIn">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                        Número do CPF ou CNPJ:
                                    </label>
                                    {cleanDigits.length > 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isDocValid 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {isDocValid ? '✓ Documento Válido' : `${cleanDigits.length}/11 dígitos`}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        inputMode="numeric"
                                        value={documentValue}
                                        onChange={handleDocumentChange}
                                        placeholder="000.000.000-00 ou CNPJ"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all placeholder:text-gray-400"
                                        maxLength={18}
                                    />
                                    {documentValue && (
                                        <button
                                            type="button"
                                            onClick={() => setDocumentValue('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-sm font-bold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {errorMsg && (
                                    <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                                        <span>⚠️</span> {errorMsg}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide block mb-1">
                                    Nome do Cliente na Nota (Opcional):
                                </label>
                                <input
                                    type="text"
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    placeholder="Ex: João da Silva"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Resumo visual do cupom */}
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-center gap-2">
                        <span>💡</span>
                        <span>
                            Resumo: Item <strong className="font-bold">"{descriptionValue || 'Refeição'}"</strong> no valor de <strong className="font-bold">R$ {parseFloat(priceValue || '0').toFixed(2)}</strong> {choice === 'yes' && cleanDigits.length >= 11 ? `para ${documentValue}` : '(Sem CPF)'}
                        </span>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleProceedWithoutDoc}
                        className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all active:scale-95 cursor-pointer text-center"
                    >
                        Continuar sem CPF
                    </button>

                    <button
                        type="button"
                        onClick={handleProceedWithDoc}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>🖨️</span>
                        <span>{actionLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FiscalDocumentModal;
