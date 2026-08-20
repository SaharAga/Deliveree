import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  containsPII,
  redactPII,
  hashTrackingNumber,
  sanitizeForTelemetry
} from './privacySanitizer';

// List of safe benign words for constructing surrounding filler text
const SAFE_DICTIONARY = [
  'package', 'order', 'shipped', 'delivery', 'status', 'warehouse', 'transit',
  'received', 'flight', 'customs', 'cleared', 'hub', 'facility', 'express',
  'arrived', 'dispatched', 'item', 'details', 'logistics', 'tracking', 'update',
  'חבילה', 'משלוח', 'הגיע', 'נמסר', 'בדרך', 'סניף', 'מיון', 'עדכון'
];

const safeWordArbitrary = fc.constantFrom(...SAFE_DICTIONARY);

const emailArbitrary = fc.record({
  user: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_.+-]{1,15}$/).filter((s) => !s.includes('@')),
  domain: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,10}$/),
  tld: fc.constantFrom('com', 'org', 'net', 'co.il', 'io', 'app', 'gov.il', 'dev')
}).map(({ user, domain, tld }) => `${user}@${domain}.${tld}`);

const israeliMobileArbitrary = fc.record({
  prefix: fc.constantFrom('050', '052', '053', '054', '055', '058', '+972-50', '+972-52', '+972-54', '+97250', '+97254'),
  separator: fc.constantFrom('-', ' ', ''),
  digits: fc.stringMatching(/^\d{7}$/)
}).map(({ prefix, separator, digits }) => `${prefix}${separator}${digits}`);

const israeliLandlineArbitrary = fc.record({
  prefix: fc.constantFrom('02', '03', '04', '08', '09', '+972-2', '+972-3', '+972-4', '+972-8', '+972-9'),
  separator: fc.constantFrom('-', ' ', ''),
  digits: fc.stringMatching(/^\d{7}$/)
}).map(({ prefix, separator, digits }) => `${prefix}${separator}${digits}`);

const creditCardArbitrary = fc.record({
  d1: fc.stringMatching(/^\d{4}$/),
  d2: fc.stringMatching(/^\d{4}$/),
  d3: fc.stringMatching(/^\d{4}$/),
  d4: fc.stringMatching(/^\d{4}$/),
  sep: fc.constantFrom('-', ' ', '')
}).map(({ d1, d2, d3, d4, sep }) => `${d1}${sep}${d2}${sep}${d3}${sep}${d4}`);

const generalPhoneArbitrary = fc.record({
  country: fc.constantFrom('+1', '+44', '+49', '+33', ''),
  area: fc.stringMatching(/^\d{3}$/),
  mid: fc.stringMatching(/^\d{3}$/),
  end: fc.stringMatching(/^\d{4}$/)
}).map(({ country, area, mid, end }) => `${country ? country + ' ' : ''}(${area}) ${mid}-${end}`);

const arbitraryPIIElement = fc.oneof(
  emailArbitrary,
  israeliMobileArbitrary,
  israeliLandlineArbitrary,
  creditCardArbitrary,
  generalPhoneArbitrary
);

