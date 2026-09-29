import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMNS } from '../lib/registrationExport';

// Checkboxes de colunas do modal "Exportar Excel" — usado no painel do Organizador (claro) e
// do Admin (escuro).
export function ExportColumnPicker({ selected, onChange, dark = false }: {
  selected: string[];
  onChange: (keys: string[]) => void;
  dark?: boolean;
}) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  const muted = dark ? 'text-slate-400' : 'text-gray-500';
  const link = 'underline hover:no-underline';

  return (
    <div>
      <div className={`flex items-center justify-between text-xs mb-2 ${muted}`}>
        <span>Colunas da planilha ({selected.length})</span>
        <span className="space-x-3">
          <button type="button" className={link} onClick={() => onChange(EXPORT_COLUMNS.map(c => c.key))}>todas</button>
          <button type="button" className={link} onClick={() => onChange(DEFAULT_EXPORT_COLUMNS)}>padrão</button>
          <button type="button" className={link} onClick={() => onChange([])}>nenhuma</button>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 max-h-56 overflow-y-auto pr-1">
        {EXPORT_COLUMNS.map(c => (
          <label key={c.key} className={`flex items-center gap-2 text-sm cursor-pointer ${dark ? 'text-slate-200' : 'text-gray-700'}`}>
            <input type="checkbox" checked={selected.includes(c.key)} onChange={() => toggle(c.key)} className="accent-[#C9A84C]" />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}
