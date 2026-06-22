export function SecurityBadges() {
  const badges = [
    { icon: '🔒', label: 'SSL Seguro' },
    { icon: '💳', label: 'Pagamento Certificado — Asaas' },
    { icon: '🛡️', label: 'LGPD — Dados Protegidos' },
    { icon: '✅', label: 'PIX Oficial — Banco Central' },
  ];

  return (
    <div
      className="flex flex-wrap justify-center gap-3 py-5 px-4 rounded-xl"
      style={{ backgroundColor: '#000', border: '1px solid rgba(201,168,76,0.3)' }}
    >
      {badges.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}
        >
          <span>{b.icon}</span>
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
