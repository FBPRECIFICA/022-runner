import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, Menu, X, Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const { user, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchQ, setSearchQ] = useState('');
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/buscar?q=${encodeURIComponent(searchQ.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  const painelLink = isAdmin ? '/organizador' : isOrganizer ? '/organizador' : '/atleta';

  return (
    <div className="sticky top-0 z-50">
      {/* CAMADA 1 — logo banner */}
      <div style={{ backgroundColor: '#000', width: '100%', padding: 0, margin: 0, overflow: 'hidden', position: 'relative' }}>
        <Link to="/" onClick={() => setMobileOpen(false)} style={{ display: 'block', lineHeight: 0 }}>
          <img
            src="/images/logo-022runner.png"
            alt="022 RUNNERS"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '110px',
              objectFit: 'contain',
              display: 'block',
              background: '#000',
            }}
          />
        </Link>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9A84C, #FFD700, #C9A84C)' }} />

        {/* Hamburger — mobile only */}
        <button
          className="md:hidden"
          style={{
            position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)',
            color: '#ffffff', background: 'rgba(0,0,0,0.5)', border: 'none',
            borderRadius: '6px', padding: '6px', cursor: 'pointer',
          }}
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
          <NavLink to="/ranking">Ranking</NavLink>
          <NavLink to="/equipes">Equipes</NavLink>

          {/* Busca inline */}
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none w-36"
                style={{ borderColor: '#d1d5db', fontSize: '13px' }}
                placeholder="Buscar..." />
            </div>
          </form>

          <span style={{ color: '#C9A84C', fontSize: '20px', lineHeight: 1, opacity: 0.6 }}>|</span>

          {isAuthenticated ? (
            <>
              <NavLink to={painelLink}>
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard size={14} /> Painel
                </span>
              </NavLink>
              <NotificationBell />
              <Link to="/perfil" style={{ color: '#555555', fontSize: '14px' }}>{user?.name}</Link>
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
          <MobileLink to="/ranking" onClick={() => setMobileOpen(false)}>Ranking</MobileLink>

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
