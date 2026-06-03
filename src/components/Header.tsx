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
    <div className="sticky top-0 z-50">
      {/* CAMADA 1 — fundo preto com logo */}
      <div
        className="w-full flex items-center"
        style={{ backgroundColor: '#000000', borderBottom: '2px solid #C9A84C', height: '70px', padding: 0 }}
      >
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          style={{ flex: 1, display: 'block', backgroundColor: '#000000', lineHeight: 0 }}
        >
          <img
            src="/images/logo-022runner.png"
            alt="022 RUNNER"
            style={{
              width: '100%',
              maxWidth: '500px',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              padding: '8px 60px',
              boxSizing: 'border-box',
              backgroundColor: '#000000',
              mixBlendMode: 'normal',
              filter: 'brightness(1)',
            }}
          />
        </Link>

        {/* Hamburger — mobile only */}
        <button
          className="md:hidden p-3 rounded transition-colors duration-200 flex-shrink-0"
          style={{ color: '#ffffff', backgroundColor: '#000000' }}
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* CAMADA 2 — menu branco (desktop) */}
      <div
        className="w-full bg-white hidden md:flex items-center justify-center"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '48px' }}
      >
        <nav
          className="flex items-center gap-6"
          style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px', color: '#111111' }}
        >
          <NavLink to="/">Home</NavLink>
          <NavLink to="/eventos">Eventos</NavLink>

          <span style={{ color: '#C9A84C', fontSize: '20px', lineHeight: 1, opacity: 0.6 }}>|</span>

          {isAuthenticated ? (
            <>
              <NavLink to={painelLink}>
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard size={14} /> Painel
                </span>
              </NavLink>
              <span style={{ color: '#555555', fontSize: '14px' }}>{user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 transition-colors duration-200 hover:text-red-500"
                style={{ fontWeight: 500, fontSize: '14px', color: '#111111' }}
              >
                <LogOut size={14} /> Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <Link
                to="/cadastro"
                className="px-4 py-1.5 rounded text-white text-sm font-medium transition-opacity duration-200 hover:opacity-90"
                style={{ backgroundColor: '#C9A84C', fontSize: '14px', fontWeight: 500 }}
              >
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden bg-white flex flex-col"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px' }}
        >
          <MobileLink to="/" onClick={() => setMobileOpen(false)}>Home</MobileLink>
          <MobileLink to="/eventos" onClick={() => setMobileOpen(false)}>Eventos</MobileLink>

          <div style={{ height: '1px', backgroundColor: '#f0e6c8', margin: '4px 16px' }} />

          {isAuthenticated ? (
            <>
              <MobileLink to={painelLink} onClick={() => setMobileOpen(false)}>
                <span className="flex items-center gap-2"><LayoutDashboard size={14} /> Painel</span>
              </MobileLink>
              <div className="px-4 py-3 flex items-center justify-between">
                <span style={{ color: '#555555', fontSize: '13px' }}>{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-red-500 text-sm"
                >
                  <LogOut size={13} /> Sair
                </button>
              </div>
            </>
          ) : (
            <>
              <MobileLink to="/login" onClick={() => setMobileOpen(false)}>Entrar</MobileLink>
              <div className="px-4 py-3">
                <Link
                  to="/cadastro"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: '#C9A84C' }}
                >
                  Cadastrar
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="relative group flex items-center transition-colors duration-200"
      style={{ color: '#111111', paddingBottom: '2px' }}
    >
      {children}
      <span
        className="absolute bottom-0 left-0 w-0 group-hover:w-full transition-all duration-200"
        style={{ height: '2px', backgroundColor: '#C9A84C' }}
      />
    </Link>
  );
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-3 transition-colors duration-200 hover:bg-gray-50"
      style={{ color: '#111111' }}
    >
      {children}
    </Link>
  );
}
