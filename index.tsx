import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/**
 * ErrorBoundary component catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
// Fix: Use React.Component explicitly to ensure proper inheritance and visibility of 'props' and 'state' members.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly initialize state property as a class member.
  public state: ErrorBoundaryState = { hasError: false, error: null };

  // Fix: Static method correctly updates state when an error is caught in the subtree.
  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Access state and props via 'this' instance to resolve inheritance visibility issues.
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Erro desconhecido.';
      if (error) {
          if (error instanceof Error) {
              errorMessage = error.message;
          } else if (typeof error === 'string') {
              errorMessage = error;
          } else {
              try {
                  errorMessage = JSON.stringify(error, null, 2);
              } catch (e) {
                  errorMessage = String(error);
              }
          }
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Algo deu errado</h1>
            <p className="text-gray-700 mb-6">
              Ocorreu um erro inesperado na aplicação.
            </p>
            <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-800 overflow-auto mb-6 max-h-40 border border-gray-300 whitespace-pre-wrap">
                {errorMessage}
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

    // Fix: Return children destructured from this.props.
    return children;
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
