import { DollarSign, Percent, Landmark, TrendingUp } from 'lucide-react';

// Os "4 números" de auditoria, sempre juntos e na mesma ordem, em qualquer tela que mostre
// dinheiro de um evento (painel Organizador, painel Admin, PDF de Auditoria) — ver
// src/lib/asaasFee.ts (auditFigures/sumAuditFigures) pra fonte única de cálculo.
interface Props {
  bruto: number;
  comissao: number;
  taxaAsaas: number;
  liquido: number;
  dark?: boolean;
  className?: string;
}

const fmt = (n: number) => `${n < 0 ? '-' : ''}R$ ${Math.abs(n).toFixed(2).replace('.', ',')}`;

export function AuditFourNumbers({ bruto, comissao, taxaAsaas, liquido, dark, className }: Props) {
  const items = [
    { label: 'Bruto (pago pelo atleta, − estornos)', value: bruto, color: '#C9A84C', icon: <DollarSign size={16} /> },
    { label: '(−) Comissão da Plataforma', value: comissao, color: '#f87171', icon: <Percent size={16} /> },
    { label: '(−) Taxa Asaas (real)', value: taxaAsaas, color: '#fbbf24', icon: <Landmark size={16} /> },
    { label: '(=) Líquido do Organizador', value: liquido, color: '#22c55e', icon: <TrendingUp size={16} /> },
  ];
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className ?? ''}`}>
      {items.map(it => (
        <div
          key={it.label}
          className="rounded-xl p-4"
          style={dark ? { backgroundColor: '#0f172a' } : { backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-2 mb-1" style={{ color: it.color }}>
            {it.icon}
            <span className="text-xs font-medium" style={{ color: dark ? '#94a3b8' : '#6b7280' }}>{it.label}</span>
          </div>
          <p className="text-lg font-bold" style={{ color: it.color }}>{fmt(it.value)}</p>
        </div>
      ))}
    </div>
  );
}
