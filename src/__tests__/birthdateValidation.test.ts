import { describe, it, expect } from 'vitest';
import { validateBirthdate, validateBirthdateISO, BIRTHDATE_INCOMPLETE, BIRTHDATE_INVALID, BIRTHDATE_FUTURE } from '../lib/birthdateValidation';

const today = new Date(2026, 9, 13); // 13/10/2026

describe('validateBirthdate', () => {
  it('aceita data válida e devolve ISO', () => {
    expect(validateBirthdate('15/09/1985', today)).toEqual({ ok: true, iso: '1985-09-15' });
  });
  it('aceita hoje e 29/02 de ano bissexto', () => {
    expect(validateBirthdate('13/10/2026', today).ok).toBe(true);
    expect(validateBirthdate('29/02/2000', today)).toEqual({ ok: true, iso: '2000-02-29' });
  });
  it('recusa ano com 2 dígitos (caso Balneário Run)', () => {
    expect(validateBirthdate('15/09/19', today)).toEqual({ ok: false, error: BIRTHDATE_INCOMPLETE });
  });
  it('recusa vazio, null e incompleto', () => {
    for (const v of ['', '   ', null, undefined, '15/09', '1/9/1985', '15-09-1985']) {
      expect(validateBirthdate(v, today).error).toBe(BIRTHDATE_INCOMPLETE);
    }
  });
  it('recusa dia/mês inexistente', () => {
    for (const v of ['31/02/1990', '29/02/2001', '31/04/1990', '00/01/1990', '15/13/1990', '15/00/1990']) {
      expect(validateBirthdate(v, today).error).toBe(BIRTHDATE_INVALID);
    }
  });
  it('recusa ano antes de 1900', () => {
    expect(validateBirthdate('31/12/1899', today).error).toBe(BIRTHDATE_INVALID);
    expect(validateBirthdate('01/01/1900', today).ok).toBe(true);
  });
  it('recusa data futura', () => {
    expect(validateBirthdate('14/10/2026', today).error).toBe(BIRTHDATE_FUTURE);
    expect(validateBirthdate('15/09/2090', today).error).toBe(BIRTHDATE_FUTURE);
  });
});

describe('validateBirthdateISO', () => {
  it('aceita AAAA-MM-DD do input date', () => {
    expect(validateBirthdateISO('1985-09-15', today)).toEqual({ ok: true, iso: '1985-09-15' });
  });
  it('recusa vazio e inválido', () => {
    expect(validateBirthdateISO('', today).error).toBe(BIRTHDATE_INCOMPLETE);
    expect(validateBirthdateISO('1990-02-31', today).error).toBe(BIRTHDATE_INVALID);
    expect(validateBirthdateISO('2027-01-01', today).error).toBe(BIRTHDATE_FUTURE);
  });
});
