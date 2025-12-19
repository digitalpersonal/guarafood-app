
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

// Fix: Use Component explicitly from named imports to ensure state and props are correctly inherited and recognized by the TypeScript compiler
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initialize state using a class property initializer for better type inference
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("GuaraFood Critical Error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Accessing state property inherited from Component
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

    // Fix: Accessing props property inherited from Component ensures children is recognized on line 56
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