describe('Privacy Sanitizer & Anti-Profiling - Property-Based High-Assurance Verification', () => {
  describe('Anti-Profiling Sanitization Invariant: containsPII(redactPII(text)) === false', () => {
    it('Theorem 1: Redacting any string containing arbitrary emails, phone numbers, or credit card patterns guarantees containsPII is false (>= 1,000 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(safeWordArbitrary, { minLength: 0, maxLength: 4 }),
          arbitraryPIIElement,
          fc.array(safeWordArbitrary, { minLength: 0, maxLength: 4 }),
          (prefixParts, pii, suffixParts) => {
            const prefix = prefixParts.join(' ');
            const suffix = suffixParts.join(' ');
            const rawText = `${prefix} ${pii} ${suffix}`.trim();

            // Verification 1: The unredacted text MUST be caught by containsPII
            expect(containsPII(rawText)).toBe(true);

            // Verification 2: After redaction, containsPII MUST strictly be false
            const sanitized = redactPII(rawText);
            expect(containsPII(sanitized)).toBe(false);

            // Verification 3: The raw PII string itself is not contained in sanitized output
            expect(sanitized).not.toContain(pii);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('Theorem 2: Multi-PII Composition - Text containing multiple concatenated PII vectors is completely scrubbed', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryPIIElement, { minLength: 2, maxLength: 6 }),
          fc.array(safeWordArbitrary, { minLength: 1, maxLength: 5 }),
          (piiList, words) => {
            const interleaved = piiList.map((pii, i) => `${words[i % words.length]} ${pii}`).join(' ');

            expect(containsPII(interleaved)).toBe(true);
            const sanitized = redactPII(interleaved);
            expect(containsPII(sanitized)).toBe(false);

            for (const pii of piiList) {
              expect(sanitized).not.toContain(pii);
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Theorem 3: Idempotence of redactPII - redactPII(redactPII(text)) === redactPII(text)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (arbitraryString) => {
            const firstPass = redactPII(arbitraryString);
            const secondPass = redactPII(firstPass);
            expect(secondPass).toBe(firstPass);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Deterministic Salted Hashing Properties (hashTrackingNumber)', () => {
    it('Deterministic and Formatted: Output is always "trk_" + 16 hex characters for non-empty tracking numbers', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Za-z0-9_-]{4,30}$/),
          (trackingNumber) => {
            const hash1 = hashTrackingNumber(trackingNumber);
            const hash2 = hashTrackingNumber(trackingNumber);

            // Determinism
            expect(hash1).toBe(hash2);
            // Prefix & Length
            expect(hash1).toMatch(/^trk_[a-f0-9]{16}$/);
            expect(hash1.length).toBe(20);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Case & Whitespace Invariance: hashTrackingNumber is invariant to leading/trailing whitespace and casing', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Za-z0-9]{5,20}$/),
          (raw) => {
            const hashUpper = hashTrackingNumber(raw.toUpperCase());
            const hashLower = hashTrackingNumber(raw.toLowerCase());
            const hashPadded = hashTrackingNumber(`   ${raw}   `);

            expect(hashUpper).toBe(hashLower);
            expect(hashUpper).toBe(hashPadded);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Deep Telemetry Sanitization Invariants (sanitizeForTelemetry)', () => {
    it('Safety: Arbitrary nested object payloads never leak raw emails or sensitive credentials', () => {
      const nestedPayloadArbitrary = fc.record({
        user: fc.record({
          name: fc.string({ maxLength: 30 }),
          email: emailArbitrary,
          phone: israeliMobileArbitrary,
          password: fc.string({ maxLength: 20 }),
          token: fc.uuid()
        }),
        metadata: fc.record({
          trackingNumber: fc.stringMatching(/^[A-Z0-9]{10,20}$/),
          comment: fc.string({ maxLength: 50 })
        }),
        tags: fc.array(fc.string({ maxLength: 10 }), { maxLength: 4 })
      });

      fc.assert(
        fc.property(nestedPayloadArbitrary, (payload) => {
          const sanitized = sanitizeForTelemetry(payload);

          // User fields are scrubbed
          expect(sanitized.user.name).toBe('Anonymous Tester');
          expect(sanitized.user.email).toBe('[REDACTED_EMAIL]');
          expect(sanitized.user.phone).toBe('[REDACTED_PHONE]');
          expect(sanitized.user.password).toBe('[REDACTED]');
          expect(sanitized.user.token).toBe('[REDACTED]');

          // Tracking number is salted & hashed
          expect(sanitized.metadata.trackingNumber).toMatch(/^trk_[a-f0-9]{16}$/);
          expect(sanitized.metadata.trackingNumber).not.toBe(payload.metadata.trackingNumber);
        }),
        { numRuns: 300 }
      );
    });
  });
});
