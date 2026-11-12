// Volta do login Google na inscrição (Rústica, 12/11/2026): a página recarrega no passo
// "conta" e o login fica pronto antes do evento carregar. Antes da correção isso gravava
// com event=null -> "null is not an object (evaluating 'r.id')". Tudo mockado: sem banco, sem Asaas.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => ({
  insert: vi.fn(),
  resolveEvent: null as null | ((v: any) => void),
  distances: [] as any[],
  user: { id: 'user-1', email: 'teste@exemplo.com', name: 'Teste' } as any,
}));

vi.mock('../lib/supabase', () => {
  const result = (table: string, op: string) => {
    if (table === 'events') return new Promise((r) => { h.resolveEvent = r; });
    if (table === 'event_distances') return Promise.resolve({ data: h.distances, error: null });
    if (table === 'registrations' && op === 'insert')
      return Promise.resolve({ data: { id: 'reg-1', base_amount: 100, status: 'pending', registration_number: '001' }, error: null });
    return Promise.resolve({ data: null, error: null, count: 0 });
  };
  const builder = (table: string) => {
    let op = 'select';
    const b: any = {
      then: (ok: any, ko: any) => result(table, op).then(ok, ko),
    };
    for (const m of ['select', 'eq', 'neq', 'order', 'single']) b[m] = () => b;
    b.insert = (row: any) => { op = 'insert'; if (table === 'registrations') h.insert(row); return b; };
    return b;
  };
  return {
    supabase: {
      from: (t: string) => builder(t),
      rpc: () => Promise.resolve({ data: [], error: null }),
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    },
  };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('../lib/kitLots', () => ({
  fetchKitLots: () => Promise.resolve({}),
  withKitLots: (d: any) => d,
  lotLabel: () => '',
  brl: (v: number) => String(v),
}));
vi.mock('../utils/analytics', () => ({ trackRegistrationStart: vi.fn(), trackRegistrationComplete: vi.fn() }));
vi.mock('../components/AccountGate', () => ({ AccountGate: () => <div>account-gate</div> }));
vi.mock('../components/TermoResponsabilidade', () => ({ TermoResponsabilidade: () => null }));
vi.mock('../components/SecurityBadges', () => ({ SecurityBadges: () => null }));
vi.mock('../components/EmailHint', () => ({ EmailHint: () => null }));

import { RegistrationPage } from '../pages/RegistrationPage';

const EVENT = {
  id: 'evt-1', slug: 'rustica', title: 'Rústica', date: '2027-01-10', city: 'Cabo Frio',
  status: 'published', registrations_closed: false, max_participants: null, organizer_id: 'org-1',
};
const KIT_DISTANCES = [{ id: 'd1', name: '5 km', sort_order: 1,
  registration_types: [{ id: 'k1', name: 'Kit Completo', price: 94.9, sort_order: 1, includes_shirt: true }] }];
const DRAFT = {
  name: 'Atleta Teste', cpf: '529.982.247-25', birthdate: '15/09/1985', phone: '(22) 99999-9999',
  email: 'teste@exemplo.com', email_confirm: 'teste@exemplo.com', city: 'Cabo Frio', gender: 'M',
  shirt_size: 'M', distance_index: 0, kit_index: 0, team_name: '', emergency_contact: '', blood_type: '', medical_condition: '',
};

const page = () => (
  <MemoryRouter initialEntries={['/inscricao/rustica']}>
    <Routes><Route path="/inscricao/:eventSlug" element={<RegistrationPage />} /></Routes>
  </MemoryRouter>
);

beforeEach(() => {
  h.insert.mockReset();
  h.resolveEvent = null;
  h.distances = KIT_DISTANCES;
  localStorage.clear();
  // Estado salvo antes de sair para o Google: rascunho + passo "conta".
  localStorage.setItem('reg_form_draft', JSON.stringify(DRAFT));
  localStorage.setItem('reg_form_step', 'conta');
});
afterEach(() => cleanup());

describe('inscrição na volta do login Google', () => {
  it('espera o evento carregar e grava uma vez, sem erro r.id', async () => {
    render(page());
    await act(async () => { await Promise.resolve(); });
    expect(h.insert).not.toHaveBeenCalled(); // evento ainda carregando

    await act(async () => { h.resolveEvent!({ data: EVENT, error: null }); });
    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    expect(h.insert.mock.calls[0][0]).toMatchObject({ event_id: 'evt-1', user_id: 'user-1', registration_type_id: 'k1' });
    expect(screen.queryByText(/is not an object|Cannot read/)).toBeNull();
  });

  it('não grava duas vezes se o login mudar de novo durante a gravação', async () => {
    const { rerender } = render(page());
    await act(async () => { h.resolveEvent!({ data: EVENT, error: null }); });
    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
    h.user = { ...h.user }; // novo objeto de usuário (ex.: token renovado)
    rerender(page());
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(h.insert).toHaveBeenCalledTimes(1);
  });

  it('evento sem distâncias não fica travado esperando', async () => {
    h.distances = [];
    render(page());
    await act(async () => { h.resolveEvent!({ data: EVENT, error: null }); });
    await waitFor(() => expect(h.insert).toHaveBeenCalledTimes(1));
  });
});
