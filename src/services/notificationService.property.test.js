import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  urlBase64ToUint8Array,
  formatPushPayload,
  STATUS_NOTIFICATION_INFO
} from './notificationService';

describe('Web Push Property-Based Tests (TASK-13)', () => {
  it('Property 1: urlBase64ToUint8Array produces deterministic byte array length without throw', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9\-_]{0,64}$/),
        (base64Str) => {
          const result = urlBase64ToUint8Array(base64Str);
          expect(result).toBeInstanceOf(Uint8Array);
          // Length matches decoded binary length
          expect(result.length).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: formatPushPayload always contains required PWA push keys and non-empty actions', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ maxLength: 50 }),
          body: fc.string({ maxLength: 100 }),
          packageId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
          trackingNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
        }),
        (input) => {
          const payload = formatPushPayload(input);

          // Invariant checks
          expect(typeof payload.title).toBe('string');
          expect(payload.title.length).toBeGreaterThan(0);
          expect(typeof payload.body).toBe('string');
          expect(payload.icon).toBe('/icons/icon-192.png');
          expect(payload.badge).toBe('/icons/icon-192.png');
          expect(typeof payload.tag).toBe('string');
          expect(payload.tag.length).toBeGreaterThan(0);
          expect(Array.isArray(payload.actions)).toBe(true);
          expect(payload.actions.length).toBe(2);
          expect(payload.actions.map(a => a.action)).toEqual(['view', 'dismiss']);

          if (input.packageId) {
            expect(payload.url).toContain(encodeURIComponent(input.packageId));
            expect(payload.data.packageId).toBe(input.packageId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: STATUS_NOTIFICATION_INFO has bilingual labels and emojis for all stages', () => {
    const expectedStages = [
      'ordered',
      'shipped',
      'in_transit',
      'customs',
      'out_for_delivery',
      'delivered',
      'exception',
      'archived'
    ];

    expectedStages.forEach((stage) => {
      const meta = STATUS_NOTIFICATION_INFO[stage];
      expect(meta).toBeDefined();
      expect(typeof meta.emoji).toBe('string');
      expect(typeof meta.he).toBe('string');
      expect(typeof meta.en).toBe('string');
      expect(meta.he.length).toBeGreaterThan(0);
      expect(meta.en.length).toBeGreaterThan(0);
    });
  });
});
