import React, { useState } from 'react';
import { useAuth } from '../services/authService';
import Spinner from './Spinner';
import { Logo } from './Logo';
import { supabase } from '../services/api';

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const LoginScreen: React.FC<{ onLoginSuccess: () => void; onBack: () => void; }> = ({ onLoginSuccess, onBack }) => {
    const { login } = useAuth();
    
    // State for both modes
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('Admin');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // Mode toggle
    const [isSetupMode, setIsSetupMode] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

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
    
    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            setIsSubmitting(false);
            return;
        }

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'admin',
                        name: name,
                    }
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (data.user?.identities?.length === 0) {
                 setError('Este usuário já existe, mas está com a confirmação de e-mail pendente.');
            } else if (data.user) {
                setSuccessMessage('Administrador criado! Se a confirmação de e-mail estiver ativa no seu projeto Supabase, verifique sua caixa de entrada para confirmar. Depois, você já pode fazer o login.');
                setEmail('');
                setPassword('');
                setIsSetupMode(false); // Switch back to login form
            }

        } catch (err: any) {
            if (err.message.includes('User already registered')) {
                setError('Este e-mail já está cadastrado. Tente fazer login.');
            } else {
                setError(`Erro ao criar conta: ${err.message}`);
            }
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const prefillAdminData = () => {
        setEmail('digitalpersonal@gmail.com');
        setPassword('Mld3602#');
        setName('Administrador Principal');
        setIsSetupMode(true);
        setError('');
        setSuccessMessage('');
    };

    const renderLoginForm = () => (
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
    );

    const renderSetupForm = () => (
         <form onSubmit={handleSetup} className="space-y-4">
            <div>
                <label htmlFor="name_setup" className="block text-sm font-medium text-gray-700">Nome do Administrador</label>
                <input id="name_setup" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50"/>
            </div>
            <div>
                <label htmlFor="email_setup" className="block text-sm font-medium text-gray-700">Email</label>
                <input id="email_setup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50"/>
            </div>
             <div>
                <label htmlFor="password_setup"  className="block text-sm font-medium text-gray-700">Senha</label>
                <input id="password_setup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-gray-50" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                {isSubmitting ? <Spinner message="Criando..." /> : 'Criar Administrador'}
            </button>
        </form>
    );

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
                <p className="text-center text-gray-500 mb-8">{isSetupMode ? 'Crie o Primeiro Administrador' : 'Bem-vindo ao Painel'}</p>

                {isSetupMode ? renderSetupForm() : renderLoginForm()}

                {error && <p className="text-red-500 text-center mt-4 text-sm font-semibold">{error}</p>}
                {successMessage && <p className="text-green-600 text-center mt-4 text-sm font-semibold">{successMessage}</p>}

                <div className="mt-6 text-center text-xs">
                    {isSetupMode ? (
                         <p className="text-gray-500">Já tem uma conta? <button onClick={() => { setIsSetupMode(false); setError(''); setSuccessMessage(''); }} className="font-semibold text-orange-600 hover:underline">Faça Login</button></p>
                    ) : (
                        <div className="space-y-2 border-t pt-4 mt-4">
                             <p className="text-gray-500">Ainda não tem um administrador?</p>
                             <button onClick={prefillAdminData} className="font-semibold text-blue-600 hover:underline">Clique aqui para criar o primeiro administrador com os dados fornecidos.</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;