import { describe, it, expect } from 'vitest';
import {
  containsPII,
  redactPII,
  hashTrackingNumber,
  sanitizeForTelemetry
} from './privacySanitizer';

describe('Privacy Sanitizer & Anti-Profiling Unit Tests', () => {
  describe('containsPII', () => {
    it('detects emails correctly', () => {
      expect(containsPII('Contact me at user@example.com for info')).toBe(true);
      expect(containsPII('Plain text message')).toBe(false);
    });

    it('detects Israeli phone numbers correctly (mobile and landline formats)', () => {
      expect(containsPII('Call me on 050-1234567')).toBe(true);
      expect(containsPII('Mobile: 0521234567')).toBe(true);
      expect(containsPII('Landline: 03-6789012')).toBe(true);
      expect(containsPII('Haifa office: 04-8123456')).toBe(true);
      expect(containsPII('+972-54-1234567')).toBe(true);
    });

    it('detects credit card patterns', () => {
      expect(containsPII('Card 4580-1234-5678-9012')).toBe(true);
      expect(containsPII('Card 4580123456789012')).toBe(true);
    });

    it('detects personal notes and access codes', () => {
      expect(containsPII('Door code: 1234 leave at entrance')).toBe(true);
      expect(containsPII('Attn: John Smith, Apartment 4B')).toBe(true);
    });

    it('returns false for safe telemetry or logs', () => {
      expect(containsPII('App encountered 404 status on fetch packages')).toBe(false);
      expect(containsPII('Render time took 45ms')).toBe(false);
    });
  });

  describe('redactPII', () => {
    it('redacts email addresses', () => {
      const input = 'Error reported by admin@domain.co.il during sync';
      expect(redactPII(input)).toBe('Error reported by [REDACTED_EMAIL] during sync');
    });

    it('redacts Israeli and general phone numbers', () => {
      const input = 'Call 054-7654321 or 02-5555555';
      const redacted = redactPII(input);
      expect(redacted).not.toContain('054-7654321');
      expect(redacted).not.toContain('02-5555555');
      expect(redacted).toContain('[REDACTED_PHONE]');
    });

    it('redacts credit card numbers', () => {
      const input = 'Payment method 1234-5678-9012-3456 failed';
      expect(redactPII(input)).toBe('Payment method [REDACTED_CREDIT_CARD] failed');
    });
  });

  describe('hashTrackingNumber', () => {
    it('generates deterministic salted SHA-256 hash', () => {
      const hash1 = hashTrackingNumber('RR123456789IL');
      const hash2 = hashTrackingNumber('RR123456789IL');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^trk_[a-f0-9]{16}$/);
    });

    it('normalizes casing and whitespace', () => {
      const hashUpper = hashTrackingNumber('RR123456789IL');
      const hashLower = hashTrackingNumber('  rr123456789il  ');
      expect(hashUpper).toBe(hashLower);
    });

    it('produces different hash with custom salt', () => {
      const hashDefault = hashTrackingNumber('RR123456789IL');
      const hashCustom = hashTrackingNumber('RR123456789IL', 'custom_salt_v2');
      expect(hashDefault).not.toBe(hashCustom);
    });

    it('handles empty or non-string gracefully', () => {
      expect(hashTrackingNumber('')).toBe('');
      expect(hashTrackingNumber(null)).toBe('');
    });
  });

  describe('sanitizeForTelemetry', () => {
    it('deeply sanitizes nested objects and redacts PII and tracking numbers', () => {
      const rawPayload = {
        eventName: 'feedback_submitted',
        user: {
          name: 'Sahar Aga',
          email: 'sahar@test.com',
          phone: '050-1234567'
        },
        metadata: {
          trackingNumber: 'RR998877665IL',
          notes: 'Door code: 4321, deliver to apartment 12',
          itemCount: 3
        }
      };

      const sanitized = sanitizeForTelemetry(rawPayload);

      expect(sanitized.user.name).toBe('Anonymous Tester');
      expect(sanitized.user.email).toBe('[REDACTED_EMAIL]');
      expect(sanitized.user.phone).toBe('[REDACTED_PHONE]');
      expect(sanitized.metadata.trackingNumber).toMatch(/^trk_[a-f0-9]{16}$/);
      expect(sanitized.metadata.notes).toContain('[REDACTED_PERSONAL_INFO]');
      expect(sanitized.metadata.itemCount).toBe(3);
    });
  });
});
