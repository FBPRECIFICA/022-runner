import { useState, useRef } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface Props {
  registration: {
    id: string;
    name: string;
    cpf: string;
    birthdate: string;
    gender: string;
    distanceName: string;
    city: string;
    phone: string;
    email: string;
  };
  event: { id: string; title: string };
  userId: string;
  onAccepted: () => void;
}

export function TermoResponsabilidade({ registration, event, userId, onAccepted }: Props) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) setScrolledToBottom(true);
  };

  const handleAccept = () => {
    if (!accepted) return;
    onAccepted();
  };

  const now = new Date().toLocaleString('pt-BR');

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={20} style={{ color: '#C9A84C' }} />
        <h2 className="font-bold text-gray-900">Termo de Responsabilidade</h2>
      </div>

      {/* Scroll obrigatório */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="border rounded-xl p-4 text-sm text-gray-700 leading-relaxed overflow-y-auto mb-4"
        style={{ maxHeight: 280, borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
      >
        <p className="font-bold text-center mb-3 text-gray-900">TERMO DE RESPONSABILIDADE — 022 RUNNER</p>

        <p>Eu, <strong>{registration.name}</strong>, data de nascimento: {registration.birthdate || '—'}, sexo: {registration.gender === 'M' ? 'Masculino' : registration.gender === 'F' ? 'Feminino' : 'Outro'}, CPF: {registration.cpf}</p>
        <p>Modalidade: <strong>{registration.distanceName}</strong></p>
        <p>Cidade: {registration.city} | Telefone: {registration.phone} | E-mail: {registration.email}</p>

        <p className="mt-4 font-semibold">DECLARAÇÃO:</p>
        <p className="mt-2">Declaro que minha participação no evento <strong>"{event.title}"</strong>, organizado pela plataforma 022 RUNNER, ocorre por livre e espontânea vontade, isentando de quaisquer responsabilidades por acidentes que venha a sofrer os organizadores, patrocinadores e promotores, em meu nome e de meus herdeiros ou sucessores.</p>

        <p className="mt-3">Declaro estar em boas condições físicas e médicas para participar e que estou adequadamente preparado para esta prova. Assumo quaisquer despesas médicas e hospitalares decorrentes de acidentes que porventura venham a ocorrer durante o evento, caso a comissão organizadora julgue necessário.</p>

        <p className="mt-3">Autorizo a veiculação da minha imagem em televisão, jornais, redes sociais ou qualquer outro tipo de mídia relacionada a este evento ou ao esporte em geral.</p>

        <p className="mt-3">Declaro ter lido e concordado com o regulamento completo do evento disponível na plataforma 022 RUNNER.</p>

        <p className="mt-4 font-semibold">POLÍTICA DE CANCELAMENTO:</p>
        <p className="mt-2">Em caso de cancelamento da inscrição solicitado pelo atleta com <strong>7 (sete) dias ou mais</strong> de antecedência em relação à data do evento, fica assegurado o estorno integral do valor pago. Em caso de cancelamento solicitado com <strong>menos de 7 (sete) dias</strong> de antecedência, o valor a ser estornado corresponderá ao montante pago, descontada a taxa de processamento de pagamento (Asaas) já incorrida na respectiva transação. Esta política se aplica a todos os eventos disponibilizados na plataforma 022 RUNNER, independentemente do organizador.</p>

        <p className="mt-4 text-xs text-gray-400">Assinado digitalmente em: {now} — Plataforma: 022runners.com.br</p>
      </div>

      {!scrolledToBottom && (
        <p className="text-xs text-amber-600 mb-3 font-medium">⬇ Role até o final para habilitar a aceitação</p>
      )}

      {/* Checkbox */}
      <label className={`flex items-start gap-3 cursor-pointer mb-4 ${!scrolledToBottom ? 'opacity-40 pointer-events-none' : ''}`}>
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
          className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <span className="text-sm text-gray-700 font-medium">Li, compreendi e aceito os termos acima, incluindo a isenção de responsabilidade dos organizadores.</span>
      </label>

      <button
        onClick={handleAccept}
        disabled={!accepted}
        className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm disabled:opacity-50"
        style={{ backgroundColor: '#C9A84C', color: '#000' }}
      >
        <CheckCircle size={18} />
        Aceitar e Continuar
      </button>
    </div>
  );
}
