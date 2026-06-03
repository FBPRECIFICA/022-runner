import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, MapPin, Calendar, ArrowRight, UserPlus } from 'lucide-react';

export function AthleteProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: u }, { data: regs }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('registrations').select('*, event:event_id(title, date, city, slug, banner_url)').eq('user_id', userId).neq('status', 'cancelled'),
      ]);
      setProfile(u);
      setRegistrations(regs || []);
      setFollowers(u?.followers || 0);
      setLoading(false);
    }
    load();
  }, [userId]);

  const handleFollow = async () => {
    const newCount = followers + (followed ? -1 : 1);
    await supabase.from('users').update({ followers: newCount }).eq('id', userId);
    setFollowers(newCount);
    setFollowed(f => !f);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-500">Perfil não encontrado.</div>;

  const initials = profile.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'AT';
  const past = registrations.filter(r => new Date(r.event?.date) < new Date());
  const totalKm = past.reduce((acc, r) => acc + (parseFloat(r.distance_name) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="h-40 md:h-56 bg-gradient-to-br from-blue-700 to-blue-900" />

      <div className="max-w-3xl mx-auto px-4">
        {/* Avatar */}
        <div className="flex items-end gap-4 -mt-16 mb-5">
          <div className="w-28 h-28 rounded-full border-4 border-white flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}>
            {initials}
          </div>
          <div className="pb-2 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            {profile.city && <p className="text-gray-500 flex items-center gap-1 text-sm"><MapPin size={14} /> {profile.city}</p>}
          </div>
          <button
            onClick={handleFollow}
            className={`pb-2 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors ${followed ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <UserPlus size={16} /> {followed ? 'Seguindo' : 'Seguir'} {followers > 0 && `(${followers})`}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: <Calendar size={18} className="text-blue-600" />, value: registrations.length, label: 'Eventos' },
            { icon: <MapPin size={18} className="text-green-600" />, value: `${totalKm.toFixed(0)} km`, label: 'Percorridos' },
            { icon: <Trophy size={18} className="text-yellow-500" />, value: past.length, label: 'Medalhas' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-4 flex flex-col items-center text-center gap-1">
              {s.icon}
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Histórico */}
        {registrations.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Eventos Participados</h2>
            <div className="space-y-3">
              {registrations.map(r => (
                <Link key={r.id} to={`/evento/${r.event?.slug}`}
                  className="flex items-center gap-3 border rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  {r.event?.banner_url && <img src={r.event.banner_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{r.event?.title}</p>
                    <p className="text-xs text-gray-400">{r.distance_name} · {r.event?.city} · {new Date(r.event?.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
