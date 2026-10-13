import { describe, it, expect, vi, afterEach } from 'vitest';
// Gate usado por create-payment e edit-pending-registration (Deno). Arquivo sem imports, roda aqui também.
import { isBirthdateValid } from '../../supabase/functions/_shared/birthdate';

describe('isBirthdateValid (create-payment / edit-pending-registration)', () => {
  afterEach(() => vi.useRealTimers());

  it('inscrição com birth_date válido passa', () => {
    expect(isBirthdateValid('1985-09-15')).toBe(true);
    expect(isBirthdateValid('2000-02-29')).toBe(true);
  });
  it('inscrição sem birth_date é recusada', () => {
    for (const v of [null, undefined, '', '  ']) expect(isBirthdateValid(v)).toBe(false);
  });
  it('recusa formato errado, dia inexistente e antes de 1900', () => {
    for (const v of ['15/09/1985', '0019-09-15', '1990-02-31', '2001-02-29', '1899-12-31']) {
      expect(isBirthdateValid(v)).toBe(false);
    }
  });
  it('futura é recusada, usando o dia de Brasília', () => {
    vi.useFakeTimers();
    // 14/10 01:00 UTC = 13/10 22:00 em Brasília: 14/10 ainda é futuro.
    vi.setSystemTime(new Date('2026-10-14T01:00:00Z'));
    expect(isBirthdateValid('2026-10-13')).toBe(true);
    expect(isBirthdateValid('2026-10-14')).toBe(false);
  });
});
