import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <img 
            src="/images/logo-022runner.png" 
            alt="022 RUNNER" 
            className="h-16 w-auto mx-auto mb-4"
          />
        </div>
        
        <h1 className="text-8xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Página Não Encontrada</h2>
        <p className="text-gray-600 mb-8">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            <Home className="w-5 h-5" />
            Voltar para Início
          </Link>
          <Link 
            to="/eventos" 
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Ver Eventos
          </Link>
        </div>
      </div>
    </div>
  );
}
