import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Event } from '../../types';
import { useInView } from './useInView';

// Mesmas coordenadas por cidade do mapa original (HomePage.tsx).
const CITY_COORDS: Record<string, [number, number]> = {
  'Cabo Frio':           [-22.8779, -42.0189],
  'Búzios':             [-22.7469, -41.8826],
  'São Pedro da Aldeia': [-22.8400, -42.1020],
  'Iguaba Grande':       [-22.8360, -42.2290],
  'Araruama':            [-22.8724, -42.3435],
  'Saquarema':           [-22.9200, -42.5100],
  'Macaé':              [-22.3710, -41.7870],
  'Bacaxá':             [-22.9550, -42.5720],
};

const PIN_SVG = `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.4 15 39 15 39s14-13.6 14-24.1C29 7.2 22.7 1 15 1z" fill="#C9A84C" stroke="#000" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#000"/></svg>`;

const pinIcon = (delayMs: number) => L.divIcon({
  className: 'hm-pin-wrap',
  html: `<div class="hm-pin" style="animation-delay:${delayMs}ms">${PIN_SVG}</div>`,
  iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -36],
});

// Vários eventos na mesma cidade caíam no mesmo ponto (um pino escondia o
// outro). Espalha em círculo pequeno em volta da cidade — só visual.
function placed(events: Event[]) {
  const byCity = new Map<string, Event[]>();
  for (const e of events) if (CITY_COORDS[e.city]) byCity.set(e.city, [...(byCity.get(e.city) ?? []), e]);
  return [...byCity.values()].flatMap(list => list.map((e, k): [Event, [number, number]] => {
    const [lat, lng] = CITY_COORDS[e.city];
    if (list.length === 1) return [e, [lat, lng]];
    const a = (2 * Math.PI * k) / list.length;
    // ~25 px entre pinos no zoom inicial (10); some ao aproximar.
    return [e, [lat + 0.03 * Math.sin(a), lng + 0.04 * Math.cos(a)]];
  }));
}

export function HomeEventMap({ events }: { events: Event[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  // Celular: arrastar com um dedo rola a página em vez de prender no mapa;
  // pinça continua dando zoom e o toque no pino abre o card.
  const touch = L.Browser.mobile;

  return (
    <div ref={ref} className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: '420px' }}>
      <MapContainer center={[-22.8, -42.0]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={!touch}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {inView && placed(events).map(([e, pos], i) => (
          <Marker key={e.id} position={pos} icon={pinIcon(150 + i * 180)}>
            <Popup className="hm-popup">
              <div style={{ minWidth: 190 }}>
                <p className="font-extrabold text-gray-900 text-sm leading-snug mb-1">{e.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  {new Date(e.date).toLocaleDateString('pt-BR')} · {e.startLocation ? `${e.startLocation}, ` : ''}{e.city}
                </p>
                <Link
                  to={`/evento/${e.slug}`}
                  className="inline-block bg-black !text-[#C9A84C] text-xs font-semibold px-3 py-2 rounded-lg"
                >
                  Ver evento
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
