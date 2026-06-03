import { describe, it, expect } from 'vitest';
import { validateCPF, formatCPF, formatPhone } from '../utils/validators';

describe('validateCPF', () => {
  it('validates a correct CPF', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
  });
  it('rejects all-same digits', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
  });
  it('rejects short CPF', () => {
    expect(validateCPF('123.456')).toBe(false);
  });
  it('rejects wrong check digits', () => {
    expect(validateCPF('000.000.000-01')).toBe(false);
  });
});

describe('formatCPF', () => {
  it('formats 11 digits correctly', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });
  it('ignores non-digits', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('formatPhone', () => {
  it('formats 11-digit mobile', () => {
    expect(formatPhone('22999999999')).toBe('(22) 99999-9999');
  });
  it('formats 10-digit landline', () => {
    expect(formatPhone('2233334444')).toBe('(22) 3333-4444');
  });
});
