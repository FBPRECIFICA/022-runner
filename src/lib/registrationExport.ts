import * as XLSX from 'xlsx';
import { GENDER_LABELS, EXPORT_STATUS_LABELS } from './athleteStats';

// Export Excel de inscritos — fonte única pro painel do Organizador e do Admin (antes eram
// duas cópias do mesmo mapa de colunas). O organizador escolhe as colunas no modal; a ordem
// na planilha é sempre a desta lista.

export type ExportStatusFilter = 'all' | 'paid' | 'pending' | 'cancelled';
export const EXPORT_STATUS_OPTIONS: { value: ExportStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Apenas Pagos/Confirmados' },
  { value: 'pending', label: 'Apenas Pendentes/Aguardando' },
  { value: 'cancelled', label: 'Apenas Cancelados' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = { PIX: 'PIX', CREDIT_CARD: 'Cartão de crédito', BOLETO: 'Boleto' };

const brDate = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const money = (v: unknown) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));

// Idade no dia da prova (é o que define faixa etária da premiação), não a de hoje.
function ageAt(birth: string | null | undefined, onDate: string | null | undefined): number | '' {
  if (!birth) return '';
  const ref = onDate ? new Date(onDate) : new Date();
  const [y, m, d] = birth.slice(0, 10).split('-').map(Number);
  let age = ref.getFullYear() - y;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) age--;
  return age;
}

// includes_shirt vem do kit vinculado (fonte da verdade); quando não há vínculo, cai pro nome
// do kit em texto — nunca assume que inclui camisa.
const includesShirt = (r: any) => (r.registration_types
  ? r.registration_types.includes_shirt
  : !(r.registration_type_name || '').toLowerCase().includes('econ'));

type Column = { key: string; label: string; default: boolean; value: (r: any, event: any) => unknown };

export const EXPORT_COLUMNS: Column[] = [
  { key: 'name', label: 'Nome Completo', default: true, value: r => r.full_name || r.name },
  { key: 'birth_date', label: 'Data de Nascimento', default: false, value: r => brDate(r.birth_date) },
  { key: 'age', label: 'Idade (no dia da prova)', default: false, value: (r, ev) => ageAt(r.birth_date, ev?.date) },
  { key: 'gender', label: 'Sexo', default: false, value: r => GENDER_LABELS[r.gender] || r.gender || '' },
  { key: 'team', label: 'Equipe', default: true, value: r => r.team_name || '' },
  { key: 'bib', label: 'Nº Peito', default: true, value: r => r.registration_number || '' },
  { key: 'category', label: 'Categoria', default: true, value: r => r.distance_name || '' },
  { key: 'distance', label: 'Distância', default: false, value: r => r.distance_name || '' },
  { key: 'kit', label: 'Kit', default: false, value: r => (includesShirt(r) ? 'Completo' : 'Econômico') },
  { key: 'shirt', label: 'Tamanho de Camisa', default: true, value: r => (includesShirt(r) ? r.shirt_size || '' : '') },
  { key: 'cpf', label: 'CPF', default: false, value: r => r.cpf || r.document || '' },
  { key: 'phone', label: 'Telefone', default: false, value: r => r.phone || '' },
  { key: 'email', label: 'E-mail', default: false, value: r => r.email || '' },
  { key: 'city', label: 'Cidade', default: false, value: r => r.city || '' },
  { key: 'emergency', label: 'Contato de Emergência', default: false, value: r => r.emergency_contact || '' },
  { key: 'blood', label: 'Tipo Sanguíneo', default: false, value: r => r.blood_type || '' },
  { key: 'medical', label: 'Condição Médica', default: false, value: r => r.medical_condition || '' },
  { key: 'status', label: 'Status', default: true, value: r => EXPORT_STATUS_LABELS[r.status] || r.status },
  { key: 'payment_method', label: 'Forma de Pagamento', default: false, value: r => PAYMENT_METHOD_LABELS[r.payment_method] || r.payment_method || '' },
  { key: 'coupon', label: 'Cupom', default: false, value: r => r.coupon_code || '' },
  { key: 'amount', label: 'Valor Pago (R$)', default: false, value: r => money(r.amount) },
  { key: 'created_at', label: 'Data de Inscrição', default: false, value: r => brDate(r.created_at) },
  { key: 'paid_at', label: 'Data de Pagamento', default: false, value: r => brDate(r.paid_at) },
  // Coluna vazia no fim pra marcar à mão na entrega de kit (formato do Leandro, commit 687d2598).
  { key: 'blank', label: 'Coluna em branco (anotação à mão)', default: true, value: () => '' },
];

export const DEFAULT_EXPORT_COLUMNS = EXPORT_COLUMNS.filter(c => c.default).map(c => c.key);

// Escolha de colunas lembrada por navegador — só conveniência, sem ela volta pro padrão.
const LS_KEY = '022runners.exportColumns';
export function loadExportColumns(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (Array.isArray(saved)) return saved.filter(k => EXPORT_COLUMNS.some(c => c.key === k));
  } catch { /* storage indisponível */ }
  return DEFAULT_EXPORT_COLUMNS;
}
export function saveExportColumns(keys: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(keys)); } catch { /* storage indisponível */ }
}

export function matchesStatusFilter(status: string, filter: ExportStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'paid') return status === 'paid' || status === 'confirmed';
  if (filter === 'pending') return status === 'pending' || status === 'awaiting_payment';
  return status === 'cancelled';
}

// Gera e baixa o .xlsx. Retorna quantas linhas saíram (0 = nada no filtro, nada baixado).
export function downloadRegistrationsExcel(regs: any[], event: any, columnKeys: string[]): number {
  const cols = EXPORT_COLUMNS.filter(c => columnKeys.includes(c.key));
  if (regs.length === 0 || cols.length === 0) return 0;
  const rows = regs.map(r => Object.fromEntries(cols.map(c => [c.key === 'blank' ? ' ' : c.label, c.value(r, event)])));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `inscritos-${event.slug}-${date}.xlsx`);
  return rows.length;
}
