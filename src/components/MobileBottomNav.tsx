import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Search, User } from 'lucide-react';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/eventos', icon: Calendar, label: 'Eventos' },
  { to: '/buscar', icon: Search, label: 'Buscar' },
  { to: '/atleta', icon: User, label: 'Perfil' },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
      style={{ backgroundColor: '#000', borderColor: '#C9A84C' }}>
      {TABS.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
        return (
          <Link key={to} to={to}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            style={{ color: active ? '#C9A84C' : '#6b7280' }}>
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
