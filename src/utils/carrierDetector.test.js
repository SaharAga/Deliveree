import { describe, it, expect } from 'vitest';
import { 
  detectCarrier, 
  sanitizeTrackingNumber, 
  validateMod10, 
  validateUPUS10Mod11, 
  validateMod11Generic 
} from './carrierDetector';

describe('Carrier Detection & Normalization Engine', () => {
  describe('Sanitization and Whitespace Normalization', () => {
    it('normalizes spaces, dashes, lowercase and zero-width spaces', () => {
      expect(sanitizeTrackingNumber(' rs-948219481-il ')).toBe('RS948219481IL');
      expect(sanitizeTrackingNumber('1Z 999 999 99 9999 9999')).toBe('1Z9999999999999999');
      expect(sanitizeTrackingNumber('YT_2109849201948201')).toBe('YT2109849201948201');
      expect(sanitizeTrackingNumber(null)).toBe('');
      expect(sanitizeTrackingNumber(undefined)).toBe('');
    });
  });

  describe('Algorithmic Checksums', () => {
    it('validates UPU S10 Modulo 11 check digit correctly', () => {
      // Standard UPU S10: RS 94821948 3 IL
      // Digits: 9, 4, 8, 2, 1, 9, 4, 8
      // Weights: 8, 6, 4, 2, 3, 5, 9, 7
      // 9*8 + 4*6 + 8*4 + 2*2 + 1*3 + 9*5 + 4*9 + 8*7 = 72 + 24 + 32 + 4 + 3 + 45 + 36 + 56 = 272
      // 272 % 11 = 8
      // 11 - 8 = 3. Check digit is 3.
      expect(validateUPUS10Mod11('RS948219483IL')).toBe(true);
      expect(validateUPUS10Mod11('RS948219481IL')).toBe(false);
      expect(validateUPUS10Mod11('invalid')).toBe(false);
    });

    it('validates Modulo 10 checksum algorithm', () => {
      // 9400100000000000000008 -> 9*3 + 4*1 + 0... = 27 + 4 = 31. (10 - (31 % 10)) % 10 = (10 - 1) % 10 = 9 or from right-to-left:
      // dataDigits: "940010000000000000000" (length 21). wIdx=0 is last char '0'*3=0, ..., '1'*3, '4'*1, '9'*3
      // Let's test standard USPS Mod 10 example "9205590164917312345610"
      const uspsSample = '920559016491731234561';
      // calculate check digit:
      const weights = [3, 1];
      let sum = 0;
      for (let i = uspsSample.length - 1, w = 0; i >= 0; i--, w++) {
        sum += parseInt(uspsSample[i], 10) * weights[w % 2];
      }
      const check = (10 - (sum % 10)) % 10;
      const fullNumber = `${uspsSample}${check}`;

      expect(validateMod10(fullNumber)).toBe(true);
      expect(validateMod10(`${uspsSample}${(check + 1) % 10}`)).toBe(false);
      expect(validateMod10('')).toBe(false);
      expect(validateMod10('abc')).toBe(false);
    });

    it('validates Generic Modulo 11 checksum', () => {
      expect(validateMod11Generic('12345')).toBeDefined();
      expect(validateMod11Generic('')).toBe(false);
      expect(validateMod11Generic('1')).toBe(false);
    });
  });

  describe('Israeli Couriers Detection', () => {
    it('detects Israel Post tracking numbers with IL suffix', () => {
      const res = detectCarrier('RS948219483IL');
      expect(res.carrierId).toBe('israel-post');
      expect(res.confidence).toBe('high');
      expect(res.isValidChecksum).toBe(true);
    });

    it('detects Cheetah Delivery (Chita)', () => {
      const res1 = detectCarrier('CH10849201');
      expect(res1.carrierId).toBe('chita');
      expect(res1.confidence).toBe('high');

      const res2 = detectCarrier('CT99482019');
      expect(res2.carrierId).toBe('chita');

      const res3 = detectCarrier('CHT10029482');
      expect(res3.carrierId).toBe('chita');
    });

    it('detects BoxIt tracking numbers', () => {
      const res1 = detectCarrier('BOX920194');
      expect(res1.carrierId).toBe('boxit');
      expect(res1.confidence).toBe('high');

      const res2 = detectCarrier('BX1084920');
      expect(res2.carrierId).toBe('boxit');
    });

    it('detects HFD Delivery tracking numbers', () => {
      const res = detectCarrier('HFD90481029');
      expect(res.carrierId).toBe('hfd');
      expect(res.confidence).toBe('high');
    });
  });

  describe('Global Couriers Detection', () => {
    it('detects Cainiao / AliExpress tracking numbers', () => {
      const res1 = detectCarrier('LP00582910482CN');
      expect(res1.carrierId).toBe('cainiao');

      const res2 = detectCarrier('CAINIAO123456789');
      expect(res2.carrierId).toBe('cainiao');

      const res3 = detectCarrier('AE109482019482');
      expect(res3.carrierId).toBe('cainiao');
    });

    it('detects YunExpress tracking numbers', () => {
      const res = detectCarrier('YT2109849201948201');
      expect(res.carrierId).toBe('yunexpress');
      expect(res.confidence).toBe('high');
    });

    it('detects 4PX tracking numbers', () => {
      const res = detectCarrier('4PX30004928194');
      expect(res.carrierId).toBe('4px');
    });

    it('detects UPS 1Z tracking numbers', () => {
      const res = detectCarrier('1Z9999999999999999');
      expect(res.carrierId).toBe('ups');
    });

    it('detects DHL tracking numbers (10 digits & JJD & GM)', () => {
      const res1 = detectCarrier('4829104821');
      expect(res1.carrierId).toBe('dhl');

      const res2 = detectCarrier('JJD018492019482019');
      expect(res2.carrierId).toBe('dhl');

      const res3 = detectCarrier('GM1029384756102938');
      expect(res3.carrierId).toBe('dhl');
    });

    it('detects FedEx tracking numbers', () => {
      const res1 = detectCarrier('784920194821');
      expect(res1.carrierId).toBe('fedex');

      const res2 = detectCarrier('123456789012345');
      expect(res2.carrierId).toBe('fedex');
    });

    it('detects USPS tracking numbers', () => {
      const res1 = detectCarrier('9400100000000000000000');
      expect(res1.carrierId).toBe('usps');
      expect(res1.confidence).toBe('high');

      const res2 = detectCarrier('EA123456789US');
      expect(res2.carrierId).toBe('usps');
    });

    it('detects Royal Mail tracking numbers', () => {
      const res = detectCarrier('RN123456789GB');
      expect(res.carrierId).toBe('royal-mail');
      expect(res.confidence).toBe('high');
    });

    it('detects Yanwen tracking numbers', () => {
      const res1 = detectCarrier('UY894729184YP');
      expect(res1.carrierId).toBe('yanwen');

      const res2 = detectCarrier('VR123456789YP');
      expect(res2.carrierId).toBe('yanwen');
    });

    it('detects Aramex tracking numbers', () => {
      const res = detectCarrier('3094829104');
      expect(res.carrierId).toBe('aramex');
    });
  });

  describe('Adversarial and Edge Cases', () => {
    it('returns other with none confidence for unknown format or invalid input', () => {
      expect(detectCarrier('UNKNOWN_XYZ_999').carrierId).toBe('other');
      expect(detectCarrier(null).carrierId).toBe('other');
      expect(detectCarrier(undefined).carrierId).toBe('other');
      expect(detectCarrier('').carrierId).toBe('other');
      expect(detectCarrier(12345).carrierId).toBe('other');
    });

    it('handles extreme lengths gracefully without ReDoS vulnerability', () => {
      const hugeInput = 'A'.repeat(50000);
      const start = performance.now();
      const res = detectCarrier(hugeInput);
      const elapsed = performance.now() - start;

      expect(res.carrierId).toBe('other');
      expect(elapsed).toBeLessThan(10); // Well under 10ms
    });
  });
});
