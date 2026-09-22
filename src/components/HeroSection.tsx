import { Link } from 'react-router-dom';

const HERO_PHRASE = 'Sua evolução começa aqui.';

function HeroWords({ className }: { className: string }) {
  return (
    <h1 className={className}>
      {HERO_PHRASE.split(' ').map((word, i) => (
        // Espaço FORA do inline-block: um espaço à direita colado na borda de um
        // inline-block é tratado como whitespace de fim-de-linha e some no render.
        <span key={i}>
          <span className="hero-word" style={{ animationDelay: `${i * 0.09}s` }}>{word}</span>{' '}
        </span>
      ))}
    </h1>
  );
}

export function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white overflow-hidden">
      {/* Foto mobile e desktop são recortes diferentes da mesma cena — trocadas
          via breakpoint, não redimensionadas, pra cada uma ficar bem enquadrada.
          bg-top no mobile (não bg-center): a foto é um retrato alto com céu vazio
          em cima e os atletas ocupando a faixa do meio pra baixo — bg-center
          cortava boa parte desse céu vazio, sobrando pouquíssimo espaço real sem
          gente/bike pra frase não tampar ninguém (pedido Leandro, ainda tampava
          mesmo com o texto já em cima). bg-top preserva o céu inteiro no topo. */}
      <div
        className="absolute inset-0 bg-cover bg-top md:hidden hero-kenburns"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/hero-mobile.jpg')" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center hidden md:block hero-kenburns"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/hero-desktop.jpg')" }}
      />

      {/* Desktop: bloco original, centralizado pelo flex da section, sem
          nenhuma classe alterada. */}
      <div className="hidden md:block container mx-auto px-4 relative">
        <HeroWords className="text-7xl font-bold mb-4" />
        <p className="text-2xl mb-12 max-w-2xl mx-auto">
          A plataforma de eventos esportivos da Região dos Lagos — RJ
        </p>
        <div className="flex gap-4 justify-center">
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

      {/* Mobile: texto ancorado no topo da SECTION (position: absolute, não
          depende do centralizado flex nem de cálculo de vh do navegador —
          mesmo padrão determinístico usado nos botões abaixo), dentro do
          espaço vazio (céu) que o bg-top acima garante. */}
      <div className="md:hidden absolute inset-x-4 top-6 text-center">
        <HeroWords className="text-2xl font-bold mb-2" />
        <p className="text-sm">
          A plataforma de eventos esportivos da Região dos Lagos — RJ
        </p>
      </div>

      {/* Mobile: botões pequenos bem nos cantos inferiores da foto, ancorados
          na section. bottom-32: o mais baixo que dá sem colidir com o botão
          flutuante do LEO (canto direito, fixed — sobe/desce com a altura da
          tela, já que a section usa 70vh mas o LEO usa offset fixo em px, a
          folga entre os dois muda por aparelho). Testado em 3 alturas de tela
          mobile (667/844/915px): bottom-8 e bottom-16 colidiam com o LEO nas
          telas mais baixas (ex. 667px), bottom-32 é o primeiro valor limpo
          nas três. Não descer mais sem retestar em telas baixas. */}
      <div className="md:hidden absolute inset-x-4 bottom-32 flex flex-row justify-between gap-2">
        <Link
          to="/eventos"
          className="bg-[#C9A84C] hover:bg-[#B8962E] text-white px-3 py-2 rounded-lg font-semibold transition-colors text-xs"
        >
          Ver Eventos
        </Link>
        <Link
          to="/cadastro"
          className="bg-white text-[#C9A84C] hover:bg-gray-100 px-3 py-2 rounded-lg font-semibold transition-colors text-xs"
        >
          Cadastre-se Grátis
        </Link>
      </div>
    </section>
  );
}
