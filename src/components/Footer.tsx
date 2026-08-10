import { Link } from 'react-router-dom';
import { SecurityBadges } from './SecurityBadges';
import { SecuritySeal } from './SecuritySeal';

export function Footer() {
  return (
    <footer style={{ backgroundColor: '#000000', color: '#9ca3af' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo + info */}
          <div className="md:col-span-1">
            <img src="/images/logo-022runners.png" alt="022 RUNNER" className="h-12 w-auto mb-3 object-contain" />
            <p className="text-sm leading-relaxed">A plataforma de eventos esportivos da Região dos Lagos — RJ.</p>
            <p className="text-sm mt-2">(22) 97404-4125</p>
            <p className="text-sm">São Pedro da Aldeia - RJ</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/eventos" className="hover:text-white transition-colors">Eventos</Link></li>
              <li><Link to="/ranking" className="hover:text-white transition-colors">Ranking</Link></li>
              <li><Link to="/cadastro" className="hover:text-white transition-colors">Cadastrar-se</Link></li>
            </ul>
          </div>

          {/* Para organizadores */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Organizadores</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/cadastro" className="hover:text-white transition-colors">Criar conta</Link></li>
              <li><Link to="/organizador" className="hover:text-white transition-colors">Painel</Link></li>
              <li><a href="https://wa.me/5522974044125" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Falar com suporte</a></li>
            </ul>
          </div>

          {/* Redes sociais */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Redes Sociais</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook</a></li>
              <li><a href="https://wa.me/5522974044125" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>
            </ul>
          </div>
        </div>

        <div className="mb-6">
          <SecuritySeal />
        </div>

        <div className="mb-6">
          <SecurityBadges />
        </div>

        <div style={{ borderTop: '1px solid #1f2937' }} className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} 022 RUNNER — Todos os direitos reservados</p>
          <p style={{ color: '#C9A84C' }}>Desenvolvido com ❤️ na Região dos Lagos</p>
          <div className="flex gap-4">
            <Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link to="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
