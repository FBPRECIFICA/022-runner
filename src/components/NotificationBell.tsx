import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new, ...prev])
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!isAuthenticated) return null;

  const unread = notifications.filter(n => !n.read).length;
  const typeColor = (t: string) => ({ info: '#C9A84C', success: '#16a34a', warning: '#f59e0b', error: '#dc2626' }[t] || '#C9A84C');

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={18} style={{ color: '#111111' }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
            style={{ backgroundColor: '#dc2626', fontSize: '10px' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f0e6c8' }}>
            <span className="font-semibold text-gray-900 text-sm">Notificações</span>
            {unread > 0 && <button onClick={markAllRead} className="text-xs" style={{ color: '#C9A84C' }}>Marcar tudo como lido</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nenhuma notificação</p>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${!n.read ? 'bg-amber-50/50' : ''}`}
                style={{ borderColor: '#f3f4f6' }}>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: typeColor(n.type) }} />
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">{n.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                    <p className="text-gray-300 text-xs mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
