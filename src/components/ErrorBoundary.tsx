import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MetroFlow ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 p-10 text-center">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
              Falha no Módulo
            </h2>
            {this.props.moduleName && (
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full inline-block mb-4">
                {this.props.moduleName}
              </p>
            )}
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              Ocorreu um erro inesperado neste módulo. O restante do sistema permanece estável. Tente recarregar ou volte ao Dashboard.
            </p>

            <div className="flex gap-4 justify-center mb-8">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            <details className="text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <summary className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                Detalhes técnicos (dev)
              </summary>
              <pre className="mt-3 text-[10px] text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-40 overflow-auto">
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

