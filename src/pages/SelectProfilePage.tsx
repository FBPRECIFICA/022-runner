import { useNavigate } from 'react-router-dom';

const OPTIONS = [
  {
    key: 'athlete',
    icon: '🏃',
    label: 'Atleta',
    subtitle: 'Quero participar de eventos',
    bullets: ['Inscreva-se em corridas e trails', 'Acompanhe suas inscrições', 'Veja seu ranking e histórico'],
    action: '/cadastro?role=athlete',
    cta: 'Criar conta de Atleta',
    color: '#2563EB',
  },
  {
    key: 'organizer',
    icon: '🎯',
    label: 'Organizador',
    subtitle: 'Quero criar e gerenciar eventos',
    bullets: ['Publique eventos em minutos', 'Gerencie inscrições e check-in', 'Relatórios e exportação Excel'],
    action: '/cadastro?role=organizer',
    cta: 'Criar conta de Organizador',
    color: '#C9A84C',
  },
  {
    key: 'admin',
    icon: '⚙️',
    label: 'Administrador',
    subtitle: 'Acesso administrativo à plataforma',
    bullets: ['Visão completa de todos os dados', 'Gestão de usuários e eventos', 'Analytics e financeiro'],
    action: '/login',
    cta: 'Fazer login',
    color: '#1a1a1a',
  },
];

export function SelectProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#000', borderBottom: '3px solid #C9A84C', padding: '20px', textAlign: 'center' }}>
        <img src="/images/logo-022runners.png" alt="022 RUNNER"
          style={{ height: '56px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Bem-vindo à 022 RUNNER</h1>
          <p style={{ color: '#9ca3af' }}>Selecione seu perfil para começar</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {OPTIONS.map(opt => (
            <div
              key={opt.key}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
            >
              {/* Card top */}
              <div className="p-6 flex flex-col items-center text-center border-b" style={{ borderColor: '#333' }}>
                <div className="text-5xl mb-3">{opt.icon}</div>
                <h2 className="text-xl font-bold text-white mb-1">{opt.label}</h2>
                <p className="text-sm" style={{ color: '#9ca3af' }}>{opt.subtitle}</p>
              </div>

              {/* Bullets */}
              <div className="p-5 flex-1">
                <ul className="space-y-2">
                  {opt.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#d1d5db' }}>
                      <span style={{ color: '#C9A84C', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => navigate(opt.action)}
                  className="w-full font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:opacity-90"
                  style={{
                    backgroundColor: opt.color,
                    color: opt.key === 'organizer' ? '#000' : '#fff',
                  }}
                >
                  {opt.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm" style={{ color: '#6b7280' }}>
          Já tem conta?{' '}
          <button onClick={() => navigate('/login')} className="font-semibold" style={{ color: '#C9A84C' }}>
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}
