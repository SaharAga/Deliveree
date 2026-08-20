import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { detectCarrier, sanitizeTrackingNumber, validateUPUS10Mod11, validateMod10 } from './carrierDetector';

describe('Carrier Detection Property-Based Invariant Verification', () => {
  it('Property 1: Sanitization is idempotent: sanitize(sanitize(x)) === sanitize(x)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (raw) => {
        const pass1 = sanitizeTrackingNumber(raw);
        const pass2 = sanitizeTrackingNumber(pass1);
        return pass1 === pass2;
      }),
      { numRuns: 2000 }
    );
  });

  it('Property 2: detectCarrier never throws an exception for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (str) => {
        const result = detectCarrier(str);
        return typeof result === 'object' && result !== null && typeof result.carrierId === 'string';
      }),
      { numRuns: 2000 }
    );
  });

  it('Property 3: Valid UPU S10 generated codes pass checksum verification', () => {
    // Generate valid S10
    const upuGen = fc.tuple(
      fc.stringMatching(/^[A-Z]{2}$/),
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 }),
      fc.stringMatching(/^[A-Z]{2}$/)
    ).map(([prefix, serialDigits, suffix]) => {
      const weights = [8, 6, 4, 2, 3, 5, 9, 7];
      let sum = 0;
      for (let i = 0; i < 8; i++) {
        sum += serialDigits[i] * weights[i];
      }
      const rem = sum % 11;
      let check = 11 - rem;
      if (check === 10) check = 0;
      else if (check === 11) check = 5;

      return `${prefix}${serialDigits.join('')}${check}${suffix}`;
    });

    fc.assert(
      fc.property(upuGen, (validCode) => {
        return validateUPUS10Mod11(validCode) === true;
      }),
      { numRuns: 1000 }
    );
  });

  it('Property 4: USPS 22-digit Mod 10 generated numbers pass validateMod10', () => {
    const mod10Gen = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 21, maxLength: 21 }).map((digits) => {
      const weights = [3, 1];
      let sum = 0;
      for (let i = digits.length - 1, w = 0; i >= 0; i--, w++) {
        sum += digits[i] * weights[w % 2];
      }
      const rem = sum % 10;
      const check = (10 - rem) % 10;
      return `${digits.join('')}${check}`;
    });

    fc.assert(
      fc.property(mod10Gen, (validMod10) => {
        return validateMod10(validMod10, [3, 1]) === true;
      }),
      { numRuns: 1000 }
    );
  });
});
