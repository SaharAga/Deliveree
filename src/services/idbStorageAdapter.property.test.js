import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import fc from 'fast-check';
import { IDBStorageAdapter } from './idbStorageAdapter';

describe('IDBStorageAdapter Property-Based Verification (fast-check)', () => {
  let adapter;
  let mockLocalStorage = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (k) => mockLocalStorage[k] || null,
      setItem: (k, v) => { mockLocalStorage[k] = String(v); },
      removeItem: (k) => { delete mockLocalStorage[k]; },
      clear: () => { mockLocalStorage = {}; }
    };
  });

  beforeEach(() => {
    mockLocalStorage = {};
    adapter = new IDBStorageAdapter({ userId: 'pbt-user' });
    adapter.clearMemoryCache();
  });

  it('Theorem 1: Save-Get Roundtrip Invariance — Saving arbitrary validated packages preserves list length and entity IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.stringMatching(/^[A-Za-z0-9 _-]{1,50}$/).filter(s => s.trim().length > 0),
            trackingNumber: fc.stringMatching(/^[A-Z0-9]{8,25}$/),
            carrier: fc.constantFrom('israel-post', 'cainiao', 'dhl', 'fedex', 'ups', 'other'),
            status: fc.constantFrom('ordered', 'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (generatedPkgs) => {
          // De-duplicate by ID for uniqueness
          const uniqueMap = new Map();
          for (const p of generatedPkgs) {
            uniqueMap.set(p.id, p);
          }
          const uniqueList = Array.from(uniqueMap.values());

          await adapter.savePackages(uniqueList);
          const retrieved = await adapter.getPackages();

          expect(retrieved.length).toBe(uniqueList.length);
          for (const original of uniqueList) {
            const found = retrieved.find((p) => p.id === original.id);
            expect(found).toBeDefined();
            expect(found.title).toBe(original.title.trim());
            expect(found.carrier).toBe(original.carrier);
            expect(found.status).toBe(original.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Theorem 2: Idempotent Upsertion Invariance — Upserting the same package N times results in exactly 1 instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.stringMatching(/^[A-Za-z0-9 _-]{1,30}$/).filter(s => s.trim().length > 0),
          trackingNumber: fc.stringMatching(/^[A-Z0-9]{8,20}$/),
          carrier: fc.constant('dhl'),
          status: fc.constant('in_transit')
        }),
        fc.integer({ min: 2, max: 5 }),
        async (pkg, repeatCount) => {
          for (let i = 0; i < repeatCount; i++) {
            await adapter.upsertPackage({ ...pkg, updatedAt: new Date().toISOString() });
          }

          const all = await adapter.getPackages();
          const matches = all.filter((p) => p.id === pkg.id);
          expect(matches.length).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
