import React, { Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/**
 * ErrorBoundary component catches JavaScript errors anywhere in their child component tree.
 */
// Fix: Using Component directly and explicitly declaring state/props to satisfy TypeScript's inheritance checks
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state and props properties because the compiler is failing to recognize them via inheritance on the 'ErrorBoundary' type
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  // Fix: Corrected constructor to ensure properties are properly initialized and super() is called with props
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Accessing state inherited from Component via declared property which resolves the 'Property does not exist' errors
    if (this.state.hasError) {
      let errorMessage = 'Erro desconhecido.';
      if (this.state.error) {
          if (this.state.error instanceof Error) {
              errorMessage = this.state.error.message;
          } else {
              errorMessage = String(this.state.error);
          }
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border-t-8 border-red-600">
            <h1 className="text-3xl font-black text-red-600 mb-4">Algo deu errado</h1>
            <p className="text-gray-700 mb-6 font-medium">Ocorreu um erro inesperado no aplicativo.</p>
            <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-800 overflow-auto mb-6 max-h-40 border border-gray-300 whitespace-pre-wrap">
                {errorMessage}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors w-full shadow-md active:scale-95"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    // Fix: Accessing props.children which is now correctly recognized by the compiler
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}