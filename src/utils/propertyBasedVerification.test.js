import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeString, validatePackage, validatePackageList } from './packageValidator';
import { parseSmartText, extractTrackingCandidates } from './smartParser';
import { CARRIER_LIST } from '../types/carriers';
import { GOLD_STANDARD_CARRIER_SAMPLES } from './bistDiagnostics';


const VALID_STATUSES = ['ordered', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'customs'];
const VALID_CARRIERS = CARRIER_LIST.map(c => c.id);

describe('High-Assurance Property-Based Verification (fast-check)', () => {
  describe('Mathematical Properties of sanitizeString', () => {
    it('Idempotence: sanitizeString(sanitizeString(x)) === sanitizeString(x)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const pass1 = sanitizeString(input, 200);
          const pass2 = sanitizeString(pass1, 200);
          expect(pass1).toBe(pass2);
        }),
        { numRuns: 500 }
      );
    });

    it('Bounded Length Invariant: len(sanitizeString(x, N)) <= N for all inputs', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer({ min: 0, max: 500 }), (input, maxLen) => {
          const result = sanitizeString(input, maxLen);
          expect(result.length).toBeLessThanOrEqual(maxLen);
        }),
        { numRuns: 500 }
      );
    });

    it('XSS Script Immunity: output never contains unencoded script tags', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeString(input, 500);
          expect(result.toLowerCase()).not.toContain('<script');
          expect(result.toLowerCase()).not.toContain('javascript:');
          expect(result.toLowerCase()).not.toContain('onload=');
        }),
        { numRuns: 500 }
      );
    });
  });



  describe('Contract & Invariant Properties of validatePackage', () => {
    it('Total Safety: Never throws runtime exceptions on arbitrary untyped input', () => {
      fc.assert(
        fc.property(fc.anything(), (arbitraryObject) => {
          expect(() => validatePackage(arbitraryObject)).not.toThrow();
        }),
        { numRuns: 500 }
      );
    });

    it('Schema Conformance Invariant: Validated package always contains valid status and carrier enums', () => {
      const packageArbitrary = fc.record({
        id: fc.option(fc.string(), { nil: undefined }),
        title: fc.option(fc.string(), { nil: undefined }),
        trackingNumber: fc.string(),
        carrier: fc.option(fc.string(), { nil: undefined }),
        status: fc.option(fc.string(), { nil: undefined }),
        notes: fc.option(fc.string(), { nil: undefined })
      });

      fc.assert(
        fc.property(packageArbitrary, (rawPkg) => {
          const validated = validatePackage(rawPkg);
          if (validated) {
            expect(VALID_STATUSES).toContain(validated.status);
            expect(VALID_CARRIERS).toContain(validated.carrier);
            expect(typeof validated.id).toBe('string');
            expect(typeof validated.title).toBe('string');
            expect(Array.isArray(validated.checkpoints)).toBe(true);
          }
        }),
        { numRuns: 500 }
      );
    });

    it('Checkpoint Timestamp Monotonicity Invariant: Validated checkpoints preserve chronological or defined order', () => {
      const checkpointArbitrary = fc.record({
        id: fc.string(),
        title: fc.string(),
        timestamp: fc.integer({ min: 946684800000, max: 1893456000000 }).map(epoch => new Date(epoch).toISOString()),
        isCompleted: fc.boolean()
      });

      const packageWithCheckpointsArbitrary = fc.record({
        title: fc.string(),
        trackingNumber: fc.string({ minLength: 5 }),
        checkpoints: fc.array(checkpointArbitrary, { minLength: 2, maxLength: 20 })
      });

      fc.assert(
        fc.property(packageWithCheckpointsArbitrary, (rawPkg) => {
          // Sort checkpoints strictly ascending by epoch timestamp
          const sortedCheckpoints = [...rawPkg.checkpoints].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          const pkg = {
            ...rawPkg,
            checkpoints: sortedCheckpoints
          };

          const validated = validatePackage(pkg);
          expect(validated).not.toBeNull();
          expect(validated.checkpoints.length).toBe(sortedCheckpoints.length);

          // Verify monotonicity is preserved across validation
          for (let i = 0; i < validated.checkpoints.length - 1; i++) {
            const currTime = new Date(validated.checkpoints[i].timestamp).getTime();
            const nextTime = new Date(validated.checkpoints[i + 1].timestamp).getTime();
            expect(currTime).toBeLessThanOrEqual(nextTime);
          }
        }),
        { numRuns: 300 }
      );
    });
  });

  describe('Completeness Property for Smart Parsing', () => {
    // Known valid tracking number formats across carriers
    const validTrackingGenerators = [
      fc.constantFrom(...Object.values(GOLD_STANDARD_CARRIER_SAMPLES)),
      fc.stringMatching(/^[A-Z]{2}\d{9}IL$/),
      fc.stringMatching(/^1Z[0-9A-Z]{16}$/),
      fc.stringMatching(/^LP\d{14}$/),
      fc.stringMatching(/^YT\d{16}$/),
      fc.stringMatching(/^\d{10}$/)
    ];

    it('Completeness: tracking number t is reliably extracted from noise + t + noise', () => {
      // Noise containing Hebrew and English phrases, spaces, and punctuation
      const noiseArbitrary = fc.stringMatching(/^[a-zA-Z0-9 א-ת,.:;!?-]{0,50}$/);
      const trackingArbitrary = fc.oneof(...validTrackingGenerators);

      fc.assert(
        fc.property(noiseArbitrary, trackingArbitrary, noiseArbitrary, (noisePrefix, trackingNum, noiseSuffix) => {
          // Surround tracking number with whitespace/delimiters to simulate realistic messages
          const embeddedText = `${noisePrefix} ${trackingNum} ${noiseSuffix}`;
          const parsed = parseSmartText(embeddedText);

          // The extracted tracking candidate set must contain the tracking number,
          // and parseSmartText should resolve the tracking number
          const candidates = extractTrackingCandidates(embeddedText);
          expect(candidates).toContain(trackingNum);
          expect(parsed.trackingNumber).toBe(trackingNum);
        }),
        { numRuns: 300 }
      );
    });
  });

  describe('List Size & Memory Conservation Invariant', () => {
    it('Strict Size Bound: validatePackageList never returns more than 1,000 items', () => {
      fc.assert(
        fc.property(fc.array(fc.record({ trackingNumber: fc.string() }), { maxLength: 1500 }), (rawList) => {
          const validated = validatePackageList(rawList);
          expect(validated.length).toBeLessThanOrEqual(1000);
        }),
        { numRuns: 200 }
      );
    });
  });
});
