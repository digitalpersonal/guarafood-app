import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Algo deu errado</h1>
            <p className="text-gray-700 mb-6">
              Ocorreu um erro inesperado na aplicação.
            </p>
            <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-800 overflow-auto mb-6 max-h-40 border border-gray-300">
                {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors w-full shadow-md"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);