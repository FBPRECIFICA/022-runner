import { describe, it, expect } from 'vitest';
import { countdownLabel, spotsLeftLabel } from '../components/home/countdown';

const now = new Date('2026-10-30T12:00:00').getTime();

describe('countdownLabel', () => {
  it('dias e horas', () => {
    expect(countdownLabel('2026-12-20T07:00:00', now)).toBe('Faltam 50 dias e 19h');
    expect(countdownLabel('2026-10-31T15:00:00', now)).toBe('Faltam 1 dia e 3h');
  });
  it('menos de um dia', () => {
    expect(countdownLabel('2026-10-30T17:05:00', now)).toBe('Faltam 5h 05min');
  });
  it('data passada, agora ou inválida: nada', () => {
    expect(countdownLabel('2026-10-29T07:00:00', now)).toBeNull();
    expect(countdownLabel('2026-10-30T12:00:00', now)).toBeNull();
    expect(countdownLabel('lixo', now)).toBeNull();
  });
});

describe('spotsLeftLabel', () => {
  it('só com limite real cadastrado', () => {
    expect(spotsLeftLabel(0, 10)).toBeNull();
    expect(spotsLeftLabel(200, 37)).toBe('Restam 163 vagas');
    expect(spotsLeftLabel(200, 199)).toBe('Resta 1 vaga');
    expect(spotsLeftLabel(200, 200)).toBeNull();
  });
});
