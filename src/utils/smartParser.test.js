import { describe, it, expect } from 'vitest';
import { parseSmartText, extractTrackingCandidates } from './smartParser';

describe('smartParser - extractTrackingCandidates', () => {
  it('extracts tracking number from explicit Hebrew SMS format', () => {
    const sms = 'שלום, החבילה שלך מחברת עליאקספרס יצאה לדרך. מספר מעקב: LP00582910482CN. לאיסוף היכנס לקישור.';
    const candidates = extractTrackingCandidates(sms);
    expect(candidates).toContain('LP00582910482CN');
  });

  it('extracts tracking number from explicit English email format', () => {
    const email = 'Your order from Amazon has shipped! Tracking number: 1Z9999999999999999. Expected delivery tomorrow.';
    const candidates = extractTrackingCandidates(email);
    expect(candidates).toContain('1Z9999999999999999');
  });

  it('extracts tracking number without explicit label if format matches known carrier', () => {
    const raw = 'Delivery update: YT2109849201948201 is currently in transit to Tel Aviv';
    const candidates = extractTrackingCandidates(raw);
    expect(candidates).toContain('YT2109849201948201');
  });
});

describe('smartParser - parseSmartText', () => {
  it('parses AliExpress confirmation and detects carrier and store', () => {
    const text = 'Hi Sahar, your AliExpress order has been shipped with Cainiao. Tracking: LP00582910482CN';
    const parsed = parseSmartText(text);

    expect(parsed.title).toBe('AliExpress Order');
    expect(parsed.trackingNumber).toBe('LP00582910482CN');
    expect(parsed.carrier).toBe('cainiao');
  });

  it('parses Israel Post registered parcel SMS', () => {
    const text = 'דואר ישראל: חבילה מספר RS948219481IL ממתינה בסניף הדואר הקרוב אליך.';
    const parsed = parseSmartText(text);

    expect(parsed.trackingNumber).toBe('RS948219481IL');
    expect(parsed.carrier).toBe('israel-post');
  });

  it('handles empty or malformed inputs safely', () => {
    const parsed = parseSmartText(null);
    expect(parsed.title).toBe('');
    expect(parsed.trackingNumber).toBe('');
    expect(parsed.carrier).toBe('other');
  });
});
