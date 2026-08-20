import { describe, it, expect } from 'vitest';
import { calculatePasswordStrength } from './AuthModal';

describe('calculatePasswordStrength Utility', () => {
  it('returns empty strength for empty or nullish password', () => {
    expect(calculatePasswordStrength('')).toEqual({
      score: 0,
      level: 'none',
      labelHe: '',
      labelEn: '',
      colorClass: 'bg-slate-800',
      textClass: 'text-slate-500',
      criteria: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        symbol: false
      }
    });
    expect(calculatePasswordStrength(null).score).toBe(0);
    expect(calculatePasswordStrength(undefined).score).toBe(0);
  });

  it('marks passwords under 6 characters as weak regardless of symbols', () => {
    const res = calculatePasswordStrength('A1!');
    expect(res.score).toBe(1);
    expect(res.level).toBe('weak');
    expect(res.labelEn).toBe('Weak');
    expect(res.labelHe).toBe('חלשה');
    expect(res.colorClass).toBe('bg-rose-500');
    expect(res.criteria.length).toBe(false);
    expect(res.criteria.uppercase).toBe(true);
    expect(res.criteria.number).toBe(true);
    expect(res.criteria.symbol).toBe(true);
  });

  it('evaluates fair password strength appropriately', () => {
    const res = calculatePasswordStrength('pass12');
    expect(res.score).toBe(2);
    expect(res.level).toBe('fair');
    expect(res.labelEn).toBe('Fair');
    expect(res.labelHe).toBe('בינונית');
    expect(res.colorClass).toBe('bg-amber-500');
    expect(res.criteria.lowercase).toBe(true);
    expect(res.criteria.number).toBe(true);
    expect(res.criteria.length).toBe(false);
  });

  it('evaluates strong password strength when 3+ criteria met and length >= 6', () => {
    const res = calculatePasswordStrength('Pass1234');
    expect(res.score).toBe(3);
    expect(res.level).toBe('strong');
    expect(res.labelEn).toBe('Strong');
    expect(res.labelHe).toBe('חזקה');
    expect(res.colorClass).toBe('bg-blue-500');
    expect(res.criteria.length).toBe(true);
    expect(res.criteria.lowercase).toBe(true);
    expect(res.criteria.uppercase).toBe(true);
    expect(res.criteria.number).toBe(true);
  });

  it('evaluates secure password strength when all 5 criteria are fulfilled', () => {
    const res = calculatePasswordStrength('S3cur3!P@ss2026');
    expect(res.score).toBe(4);
    expect(res.level).toBe('secure');
    expect(res.labelEn).toBe('Secure');
    expect(res.labelHe).toBe('מאובטחת');
    expect(res.colorClass).toBe('bg-emerald-500');
    expect(res.criteria.length).toBe(true);
    expect(res.criteria.lowercase).toBe(true);
    expect(res.criteria.uppercase).toBe(true);
    expect(res.criteria.number).toBe(true);
    expect(res.criteria.symbol).toBe(true);
  });

  it('supports Hebrew characters in lowercase letter detection', () => {
    const res = calculatePasswordStrength('סיסמה123!');
    expect(res.criteria.lowercase).toBe(true);
    expect(res.criteria.number).toBe(true);
    expect(res.criteria.symbol).toBe(true);
  });
});
