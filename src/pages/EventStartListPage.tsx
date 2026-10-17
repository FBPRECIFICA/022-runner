import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft } from 'lucide-react';

// Páginas estáticas de lista de largada (em /public/largada), por slug do evento.
const START_LIST_BY_SLUG: Record<string, { file: string; title: string }> = {
  'balneario-run': {
    file: '/largada/balneario-run.html',
    title: 'Balneário Run',
  },
};

export function EventStartListPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const entry = START_LIST_BY_SLUG[slug];

  if (!entry) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600">Lista de largada ainda não disponível para este evento.</p>
        <Link to={`/evento/${slug}`} className="bg-[#C9A84C] text-white px-6 py-3 rounded-lg hover:bg-[#B8962E] font-medium">
          Voltar ao evento
        </Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0d0d0d' }} className="min-h-screen">
      <Helmet>
        <title>{`Lista de Largada · ${entry.title} | 022Runners`}</title>
        <meta name="description" content={`Lista de largada da ${entry.title}: encontre sua categoria e quem corre com você.`} />
      </Helmet>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link
          to={`/evento/${slug}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C9A84C] hover:text-[#E8CE7A]"
        >
          <ChevronLeft size={16} /> Voltar ao evento
        </Link>
      </div>
      <iframe
        src={entry.file}
        title={`Lista de Largada · ${entry.title}`}
        className="w-full block border-0"
        style={{ height: 'calc(100vh - 40px)', minHeight: 600 }}
      />
    </div>
  );
}
