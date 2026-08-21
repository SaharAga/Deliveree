import { CARRIERS } from '../types/carriers';

/**
 * Universal Tracking Number Sanitizer
 * Strips whitespace, control characters, hyphens, and non-printable noise
 * @param {string} trackingNumber 
 * @returns {string}
 */
export function sanitizeTrackingNumber(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') return '';
  // Max cap 100 chars to avoid ReDoS or memory DOS
  const trimmed = trackingNumber.trim().slice(0, 100);
  // Remove whitespace, dashes, spaces, tabs, zero-width chars
  return trimmed.toUpperCase().replace(/[\s\-_.\u200B-\u200D\uFEFF]+/g, '');
}

/**
 * Modulo 10 Checksum Algorithm (Luhn / USPS / FedEx Mod 10)
 * Calculates standard weighted modulo 10 checksum verification.
 * 
 * @param {string} digits - Numeric string of digits
 * @param {number[]} weights - Alternating weights (e.g., [3, 1] or [1, 3])
 * @param {number} checkDigitIndex - Position of check digit (default: last digit)
 * @returns {boolean}
 */
export function validateMod10(digits, weights = [3, 1], checkDigitIndex = digits.length - 1) {
  if (!digits || typeof digits !== 'string' || !/^\d+$/.test(digits)) return false;
  if (digits.length < 2) return false;

  const checkDigit = parseInt(digits[checkDigitIndex], 10);
  const dataDigits = digits.slice(0, checkDigitIndex) + digits.slice(checkDigitIndex + 1);

  let sum = 0;
  // Calculate from right to left of dataDigits
  for (let i = dataDigits.length - 1, wIdx = 0; i >= 0; i--, wIdx++) {
    const weight = weights[wIdx % weights.length];
    sum += parseInt(dataDigits[i], 10) * weight;
  }

  const remainder = sum % 10;
  const calculatedCheck = remainder === 0 ? 0 : 10 - remainder;
  return calculatedCheck === checkDigit;
}

/**
 * Modulo 11 Checksum Algorithm (UPU S10 Standard for Israel Post, China Post, USPS S10, etc.)
 * Standard UPU S10 format: 2 letters + 8 serial digits + 1 check digit + 2 letters (e.g. RS123456789IL)
 * Weights: [8, 6, 4, 2, 3, 5, 9, 7]
 * 
 * @param {string} s10Identifier - Tracking number formatted as [A-Z]{2}\d{9}[A-Z]{2}
 * @returns {boolean}
 */
export function validateUPUS10Mod11(s10Identifier) {
  if (!s10Identifier || typeof s10Identifier !== 'string') return false;
  const clean = s10Identifier.trim().toUpperCase();
  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean)) return false;

  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  const digits = clean.slice(2, 10); // 8 serial digits
  const checkDigit = parseInt(clean[10], 10); // 9th digit is check digit

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let calculatedCheck = 11 - remainder;

  if (calculatedCheck === 10) {
    calculatedCheck = 0;
  } else if (calculatedCheck === 11) {
    calculatedCheck = 5;
  }

  return calculatedCheck === checkDigit;
}

/**
 * Modulo 11 Checksum (BoxIt & Local Israeli Couriers standard)
 * 
 * @param {string} digits 
 * @returns {boolean}
 */
export function validateMod11Generic(digits) {
  if (!digits || typeof digits !== 'string' || !/^\d+$/.test(digits)) return false;
  if (digits.length < 2) return false;

  const checkDigit = parseInt(digits[digits.length - 1], 10);
  const dataDigits = digits.slice(0, -1);

  let sum = 0;
  for (let i = dataDigits.length - 1, weight = 2; i >= 0; i--, weight++) {
    const w = weight > 7 ? (weight % 7) + 1 : weight;
    sum += parseInt(dataDigits[i], 10) * w;
  }

  const remainder = sum % 11;
  const calculatedCheck = (11 - remainder) % 11;
  return calculatedCheck === checkDigit;
}

