import React, { Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './components/VersionChecker';

// ==============================================================================
// 🧼 AUTO-UPDATER E LIMPEZA PREVENTIVA DE CACHE (DEPLOYS SEM TRAVAMENTO)
// ==============================================================================
const storedVersion = localStorage.getItem('guarafood_app_version');
if (storedVersion !== APP_VERSION) {
    console.log(`[GuaraFood Auto-Update] Nova versão detectada (${APP_VERSION}). Realizando limpeza preventiva de caches obsoletos...`);
    
    // Grava a nova versão imediatamente para evitar reloads infinitos
    localStorage.setItem('guarafood_app_version', APP_VERSION);
    
    // 1. Limpar localStorage mantendo APENAS a sessão de Login do Usuário (Evita forçar logout!)
    try {
        const preservedKeys = ['guara-food-user-profile-v3'];
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // Chaves do Supabase (sb-) ou chaves de login preservadas não são removidas!
            if (key.startsWith('sb-') || preservedKeys.includes(key) || key === 'guarafood_app_version') {
                continue;
            }
            keysToRemove.push(key);
        }
        
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log("[GuaraFood Auto-Update] LocalStorage higienizado.");
    } catch (e) {
        console.error("[GuaraFood Auto-Update] Erro ao limpar LocalStorage:", e);
    }

    // 2. Desregistrar Service Workers e apagar API Cache Storage de forma assíncrona
    Promise.all([
        ('serviceWorker' in navigator) ? navigator.serviceWorker.getRegistrations().then(regs => {
            return Promise.all(regs.map(r => r.unregister()));
        }).catch(() => {}) : Promise.resolve(),
        
        ('caches' in window) ? caches.keys().then(keys => {
            return Promise.all(keys.map(k => caches.delete(k)));
        }).catch(() => {}) : Promise.resolve()
    ]).finally(() => {
        console.log("[GuaraFood Auto-Update] Caches limpos! Recarregando sistema com as correções...");
        // Adiciona timestamp para furar cache do index.html pelo navegador
        window.location.reload();
    });
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in its child component tree,
 * log those errors, and display a fallback UI.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare the props property to resolve TypeScript error if it fails to infer from React.Component.
  // This is usually implicitly available via `extends Component<ErrorBoundaryProps, ErrorBoundaryState>`.
  public readonly props: Readonly<ErrorBoundaryProps>;
  // Initializing state directly as a class property (modern React/TypeScript syntax)
  // This implicitly calls super(props) with an empty constructor if none is defined,
  // or merges with a constructor's state if present.
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  /**
   * getDerivedStateFromError is called after an error has been thrown in a descendant component.
   * It receives the error that was thrown as a parameter and should return a value to update state.
   */
  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * componentDidCatch is called after an error has been thrown in a descendant component.
   * This is the place to log error information.
   */
  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("GuaraFood Critical Error:", error, errorInfo);
  }

  public render(): ReactNode {
    // FIX: Destructure `children` from `this.props` to resolve TypeScript error "Property 'props' does not exist on type 'ErrorBoundary'".
    const { children } = this.props;
    if (this.state.hasError) {
      const errorMessage = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-orange-600">
            <h1 className="text-2xl font-black text-gray-800 mb-2">Ops! Ocorreu um erro</h1>
            <p className="text-gray-600 mb-6 font-medium">Não foi possível carregar o GuaraFood.</p>
            <div className="bg-red-50 p-4 rounded-xl text-left text-xs font-mono text-red-800 overflow-auto mb-6 max-h-40 border border-red-100">
                {errorMessage}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-600 text-white font-black py-4 px-6 rounded-xl hover:bg-orange-700 transition-all w-full shadow-lg active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // SENIOR MOVE: Cache the root in window to prevent double createRoot calls under hot reload, scripts or nested bundles
  let root = (window as any)._reactRoot;
  if (!root) {
    root = createRoot(rootElement);
    (window as any)._reactRoot = root;
  }
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}