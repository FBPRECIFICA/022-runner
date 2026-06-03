import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo-022runner.png" alt="022 RUNNER" className="h-8 w-auto" />
            <p className="text-sm">© 2027 022 RUNNER - Todos os direitos reservados</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/" className="hover:text-white">Início</Link>
            <Link to="/eventos" className="hover:text-white">Eventos</Link>
            <Link to="/contato" className="hover:text-white">Contato</Link>
            <span>(22) 97404-4125 - São Pedro da Aldeia - RJ</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
