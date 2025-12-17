
import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import Spinner from './Spinner';
import { Logo } from './Logo';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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
        <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: 'url("https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1600")',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-orange-900/60 backdrop-blur-sm"></div>
            </div>

             <button 
                onClick={onBack} 
                className="absolute top-4 left-4 flex items-center space-x-2 text-sm font-semibold text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-20"
                aria-label="Voltar para a página inicial"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Voltar à Loja</span>
            </button>

            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl z-10 overflow-hidden relative animate-fadeIn">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
                
                <div className="p-8">
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-orange-600 p-3 rounded-xl shadow-lg mb-4">
                            <Logo className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Área do Parceiro</h2>
                        <p className="text-sm text-gray-500 text-center mt-1">Gerencie seus pedidos e cardápio</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="email_login" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Email Profissional</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    id="email_login" 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
                                    placeholder="restaurante@exemplo.com" 
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="password_login" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    id="password_login" 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
                                    placeholder="••••••••" 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Spinner message="Autenticando..." /> : 'Acessar Painel'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-pulse">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                            {error}
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        Esqueceu sua senha? <a href="mailto:suporte@guarafood.com" className="text-orange-600 hover:text-orange-800 font-semibold transition-colors">Contate o suporte</a>
                    </p>
                </div>
            </div>
            
            <div className="absolute bottom-4 text-center z-10 text-white/40 text-xs">
                &copy; {new Date().getFullYear()} GuaraFood Enterprise. Sistema Seguro.
            </div>
        </div>
    );
};

export default LoginScreen;
