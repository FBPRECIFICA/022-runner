import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft } from 'lucide-react';

// Páginas estáticas de resultado (em /public/resultados), por slug do evento.
const RESULTS_BY_SLUG: Record<string, { file: string; title: string }> = {
  '1-corrida-do-aniversario-da-arena-mmp-': {
    file: '/resultados/1-corrida-arena-mmp.html',
    title: '1ª Corrida do Aniversário da Arena MMP',
  },
};

export function EventResultsPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const entry = RESULTS_BY_SLUG[slug];

  if (!entry) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600">Resultados ainda não disponíveis para este evento.</p>
        <Link to={`/evento/${slug}`} className="bg-[#C9A84C] text-white px-6 py-3 rounded-lg hover:bg-[#B8962E] font-medium">
          Voltar ao evento
        </Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0d0d0d' }} className="min-h-screen">
      <Helmet>
        <title>Pódio e Resultados · {entry.title} | 022Runners</title>
        <meta name="description" content={`Pódio e resultado completo da ${entry.title}.`} />
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
        title={`Resultados · ${entry.title}`}
        className="w-full block border-0"
        style={{ height: 'calc(100vh - 40px)', minHeight: 600 }}
      />
    </div>
  );
}
