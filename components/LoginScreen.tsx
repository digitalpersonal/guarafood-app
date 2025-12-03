import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import Spinner from './Spinner';
import { Logo } from './Logo';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const LoginScreen: React.FC<{ onLoginSuccess: () => void; onBack: () => void; }> = ({ onLoginSuccess, onBack }) => {
    const { login } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            setIsSubmitting(false);
            return;
        }

        try {
            await login(email, password);
            onLoginSuccess();
        } catch (err: any) {
            setError('Falha no login. Verifique seu e-mail e senha.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative">
             <button 
                onClick={onBack} 
                className="absolute top-4 left-4 flex items-center space-x-2 text-sm font-semibold text-gray-600 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50 transition-colors z-10"
                aria-label="Voltar para a página inicial"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Voltar</span>
            </button>
            <div className="max-w-sm w-full bg-white p-8 rounded-2xl shadow-xl">
                <Logo className="justify-center mb-2" />
                <p className="text-center text-gray-500 mb-8">Bem-vindo ao Painel</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email_login" className="block text-sm font-medium text-gray-700">Email</label>
                        <input id="email_login" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" placeholder="seu@email.com" />
                    </div>
                     <div>
                        <label htmlFor="password_login"  className="block text-sm font-medium text-gray-700">Senha</label>
                        <input id="password_login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300">
                        {isSubmitting ? <Spinner message="Entrando..." /> : 'Entrar'}
                    </button>
                </form>

                {error && <p className="text-red-500 text-center mt-4 text-sm font-semibold">{error}</p>}
            </div>
        </div>
    );
};

export default LoginScreen;