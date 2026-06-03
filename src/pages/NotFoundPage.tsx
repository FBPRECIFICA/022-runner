import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ backgroundColor: '#111111' }}>

      {/* Animação corredor CSS */}
      <style>{`
        @keyframes run {
          0%   { transform: translateX(-60px) scaleX(1); }
          49%  { transform: translateX(60px) scaleX(1); }
          50%  { transform: translateX(60px) scaleX(-1); }
          99%  { transform: translateX(-60px) scaleX(-1); }
          100% { transform: translateX(-60px) scaleX(1); }
        }
        .runner { animation: run 2.4s linear infinite; display: inline-block; font-size: 48px; }
      `}</style>

      <div className="runner mb-6">🏃</div>

      {/* 404 */}
      <h1 className="text-9xl font-bold mb-2" style={{ color: '#C9A84C', textShadow: '0 0 40px rgba(201,168,76,0.4)' }}>
        404
      </h1>

      {/* Linha dourada */}
      <div style={{ height: '3px', width: '120px', background: 'linear-gradient(90deg, #C9A84C, #FFD700, #C9A84C)', margin: '0 auto 24px', borderRadius: '99px' }} />

      <h2 className="text-2xl font-bold text-white mb-3">Parece que você saiu da rota!</h2>
      <p className="text-sm mb-8 max-w-sm" style={{ color: '#9ca3af' }}>
        A página que você procura não existe, foi movida ou você perdeu o km marcador. Não desanime — a corrida continua!
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl transition-all duration-200"
        style={{ backgroundColor: '#C9A84C', color: '#000000' }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#B8962E')}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#C9A84C')}
      >
        🏁 Voltar para a corrida
      </Link>

      <p className="text-xs mt-8" style={{ color: '#4b5563' }}>022 RUNNER — Região dos Lagos</p>
    </div>
  );
}
