import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Star } from 'lucide-react';

interface Props { eventId: string }

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}>
          <Star size={18} fill={i <= value ? '#C9A84C' : 'none'}
            style={{ color: i <= value ? '#C9A84C' : '#d1d5db' }} />
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ eventId }: Props) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [form, setForm] = useState({ overall: 0, organization: 0, route: 0, kit: 0, comment: '' });

  useEffect(() => {
    loadReviews();
  }, [eventId]);

  const loadReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setReviews(data || []);
    if (user) setHasReviewed((data || []).some(r => r.user_id === user.id));
    setLoading(false);
  };

  const avg = (key: string) => {
    const vals = reviews.filter(r => r[key]).map(r => r[key]);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const handleSubmit = async () => {
    if (!form.overall) return;
    setSubmitting(true);
    await supabase.from('reviews').insert({
      event_id: eventId,
      user_id: user!.id,
      rating_overall: form.overall,
      rating_organization: form.organization || null,
      rating_route: form.route || null,
      rating_kit: form.kit || null,
      comment: form.comment || null,
    });
    await loadReviews();
    setSubmitting(false);
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4">Avaliações</h2>

      {/* Médias */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Geral', key: 'rating_overall' },
            { label: 'Organização', key: 'rating_organization' },
            { label: 'Percurso', key: 'rating_route' },
            { label: 'Kit', key: 'rating_kit' },
          ].map(item => (
            <div key={item.key} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#fffbeb' }}>
              <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{avg(item.key)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulário */}
      {isAuthenticated && !hasReviewed && (
        <div className="border rounded-xl p-4 mb-5 bg-gray-50">
          <p className="font-semibold text-gray-800 text-sm mb-3">Deixe sua avaliação</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Geral *', key: 'overall' },
              { label: 'Organização', key: 'organization' },
              { label: 'Percurso', key: 'route' },
              { label: 'Kit', key: 'kit' },
            ].map(item => (
              <div key={item.key}>
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <Stars value={form[item.key as keyof typeof form] as number}
                  onChange={v => setForm(p => ({ ...p, [item.key]: v }))} />
              </div>
            ))}
          </div>
          <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
            rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none mb-3"
            style={{ borderColor: '#d1d5db' }}
            placeholder="Comentário (opcional)" />
          <button onClick={handleSubmit} disabled={submitting || !form.overall}
            className="w-full font-bold py-2 rounded-lg text-sm disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C', color: '#000' }}>
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
      )}

      {/* Lista */}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma avaliação ainda.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <Stars value={r.rating_overall} />
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
