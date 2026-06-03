import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  const painelLink = isAdmin ? '/organizador' : isOrganizer ? '/organizador' : '/atleta';

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <img src="/images/logo-022runner.png" alt="022 RUNNER" className="h-10 w-auto" />
            <div>
              <span className="text-xl font-bold text-blue-600">022</span>
              <span className="text-xl font-bold text-gray-900">RUNNER</span>
              <p className="text-xs text-gray-500">Região dos Lagos - RJ</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">Início</Link>
            <Link to="/eventos" className="text-gray-700 hover:text-blue-600 font-medium">Eventos</Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to={painelLink} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                  <LayoutDashboard size={16} />
                  Painel
                </Link>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{user?.name}</span>
                  <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">Entrar</Link>
            )}
          </nav>

          {/* Hamburger button (mobile) */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="md:hidden mt-3 pb-3 border-t pt-3 flex flex-col gap-1">
            <Link to="/" onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
              Início
            </Link>
            <Link to="/eventos" onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
              Eventos
            </Link>
            {isAuthenticated ? (
              <>
                <Link to={painelLink} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">
                  <LayoutDashboard size={16} /> Painel
                </Link>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-600">{user?.name}</span>
                  <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500 hover:underline">
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white font-medium text-center">
                Entrar
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
