import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HERO_INTENSITY } from './homeFlags';

const HERO_PHRASE = 'Sua evolução começa aqui.';

// Mesmas fotos e mesmo enquadramento do HeroSection original (mobile bg-top,
// desktop bg-center) — ver comentários lá sobre o porquê.
const PHOTOS = [
  { cls: 'bg-top md:hidden', url: '/images/hero-mobile.jpg' },
  { cls: 'bg-center hidden md:block', url: '/images/hero-desktop.jpg' },
];

// Posição vertical (%) e velocidade relativa de cada linha de velocidade.
const SPEED_LINES = [
  [18, 1.4], [27, 0.8], [41, 1.9], [55, 1.1], [63, 2.3], [72, 0.9], [81, 1.6], [88, 1.2],
] as const;

function Words({ className }: { className: string }) {
  return (
    <h1 className={className}>
      {HERO_PHRASE.split(' ').map((word, i) => (
        <span key={i}>
          <span className="hh-word-mask">
            <span className="hh-word" style={{ animationDelay: `${0.08 + i * 0.11}s` }}>{word}</span>
          </span>{' '}
        </span>
      ))}
    </h1>
  );
}

function Buttons({ size }: { size: 'lg' | 'sm' }) {
  const base = size === 'lg' ? 'px-8 py-4 rounded-xl text-lg' : 'px-3 py-2 rounded-lg text-xs';
  return (
    <>
      <Link to="/eventos" className={`hh-btn bg-[#C9A84C] hover:bg-[#B8962E] text-white font-semibold ${base}`}>
        Ver Eventos
      </Link>
      <Link to="/cadastro" className={`hh-btn bg-white text-[#C9A84C] hover:bg-gray-100 font-semibold ${base}`}>
        Cadastre-se Grátis
      </Link>
    </>
  );
}

export function HomeHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  // Rolagem → variável CSS --p (0 a 1) no palco fixo. Todo o movimento é calc()
  // sobre --p no CSS, só transform/opacity. Um único listener com rAF.
  useEffect(() => {
    const wrap = wrapRef.current, stage = stageRef.current;
    if (!wrap || !stage) return;
    if (HERO_INTENSITY <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let top = 0, pin = 0, frame = 0;
    const measure = () => {
      // O cabeçalho é sticky e tem altura variável (logo escala com a largura):
      // o palco gruda logo abaixo dele, onde a seção começa na página.
      top = wrap.getBoundingClientRect().top + window.scrollY;
      pin = Math.round(stage.offsetHeight * 0.6 * Math.min(HERO_INTENSITY, 2));
      stage.style.top = `${top}px`;
      wrap.style.height = `${stage.offsetHeight + pin}px`;
      update();
    };
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / pin));
      stage.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <section
        ref={stageRef}
        className="hh-stage sticky h-[70vh] min-h-[500px] flex items-center justify-center text-center text-white overflow-hidden bg-black"
        style={{ ['--i' as string]: HERO_INTENSITY }}
      >
        {PHOTOS.map(ph => (
          <div key={ph.url} className={`hh-photo-in absolute inset-0 ${ph.cls}`}>
            <div className="hh-photo absolute inset-0 bg-cover" style={{ backgroundImage: `url('${ph.url}')`, backgroundPosition: 'inherit' }} />
            {/* Rastro: a mesma foto esticada na horizontal, aparecendo com a
                rolagem — simula desfoque de movimento sem animar filter. */}
            <div className="hh-smear absolute inset-0 bg-cover" style={{ backgroundImage: `url('${ph.url}')`, backgroundPosition: 'inherit' }} aria-hidden="true" />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/40" />

        <div className="hh-lines absolute inset-0 pointer-events-none" aria-hidden="true">
          {SPEED_LINES.map(([y, v], i) => (
            <span key={i} className="hh-line" style={{ top: `${y}%`, ['--v' as string]: v, animationDelay: `${0.35 + i * 0.05}s` }} />
          ))}
        </div>

        <div className="hh-copy hidden md:block container mx-auto px-4 relative">
          <Words className="text-7xl font-bold mb-4 tracking-tight" />
          <p className="hh-after text-2xl mb-12 max-w-2xl mx-auto" style={{ animationDelay: '0.55s' }}>
            A plataforma de eventos esportivos da Região dos Lagos — RJ
          </p>
          <div className="hh-after flex gap-4 justify-center" style={{ animationDelay: '0.68s' }}>
            <Buttons size="lg" />
          </div>
        </div>

        {/* Mobile: mesma ancoragem do original (texto no céu, botões em
            bottom-32 para não colidir com o LEO — ver HeroSection). */}
        <div className="hh-copy md:hidden absolute inset-x-4 top-6 text-center">
          <Words className="text-[1.75rem] leading-tight font-bold mb-2 tracking-tight" />
          <p className="hh-after text-sm" style={{ animationDelay: '0.55s' }}>
            A plataforma de eventos esportivos da Região dos Lagos — RJ
          </p>
        </div>
        <div className="hh-after md:hidden absolute inset-x-4 bottom-32 flex flex-row justify-between gap-2" style={{ animationDelay: '0.68s' }}>
          <Buttons size="sm" />
        </div>
      </section>
    </div>
  );
}
