import { Lock } from 'lucide-react';

// Cópia do SecuritySeal só para a home (o original também está no rodapé e na
// página de pagamento). Único ajuste: emoji de cadeado → ícone SVG. O texto é o
// mesmo, palavra por palavra.
export function HomeSecuritySeal() {
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-xl px-5 py-4 text-center max-w-2xl mx-auto"
      style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
    >
      <Lock size={18} strokeWidth={1.75} className="flex-shrink-0" style={{ color: '#1E40AF' }} aria-hidden="true" />
      <p className="text-sm font-medium leading-relaxed" style={{ color: '#1E40AF' }}>
        Ambiente 100% seguro. Transações processadas pelo Asaas, autorizado pelo Banco Central, com certificação PCI-DSS e +220 mil empresas atendidas.
      </p>
    </div>
  );
}
