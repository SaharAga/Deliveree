import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  runStorageSelfTest,
  runCarrierRegexSelfTest,
  runMemoryBoundsSelfTest,
  runAllBistDiagnostics,
  GOLD_STANDARD_CARRIER_SAMPLES,
  MAX_PACKAGE_MEMORY_BOUND
} from './bistDiagnostics';
import { detectCarrier } from './carrierDetector';

describe('Built-in Self-Test (BIST) Diagnostics Engine', () => {
  let mockStore = {};

  const createMockStorage = () => {
    let store = {};
    return {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  };

  beforeAll(() => {
    // Polyfill globalThis.localStorage for Node/Vitest environments if absent
    if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
      globalThis.localStorage = {
        getItem: (key) => (Object.prototype.hasOwnProperty.call(mockStore, key) ? mockStore[key] : null),
        setItem: (key, value) => { mockStore[key] = String(value); },
        removeItem: (key) => { delete mockStore[key]; },
        clear: () => { mockStore = {}; }
      };
    }
  });

  beforeEach(() => {
    mockStore = {};
    if (typeof globalThis.localStorage?.clear === 'function') {
      globalThis.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  describe('1. Storage Self Test (runStorageSelfTest)', () => {
    it('passes standard write-read-delete cycle with global or injected localStorage', () => {
      const result = runStorageSelfTest();
      expect(result.id).toBe('storage-self-test');
      expect(result.status).toBe('PASS');
      expect(result.message).toContain('completed successfully');
      expect(result.details).toBeDefined();
    });

    it('passes standard write-read-delete cycle with explicit mock storage instance', () => {
      const storage = createMockStorage();
      const result = runStorageSelfTest(storage);
      expect(result.status).toBe('PASS');
      expect(result.message).toContain('completed successfully');
    });

    it('fails when storage throws QuotaExceededError or security block', () => {
      const mockStorage = {
        setItem: () => {
          const err = new Error('QuotaExceededError: Dom storage quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        },
        getItem: () => null,
        removeItem: () => {}
      };

      const result = runStorageSelfTest(mockStorage);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('Quota/Private browsing lock');
      expect(result.details.error).toBe('QuotaExceededError');
    });

    it('fails when read value mismatches written payload', () => {
      const mockStorage = {
        setItem: () => {},
        getItem: () => 'corrupted_value',
        removeItem: () => {}
      };

      const result = runStorageSelfTest(mockStorage);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('read mismatch');
    });

    it('fails when delete fails to clear the item', () => {
      let stored = null;
      const mockStorage = {
        setItem: (_k, v) => { stored = v; },
        getItem: () => stored,
        removeItem: () => { /* no-op simulating persistence */ }
      };

      const result = runStorageSelfTest(mockStorage);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('delete cycle failed');
    });

    it('fails gracefully when storage API is missing or null', () => {
      const result = runStorageSelfTest(null);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('unavailable');
    });
  });

  describe('2. Carrier Regex Self Test (runCarrierRegexSelfTest)', () => {
    it('verifies all gold-standard tracking numbers for Israel Post, Cainiao, DHL, FedEx, UPS', () => {
      const result = runCarrierRegexSelfTest();
      expect(result.id).toBe('carrier-regex-self-test');
      expect(result.status).toBe('PASS');
      expect(result.message).toContain('100% precision');
      
      const expectedCarriers = ['israel-post', 'cainiao', 'dhl', 'fedex', 'ups'];
      expectedCarriers.forEach(carrierId => {
        expect(result.details.results[carrierId]).toBeDefined();
        expect(result.details.results[carrierId].matched).toBe(true);
        expect(result.details.results[carrierId].detectedCarrierId).toBe(carrierId);
      });
    });

    it('gold-standard tracking numbers directly resolve with detectCarrier()', () => {
      expect(detectCarrier(GOLD_STANDARD_CARRIER_SAMPLES['israel-post']).carrierId).toBe('israel-post');
      expect(detectCarrier(GOLD_STANDARD_CARRIER_SAMPLES['cainiao']).carrierId).toBe('cainiao');
      expect(detectCarrier(GOLD_STANDARD_CARRIER_SAMPLES['dhl']).carrierId).toBe('dhl');
      expect(detectCarrier(GOLD_STANDARD_CARRIER_SAMPLES['fedex']).carrierId).toBe('fedex');
      expect(detectCarrier(GOLD_STANDARD_CARRIER_SAMPLES['ups']).carrierId).toBe('ups');
    });

    it('fails when carrier regex yields incorrect carrier resolution', () => {
      const flawedSamples = {
        ...GOLD_STANDARD_CARRIER_SAMPLES,
        'dhl': 'INVALID_NON_EXISTENT_FORMAT_999'
      };

      const result = runCarrierRegexSelfTest(flawedSamples);
      expect(result.status).toBe('FAIL');
      expect(result.details.failures.length).toBeGreaterThan(0);
      expect(result.details.failures[0].carrier).toBe('dhl');
    });
  });

  describe('3. Memory Bounds Self Test (runMemoryBoundsSelfTest)', () => {
    it(`asserts that 1,000 package limit constraint is intact (${MAX_PACKAGE_MEMORY_BOUND} items)`, () => {
      const result = runMemoryBoundsSelfTest();
      expect(result.id).toBe('memory-bounds-self-test');
      expect(result.status).toBe('PASS');
      expect(result.details.limit).toBe(1000);
      expect(result.details.outputSize).toBe(1000);
      expect(result.details.inputSize).toBe(1250);
    });

    it('asserts that larger input sizes (e.g. 2,000 items) are strictly capped at 1,000 items', () => {
      const result = runMemoryBoundsSelfTest(2000);
      expect(result.status).toBe('PASS');
      expect(result.details.limit).toBe(1000);
      expect(result.details.outputSize).toBe(1000);
      expect(result.details.inputSize).toBe(2000);
    });
  });

  describe('4. Aggregate BIST Diagnostics (runAllBistDiagnostics)', () => {
    it('aggregates all probes into a 100% PASS structured report with global or custom storage', () => {
      const storage = createMockStorage();
      const report = runAllBistDiagnostics({ storage });

      expect(report).toHaveProperty('status', 'PASS');
      expect(report).toHaveProperty('timestamp');
      expect(report.summary).toEqual({
        total: 3,
        passed: 3,
        failed: 0,
        warnings: 0
      });
      expect(report.checks).toHaveLength(3);

      const checkIds = report.checks.map(c => c.id);
      expect(checkIds).toContain('storage-self-test');
      expect(checkIds).toContain('carrier-regex-self-test');
      expect(checkIds).toContain('memory-bounds-self-test');
      
      report.checks.forEach(check => {
        expect(check.status).toBe('PASS');
      });
    });

    it('aggregates to FAIL if any individual probe fails', () => {
      const failingStorage = {
        setItem: () => { throw new Error('Quota lock'); },
        getItem: () => null,
        removeItem: () => {}
      };

      const report = runAllBistDiagnostics({ storage: failingStorage });

      expect(report.status).toBe('FAIL');
      expect(report.summary.total).toBe(3);
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(1);

      const failedCheck = report.checks.find(c => c.id === 'storage-self-test');
      expect(failedCheck?.status).toBe('FAIL');
    });
  });
});
