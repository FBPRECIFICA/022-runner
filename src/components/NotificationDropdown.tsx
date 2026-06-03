import type { Notification } from '../types';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationDropdown({ notifications, onClose }: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notificações</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">✕</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500"><p>Nenhuma notificação</p></div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex gap-4 p-3 border-b border-gray-100 ${!n.read ? 'bg-amber-50' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-[#C9A84C]">📢</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-500">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
