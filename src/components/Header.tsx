import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo-022runner.png" alt="022 RUNNER" className="h-10 w-auto" />
            <div>
              <span className="text-xl font-bold text-blue-600">022</span>
              <span className="text-xl font-bold text-gray-900">RUNNER</span>
              <p className="text-xs text-gray-500">Região dos Lagos - RJ</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">Início</Link>
            <Link to="/eventos" className="text-gray-700 hover:text-blue-600 font-medium">Eventos</Link>
            <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">Entrar</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
