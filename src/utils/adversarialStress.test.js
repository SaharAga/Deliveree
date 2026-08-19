import { describe, it, expect } from 'vitest';
import { sanitizeString, validatePackage, validatePackageList } from './packageValidator';
import { parseSmartText } from './smartParser';


describe('Tier 5 Adversarial Stress & Anti-Fragility Testbench', () => {
  describe('Fuzzing & Payload Torture on sanitizeString', () => {
    it('survives nested recursive XSS attack vectors without throwing or leaving active scripts', () => {
      const recursivePayloads = [
        '<scr<script>ipt>alert(1)</scr</script>ipt>',
        '<<<script>>>alert(1)<</script>>',
        '<svg/onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<a href="javascript:alert(1)">Click Me</a>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      for (const payload of recursivePayloads) {
        const cleaned = sanitizeString(payload);
        expect(cleaned).not.toContain('<script');
        expect(cleaned).not.toContain('onload=');
        expect(cleaned).not.toContain('javascript:');
      }
    });

    it('survives massive 2MB strings without causing ReDoS or catastrophic backtracking', () => {
      const start = performance.now();
      const largePayload = 'A'.repeat(500000) + '<script>evil()</script>' + 'B'.repeat(500000);
      const result = sanitizeString(largePayload, 200);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Must process in under 100ms
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Extreme Boundary Conditions & Prototype Tampering on validatePackage', () => {
    it('defends against __proto__, constructor, and Object.prototype poisoning', () => {
      const poison = {
        id: 'pkg-poison-1',
        title: 'Harmless Package',
        trackingNumber: 'RR123456789IL',
        __proto__: { isAdmin: true, polluted: 'CRITICAL_VULNERABILITY' },
        constructor: { prototype: { backdoor: true } }
      };

      const result = validatePackage(poison);
      expect(result).not.toBeNull();
      expect({}.polluted).toBeUndefined();
      expect({}.isAdmin).toBeUndefined();
      expect({}.backdoor).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('rejects cyclical object references safely without infinite recursion / call-stack overflow', () => {
      const cyclic = {
        id: 'pkg-cyclic',
        title: 'Cyclic Ref Package',
        trackingNumber: 'LP123456789CN'
      };
      cyclic.self = cyclic;

      expect(() => validatePackage(cyclic)).not.toThrow();
      const validated = validatePackage(cyclic);
      expect(validated).not.toBeNull();
      expect(validated.self).toBeUndefined();
    });
  });

  describe('Smart Parser Adversarial Inputs', () => {
    it('handles garbage unicode, emojis, and binary junk gracefully', () => {
      const garbage = '📦🚀 🔥 דואר ישראל 💥 𝓤𝓷𝓲𝓬𝓸𝓭𝓮 𝗧𝗲𝘅𝘁 \u0000\u0007 RS948219481IL לחלוקה 4821';
      const parsed = parseSmartText(garbage);

      expect(parsed.trackingNumber).toBe('RS948219481IL');
      expect(parsed.carrier).toBe('israel-post');
    });

    it('correctly extracts tracking when surrounded by punctuation and URLs', () => {
      const text = 'Check out tracking at https://israelpost.co.il/item?code=RR987654321IL. Contact us!';
      const parsed = parseSmartText(text);

      expect(parsed.trackingNumber).toBe('RR987654321IL');
      expect(parsed.carrier).toBe('israel-post');
    });
  });

  describe('Storage Quota & Concurrency Race Stress', () => {
    it('enforces package list limit of 1000 items and strips excess', () => {
      const oversizedList = Array.from({ length: 1200 }, (_, i) => ({
        id: `pkg-${i}`,
        title: `Package ${i}`,
        trackingNumber: `RR${String(i).padStart(9, '0')}IL`,
        carrier: 'israel-post'
      }));

      const validated = validatePackageList(oversizedList);
      expect(validated.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('BIST Diagnostic Engine Stress & Adversarial Torture', () => {
    it('handles simulated storage quota exhaustion across multiple browser engines gracefully', async () => {
      const { runStorageSelfTest, runAllBistDiagnostics } = await import('./bistDiagnostics');

      const quotaErrors = [
        Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError', code: 22 }),
        Object.assign(new Error('NS_ERROR_DOM_QUOTA_REACHED'), { name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 1014 }),
        Object.assign(new Error('Persistent storage full (DOMException)'), { name: 'DOMException' }),
        new Error('Disk full / write failure')
      ];

      for (const error of quotaErrors) {
        const mockFailingStorage = {
          setItem: () => { throw error; },
          getItem: () => null,
          removeItem: () => {}
        };

        const result = runStorageSelfTest(mockFailingStorage);
        expect(result.status).toBe('FAIL');
        expect(result.message).toContain('Quota/Private browsing lock');

        const aggregate = runAllBistDiagnostics({ storage: mockFailingStorage });
        expect(aggregate.status).toBe('FAIL');
        expect(aggregate.summary.failed).toBe(1);
      }
    });

    it('resists prototype pollution payloads injected into custom carrier samples and storage objects', async () => {
      const { runCarrierRegexSelfTest, runAllBistDiagnostics, runMemoryBoundsSelfTest } = await import('./bistDiagnostics');

      // Poisoned sample object
      const maliciousSamples = Object.assign(
        Object.create(null),
        {
          'israel-post': 'RS948219481IL',
          '__proto__': { isAdmin: true, bypass: true },
          'constructor': { prototype: { hijacked: true } }
        }
      );

      const regexResult = runCarrierRegexSelfTest(maliciousSamples);
      expect(regexResult.status).toBe('PASS');
      expect({}.isAdmin).toBeUndefined();
      expect({}.hijacked).toBeUndefined();

      // Memory bounds with prototype poisoned entries
      const poisonedMemoryLimit = 1500;
      const memResult = runMemoryBoundsSelfTest(poisonedMemoryLimit);
      expect(memResult.status).toBe('PASS');
      expect(memResult.details.limit).toBe(1000);

      // Aggregate report under prototype attack with mock storage
      const mockStorage = {
        _store: {},
        getItem(key) { return this._store[key] || null; },
        setItem(key, val) { this._store[key] = String(val); },
        removeItem(key) { delete this._store[key]; }
      };

      const aggregate = runAllBistDiagnostics({ storage: mockStorage, carrierSamples: maliciousSamples });
      expect(aggregate.status).toBe('PASS');
      expect({}.bypass).toBeUndefined();
    });
  });
});


