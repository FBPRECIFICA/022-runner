import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchKitLots, brl, type KitLot } from '../lib/kitLots';

// Por kit: vendidos / vagas e lote atual — mesmos números que o banco usa pra
// precificar a próxima inscrição (get_event_kit_lots).
export function KitLotsSummary({ eventId, refreshKey }: { eventId: string; refreshKey?: unknown }) {
  const [rows, setRows] = useState<{ id: string; distance: string; kit: string; lot?: KitLot }[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('event_distances').select('name, sort_order, registration_types(id, name, sort_order)').eq('event_id', eventId).order('sort_order'),
      fetchKitLots(eventId),
    ]).then(([{ data }, lots]) => {
      if (!alive) return;
      setRows((data || []).flatMap((d: any) =>
        [...(d.registration_types || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((k: any) => ({ id: k.id, distance: d.name, kit: k.name, lot: lots[k.id] }))));
    });
    return () => { alive = false; };
  }, [eventId, refreshKey]);

  if (!rows || rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1 pr-3 font-semibold">Kit</th>
            <th className="py-1 pr-3 font-semibold">Vendidos / vagas</th>
            <th className="py-1 pr-3 font-semibold">Lote atual</th>
            <th className="py-1 font-semibold">Restam no lote</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-gray-200">
              <td className="py-1.5 pr-3 text-gray-800">{r.distance} · {r.kit}</td>
              <td className="py-1.5 pr-3">{r.lot ? `${r.lot.sold} / ${r.lot.capacity ?? 'sem limite'}` : '—'}</td>
              <td className="py-1.5 pr-3">
                {!r.lot ? '—' : r.lot.sold_out
                  ? <span className="font-semibold text-red-600">Esgotado</span>
                  : `${r.lot.lot_number}º de ${r.lot.lot_count} · ${brl(r.lot.lot_price)}`}
              </td>
              <td className="py-1.5">
                {!r.lot || r.lot.sold_out ? '—' : r.lot.lot_remaining ?? 'sem limite'}
                {r.lot && !r.lot.sold_out && r.lot.next_price != null && <span className="text-gray-400"> · depois {brl(r.lot.next_price)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-400 mt-1">
        Vendidos = pagos e confirmados. "Restam no lote" desconta também quem está pagando agora (reserva de 30 min).
      </p>
    </div>
  );
}
