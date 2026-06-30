import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
    if (error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('dynamically imported module') ||
        error.message?.includes('Loading chunk')) {
      window.location.reload();
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-md w-full">
            <h2 className="text-lg font-bold text-red-600 mb-2">Erro ao carregar a página</h2>
            <p className="text-sm text-gray-600 mb-4 font-mono bg-red-50 p-3 rounded-lg break-all">
              {error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full bg-[#C9A84C] text-white font-semibold py-3 rounded-xl hover:bg-[#B8962E]"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
