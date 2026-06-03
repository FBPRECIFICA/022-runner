import { describe, it, expect } from 'vitest';
import { calculateScore, scoreBadge } from '../utils/scoreCalculator';

describe('calculateScore', () => {
  it('returns 0 for empty event', () => {
    expect(calculateScore({})).toBe(0);
  });
  it('adds 20 for having a photo', () => {
    expect(calculateScore({ banner_url: 'http://x.com/img.jpg' })).toBeGreaterThanOrEqual(20);
  });
  it('caps at 100', () => {
    const full = {
      banner_url: 'http://x.com/a.jpg',
      photos: ['a','b','c'],
      description: 'A'.repeat(201),
      distances: [1,2],
      kit_items: ['Camiseta'],
      additional_info: 'Regulamento completo aqui',
      registration_deadline: '2027-01-01',
      location: 'Praça Central',
      sponsor: 'Patrocinador X',
      current_participants: 60,
    };
    expect(calculateScore(full)).toBeLessThanOrEqual(100);
  });
});

describe('scoreBadge', () => {
  it('returns gold for 91+', () => {
    expect(scoreBadge(95).bg).toBe('#C9A84C');
  });
  it('returns green for 71-90', () => {
    expect(scoreBadge(80).bg).toBe('#16a34a');
  });
  it('returns gold for 41-70', () => {
    expect(scoreBadge(50).bg).toBe('#C9A84C');
  });
  it('returns gray for 0-40', () => {
    expect(scoreBadge(20).bg).toBe('#9ca3af');
  });
});
