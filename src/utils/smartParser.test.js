import { describe, it, expect } from 'vitest';
import { parseDeliveryText } from './smartParser';

describe('Smart Text and SMS Parser', () => {
  it('parses Israel Post SMS notifications with branch and tracking code', () => {
    const raw = 'שלום, דבר דואר שמספרו RS948219481IL נמסר לחלוקה ביחידת הדואר דיזנגוף סנטר. שעות פתיחה: 08:00-19:00.';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.trackingNumber).toBe('RS948219481IL');
    expect(parsed.carrierId).toBe('israel-post');
    expect(parsed.pickupLocation).toContain('דיזנגוף סנטר');
  });

  it('parses AliExpress shipment notifications with title quotes', () => {
    const raw = 'AliExpress update: Your order for "Mechanical Keyboard" (LP00582910482CN) has arrived at the destination sorting facility.';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.trackingNumber).toBe('LP00582910482CN');
    expect(parsed.carrierId).toBe('cainiao');
    expect(parsed.title).toBe('Mechanical Keyboard');
  });

  it('parses DHL notification text', () => {
    const raw = 'DHL Express: Shipment 4829104821 is out for delivery with courier.';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.trackingNumber).toBe('4829104821');
    expect(parsed.carrierId).toBe('dhl');
  });

  it('parses fallback generic tracking numbers with digits between 8 and 24 characters', () => {
    const raw = 'Package reference code TRACK12345 is ready.';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.trackingNumber).toBe('TRACK12345');
    expect(parsed.carrierId).toBe('other');
  });

  it('does not match fallback tracking codes without any digits', () => {
    const raw = 'Package reference code ABCDEFGHIJKL is ready.';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.trackingNumber).toBe('');
  });

  it('sanitizes XSS payloads and script tags from parsed title and notes', () => {
    const raw = 'Order "<script>alert(1)</script>Safe Item" has arrived at בנקודת מסירה <img src=x onerror=alert(2)>Dizengoff Branch';
    const parsed = parseDeliveryText(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.title).toBe('Safe Item');
    expect(parsed.pickupLocation).toBe('Dizengoff Branch');
    expect(parsed.notes).toContain('נקודת איסוף: Dizengoff Branch');
    expect(parsed.notes).not.toContain('<img');
  });

  it('handles empty or non-string inputs safely without crashing', () => {
    expect(parseDeliveryText('')).toBeNull();
    expect(parseDeliveryText(null)).toBeNull();
    expect(parseDeliveryText(undefined)).toBeNull();
    expect(parseDeliveryText(12345)).toBeNull();
  });
});
