import { validateEmail } from '../lib/emailValidation';

// Erro de e-mail abaixo do campo, com botão "Usar <sugestão>" quando há provável erro de digitação.
export function EmailHint({ value, show, onUse, className = 'text-red-600' }: {
  value: string;
  show: boolean;
  onUse: (suggestion: string) => void;
  className?: string;
}) {
  if (!show) return null;
  const r = validateEmail(value);
  if (r.ok) return null;
  return (
    <p className={`text-xs mt-1 ${className}`}>
      {r.error}
      {r.suggestion && (
        <button type="button" onClick={() => onUse(r.suggestion!)} className="ml-1 font-semibold underline">
          Usar {r.suggestion}
        </button>
      )}
    </p>
  );
}
