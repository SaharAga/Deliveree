import { describe, it, expect } from 'vitest';
import { formatDate, getDaysRemaining } from './dateUtils';

describe('Date Utilities', () => {
  it('formats dates consistently in EN and HE locales', () => {
    const isoString = '2026-08-25T12:00:00.000Z';
    const formattedEn = formatDate(isoString, 'en');
    const formattedHe = formatDate(isoString, 'he');

    expect(formattedEn).toBeTruthy();
    expect(formattedHe).toBeTruthy();
  });

  it('returns empty string when date is falsy', () => {
    expect(formatDate('', 'en')).toBe('');
    expect(formatDate(null, 'en')).toBe('');
  });

  it('calculates remaining days accurately', () => {
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const info = getDaysRemaining(futureDate, 'en');

    expect(info).not.toBeNull();
    expect(info.isLate).toBe(false);
    expect(info.days).toBeGreaterThanOrEqual(4);
    expect(info.text).toContain('In');
  });

  it('detects overdue packages correctly', () => {
    const pastDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const info = getDaysRemaining(pastDate, 'en');

    expect(info).not.toBeNull();
    expect(info.isLate).toBe(true);
    expect(info.isUrgent).toBe(true);
    expect(info.text).toContain('overdue');
  });
});
