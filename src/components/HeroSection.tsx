import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section 
      className="relative bg-cover bg-center h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white"
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/hero-bg.jpg')" }}
    >
      <div className="container mx-auto px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-4">022 RUNNER</h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
          Plataforma de Eventos Esportivos da Região dos Lagos - RJ
        </p>
        <p className="text-lg mb-12 max-w-3xl mx-auto">
          Encontre e participe de corridas, trails, maratonas e muito mais! 
          Assistente IA para organizadores, landing pages automáticas, marketing integrado e score de qualidade.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/eventos" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
          >
            Ver Eventos
          </Link>
          <Link 
            to="/cadastro" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
          >
            Cadastre-se Grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
