import { Link } from 'react-router-dom';

const HERO_PHRASE = 'Sua evolução começa aqui.';

export function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white overflow-hidden">
      {/* Foto mobile e desktop são recortes diferentes da mesma cena — trocadas
          via breakpoint, não redimensionadas, pra cada uma ficar bem enquadrada. */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden hero-kenburns"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/hero-mobile.jpg')" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center hidden md:block hero-kenburns"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/hero-desktop.jpg')" }}
      />
      <div className="container mx-auto px-4 relative">
        <h1 className="text-5xl md:text-7xl font-bold mb-4">
          {HERO_PHRASE.split(' ').map((word, i) => (
            // Espaço FORA do inline-block: um espaço à direita colado na borda de um
            // inline-block é tratado como whitespace de fim-de-linha e some no render.
            <span key={i}>
              <span className="hero-word" style={{ animationDelay: `${i * 0.09}s` }}>{word}</span>{' '}
            </span>
          ))}
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
          A plataforma de eventos esportivos da Região dos Lagos — RJ
        </p>
        <p className="text-lg mb-12 max-w-3xl mx-auto">
          Encontre e participe de corridas, trails, maratonas e muito mais! 
          Assistente IA para organizadores, landing pages automáticas, marketing integrado e score de qualidade.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/eventos" 
            className="bg-[#C9A84C] hover:bg-[#B8962E] text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
          >
            Ver Eventos
          </Link>
          <Link 
            to="/cadastro" 
            className="bg-white text-[#C9A84C] hover:bg-gray-100 px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
          >
            Cadastre-se Grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
