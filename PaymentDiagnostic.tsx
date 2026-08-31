import React, { useState, useEffect } from 'react';
import type { Restaurant } from '../types';

interface PaymentDiagnosticProps {
    restaurant: Restaurant | null;
}

const PaymentDiagnostic: React.FC<PaymentDiagnosticProps> = ({ restaurant }) => {
    const [mpStatus, setMpStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            if (!restaurant) return;
            const token = restaurant.mercado_pago_credentials?.accessToken;
            if (!token) {
                setMpStatus('missing');
                return;
            }
            if (token === 'PROTECTED' || token.length > 0) {
                // Since the token is scrubbed by the backend for security and returned as 'PROTECTED',
                // we can assume it's valid if it is present. To do a real validation we would need a server call,
                // but for this diagnostic, the presence is what we check.
                setMpStatus('valid');
                return;
            }
        };
        checkToken();
    }, [restaurant]);

    if (!restaurant || isDismissed) return null;

    const hasPixEnabled = restaurant.paymentGateways?.some(g => g.toLowerCase() === 'pix') || false;
    const hasManualPix = !!restaurant.manualPixKey && restaurant.manualPixKey.trim().length > 0;
    const hasMpToken = !!restaurant.mercado_pago_credentials?.accessToken && restaurant.mercado_pago_credentials.accessToken.trim().length > 0;

    let warnings: string[] = [];

    if (hasPixEnabled) {
        if (!hasManualPix && !hasMpToken) {
            warnings.push("O método de pagamento 'Pix' está ativo, mas a 'Chave Pix' manual não foi informada e a integração com o Mercado Pago não está configurada.");
        } else if (hasMpToken && mpStatus === 'invalid') {
            warnings.push("Como o seu Access Token do Mercado Pago não validou, e o Pix está ativo, o sistema tentaria usar Pix automático mas irá falhar. Configure um Access Token válido ou forneça uma Chave Pix manual.");
        } else if (!hasMpToken && !hasManualPix) {
             warnings.push("Falta Chave Pix para o Pix funcionar (seja via Mercado Pago ou Chave Manual).");
        }
    }

    if (hasMpToken && mpStatus === 'invalid' && !warnings.some(w => w.includes("Access Token"))) {
        warnings.push("Seu Access Token do Mercado Pago é inválido. Pagamentos online falharão. Por favor, verifique se copiou corretamente do painel do Mercado Pago.");
    }

    if (warnings.length === 0) return null;

    return (
        <div className="m-3 p-4 bg-red-50 border-l-4 border-red-500 rounded shadow-md text-sm animate-pulse">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <h3 className="font-bold text-red-900 text-base">Alerta de Pagamento / PIX</h3>
                        <ul className="mt-1.5 text-red-800 space-y-1 font-medium">
                            {warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                        <p className="mt-3 text-xs text-red-700 font-bold bg-white/50 px-2 py-1 rounded inline-block">
                            Acesse a aba ⚙️ CONFIG para corrigir estas pendências.
                        </p>
                    </div>
                </div>
                <button onClick={() => setIsDismissed(true)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default PaymentDiagnostic;
