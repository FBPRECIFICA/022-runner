import { supabase } from './supabase';

// Lote vigente de cada kit, calculado no banco (get_event_kit_lots) a partir de
// registration_types.lots — a mesma regra que precifica a inscrição no servidor.
export interface KitLot {
  registration_type_id: string;
  lot_number: number;
  lot_count: number;
  lot_price: number;
  lot_remaining: number | null; // null = sem limite
  sold: number;
  capacity: number | null;      // null = sem limite
  sold_out: boolean;
  next_price: number | null;
}

export async function fetchKitLots(eventId: string): Promise<Record<string, KitLot>> {
  const { data, error } = await supabase.rpc('get_event_kit_lots', { p_event_id: eventId });
  if (error) { console.error('get_event_kit_lots falhou', error); return {}; }
  return Object.fromEntries((data || []).map((l: KitLot) => [l.registration_type_id, {
    ...l, lot_price: Number(l.lot_price), next_price: l.next_price == null ? null : Number(l.next_price),
  }]));
}

// Troca o price de cada kit pelo preço do lote vigente e anexa `lot` — assim todo
// lugar que já lê kit.price passa a mostrar o valor certo.
export function withKitLots<D extends { registration_types?: any[] }>(distances: D[], lots: Record<string, KitLot>): D[] {
  return distances.map(d => ({
    ...d,
    registration_types: (d.registration_types || []).map((k: any) => {
      const lot = lots[k.id];
      return lot ? { ...k, price: lot.lot_price, lot } : k;
    }),
  }));
}

export const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

// Rótulo público do kit: "2º lote" / "Esgotado". Nunca mostra quantas vagas
// restam (pedido 11/11/2026) — esse número só aparece no painel do organizador
// e no Admin (KitLotsSummary).
export function lotLabel(lot?: KitLot | null): string {
  if (!lot) return '';
  if (lot.sold_out) return 'Esgotado';
  return lot.lot_count > 1 ? `${lot.lot_number}º lote` : '';
}