/**
 * Automatically inspects a tracking number string and detects the most likely carrier,
 * with checksum verification and confidence scoring.
 * 
 * @param {string} trackingNumber - Raw tracking string
 * @returns {{ carrierId: string, confidence: 'high' | 'medium' | 'none', carrier: Object, isValidChecksum?: boolean }}
 */
export function detectCarrier(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return { carrierId: 'other', confidence: 'none', carrier: CARRIERS['other'] };
  }

  const cleaned = sanitizeTrackingNumber(trackingNumber);
  if (!cleaned) {
    return { carrierId: 'other', confidence: 'none', carrier: CARRIERS['other'] };
  }

  // 1. Israel Post (Standard UPU S10 ending in IL, e.g. RS123456789IL, or other IL postal formats)
  if (/^[A-Z]{2}\d{9}IL$/i.test(cleaned)) {
    const isUpuValid = validateUPUS10Mod11(cleaned);
    return { 
      carrierId: 'israel-post', 
      confidence: 'high', 
      carrier: CARRIERS['israel-post'],
      isValidChecksum: isUpuValid
    };
  }
  if (cleaned.length >= 9 && cleaned.endsWith('IL') && /^[A-Z0-9]+$/i.test(cleaned)) {
    return { carrierId: 'israel-post', confidence: 'high', carrier: CARRIERS['israel-post'] };
  }

  // 2. Chita Delivery (CH..., CT..., CHT...)
  if (/^(CH|CT)\d{8,12}$/i.test(cleaned) || /^CHT[A-Z0-9]{8,12}$/i.test(cleaned)) {
    return { carrierId: 'chita', confidence: 'high', carrier: CARRIERS['chita'] };
  }

  // 3. BoxIt (BOX..., BX...)
  if (/^BOX[0-9A-Z]{6,12}$/i.test(cleaned) || /^BX\d{7,10}$/i.test(cleaned)) {
    return { carrierId: 'boxit', confidence: 'high', carrier: CARRIERS['boxit'] };
  }

  // 4. HFD Delivery / E-Post (HFD..., EP..., 5...)
  if (/^HFD\d{8,12}$/i.test(cleaned) || /^EP\d{8,12}$/i.test(cleaned)) {
    return { carrierId: 'hfd', confidence: 'high', carrier: CARRIERS['hfd'] };
  }

  // 5. Tapuz / YDM
  if (/^(TPZ|YDM)\d{7,12}$/i.test(cleaned)) {
    return { carrierId: 'tapuz', confidence: 'high', carrier: CARRIERS['tapuz'] };
  }

  // 6. Cargo Express
  if (/^CRG\d{7,12}$/i.test(cleaned) || /^CARGO\d{6,10}$/i.test(cleaned)) {
    return { carrierId: 'cargo', confidence: 'high', carrier: CARRIERS['cargo'] };
  }

  // 7. GetPackage
  if (/^GP[A-Z0-9]{8,12}$/i.test(cleaned) || /^GET\d{8,10}$/i.test(cleaned)) {
    return { carrierId: 'getpackage', confidence: 'high', carrier: CARRIERS['getpackage'] };
  }

  // 8. Flying Cargo / FedEx Israel
  if (/^FC\d{8,12}$/i.test(cleaned)) {
    return { carrierId: 'flying-cargo', confidence: 'high', carrier: CARRIERS['flying-cargo'] };
  }

  // 9. Orian / UPS Israel
  if (/^(OR|ORN)\d{8,12}$/i.test(cleaned)) {
    return { carrierId: 'orian', confidence: 'high', carrier: CARRIERS['orian'] };
  }

  // 10. Bar Distribution
  if (/^BAR\d{7,12}$/i.test(cleaned)) {
    return { carrierId: 'bar', confidence: 'high', carrier: CARRIERS['bar'] };
  }

  // 11. ZigZag
  if (/^ZZ\d{7,12}$/i.test(cleaned) || /^ZIG\d{6,10}$/i.test(cleaned)) {
    return { carrierId: 'zigzag', confidence: 'high', carrier: CARRIERS['zigzag'] };
  }

  // 12. YunExpress (YT...)
  if (/^YT\d{16,18}$/i.test(cleaned)) {
    return { carrierId: 'yunexpress', confidence: 'high', carrier: CARRIERS['yunexpress'] };
  }

  // 13. Cainiao / AliExpress (LP..., CAINIAO..., CN..., AE...)
  if (/^(LP|CAINIAO)\d+/i.test(cleaned) || /^[A-Z]{2}\d{9}CN$/i.test(cleaned) || /^AE[A-Z0-9]{10,18}$/i.test(cleaned) || /^CN\d{10,}$/i.test(cleaned)) {
    const isUpuValid = /^[A-Z]{2}\d{9}CN$/i.test(cleaned) ? validateUPUS10Mod11(cleaned) : true;
    return { 
      carrierId: 'cainiao', 
      confidence: 'high', 
      carrier: CARRIERS['cainiao'],
      isValidChecksum: isUpuValid 
    };
  }

  // 14. 4PX
  if (/^4PX\d+/i.test(cleaned) || /^FPX\d+/i.test(cleaned)) {
    return { carrierId: '4px', confidence: 'high', carrier: CARRIERS['4px'] };
  }

  // 15. UPS (1Z...)
  if (/^1Z[0-9A-Z]{16}$/i.test(cleaned)) {
    return { carrierId: 'ups', confidence: 'high', carrier: CARRIERS['ups'] };
  }

  // 16. Royal Mail (UK - ends with GB)
  if (/^[A-Z]{2}\d{9}GB$/i.test(cleaned)) {
    const isUpuValid = validateUPUS10Mod11(cleaned);
    return { 
      carrierId: 'royal-mail', 
      confidence: 'high', 
      carrier: CARRIERS['royal-mail'],
      isValidChecksum: isUpuValid
    };
  }

  // 17. USPS (9400..., 9200..., 9300..., ends with US)
  if (/^9[234]\d{20}$/.test(cleaned)) {
    const isMod10Valid = validateMod10(cleaned, [3, 1]);
    return { 
      carrierId: 'usps', 
      confidence: 'high', 
      carrier: CARRIERS['usps'],
      isValidChecksum: isMod10Valid
    };
  }
  if (/^[A-Z]{2}\d{9}US$/i.test(cleaned)) {
    const isUpuValid = validateUPUS10Mod11(cleaned);
    return { 
      carrierId: 'usps', 
      confidence: 'high', 
      carrier: CARRIERS['usps'],
      isValidChecksum: isUpuValid 
    };
  }

  // 18. Yanwen (e.g. UY894729184YP, VR...YP, LP...YP)
  if (/^U[A-Z]\d{9}YP$/i.test(cleaned) || /^VR\d{9}YP$/i.test(cleaned) || /^LP\d{14}YP$/i.test(cleaned) || (cleaned.length >= 10 && cleaned.endsWith('YP'))) {
    return { carrierId: 'yanwen', confidence: 'high', carrier: CARRIERS['yanwen'] };
  }

  // 19. Aramex (10-11 digits starting with 3, or standard 11 digits)
  if (/^3\d{9}$/.test(cleaned) || /^\d{11}$/.test(cleaned)) {
    return { carrierId: 'aramex', confidence: 'high', carrier: CARRIERS['aramex'] };
  }

  // 20. DHL (10 numeric digits, or JJD prefix, GM...)
  if (/^\d{10}$/.test(cleaned) || /^JJD\d+/i.test(cleaned) || /^GM\d{16,18}$/i.test(cleaned)) {
    return { carrierId: 'dhl', confidence: 'high', carrier: CARRIERS['dhl'] };
  }

  // 21. FedEx (12 or 15 digits)
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned) || /^\d{20}$/.test(cleaned) || /^\d{22}$/.test(cleaned)) {
    return { carrierId: 'fedex', confidence: 'high', carrier: CARRIERS['fedex'] };
  }

  // 22. Check carrier patterns loop for any remaining
  for (const carrier of Object.values(CARRIERS)) {
    if (carrier.id === 'other') continue;
    for (const pattern of carrier.patterns) {
      if (pattern.test(cleaned)) {
        return { carrierId: carrier.id, confidence: 'medium', carrier };
      }
    }
  }

  return { carrierId: 'other', confidence: 'none', carrier: CARRIERS['other'] };
}
