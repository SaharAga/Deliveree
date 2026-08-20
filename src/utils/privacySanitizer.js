/**
 * @file privacySanitizer.js
 * @description Enterprise privacy sanitization & client-side cryptographic hashing.
 * Implements anti-profiling redaction and PII anonymization according to OWASP ASVS Level 3.
 * Zero external heavy dependencies.
 */

// Regex patterns for sensitive PII identification with RFC-bounded lengths (prevents ReDoS)
// 1. Email pattern: RFC 5321 specifies max 64 chars local-part and max 63 chars per domain label
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,63}/gi;

// 2. Credit Card patterns (Visa, MasterCard, Amex, Discover 13-19 digits with optional spaces/hyphens)
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]){3}\d{4}\b|\b\d{13,19}\b/g;

// 3. Israeli phone numbers:
// Mobile: 05\d-?\d{7} (e.g. 050-1234567, 0521234567, 054-9876543) or +972-?5\d-?\d{7}
// Landline: 0[23489]-?\d{7} (e.g. 03-1234567, 021234567) or +972-?[23489]-?\d{7}
const ISRAELI_PHONE_REGEX = /(?:\+972[- ]?|0)(?:5[0-9]|[23489])[- ]?[0-9]{7}(?!\d)/g;
const GENERAL_PHONE_REGEX = /(?:\+\d{1,3}[- ]|\b\d{1,3}[- ])?(?:\(\d{2,4}\)|\b\d{2,4})[- ]\d{3,4}[- ]\d{4}\b/g;

// 4. Common personal name/address indicators or delivery notes (bounded to 150 chars max)
const PERSONAL_NOTE_PREFIXES = /\b(?:attn|attention|name|recipient|contact|c\/o|care of|apt|apartment|suite|floor|door code|code|passcode|deliver to|leave with)[:\s]+[^\n,.;]{1,150}/gi;

/**
 * Fast keyword check to avoid running note regex over large strings without indicator tokens.
 */
const NOTE_KEYWORDS_PRECHECK = /\b(?:attn|attention|name|recipient|contact|c\/o|care of|apt|apartment|suite|floor|door code|code|passcode|deliver to|leave with)/i;

/**
 * Checks whether a given string contains any recognizable Personally Identifiable Information (PII).
 * 
 * @param {unknown} text - Input text to evaluate.
 * @returns {boolean} True if PII pattern matches, false otherwise.
 */
export function containsPII(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }

  const hasDigits = /\d/.test(text);
  const hasAt = text.includes('@');
  const hasNoteTokens = NOTE_KEYWORDS_PRECHECK.test(text);

  if (!hasDigits && !hasAt && !hasNoteTokens) {
    return false;
  }

  if (hasAt) {
    EMAIL_REGEX.lastIndex = 0;
    if (EMAIL_REGEX.test(text)) return true;
  }

  if (hasDigits) {
    CREDIT_CARD_REGEX.lastIndex = 0;
    if (CREDIT_CARD_REGEX.test(text)) return true;

    ISRAELI_PHONE_REGEX.lastIndex = 0;
    if (ISRAELI_PHONE_REGEX.test(text)) return true;

    GENERAL_PHONE_REGEX.lastIndex = 0;
    if (GENERAL_PHONE_REGEX.test(text)) return true;
  }

  if (hasNoteTokens) {
    PERSONAL_NOTE_PREFIXES.lastIndex = 0;
    if (PERSONAL_NOTE_PREFIXES.test(text)) return true;
  }

  return false;
}

/**
 * Redacts Personally Identifiable Information (PII) from a string.
 * Scrubs emails, credit card numbers, Israeli and international phones, and delivery note labels.
 * 
 * @param {unknown} text - The input string containing potential PII.
 * @returns {string} Sanitized string with PII replaced by redaction placeholders.
 */
export function redactPII(text) {
  if (typeof text !== 'string' || !text) {
    return '';
  }

  const hasDigits = /\d/.test(text);
  const hasAt = text.includes('@');
  const hasNoteTokens = NOTE_KEYWORDS_PRECHECK.test(text);

  if (!hasDigits && !hasAt && !hasNoteTokens) {
    return text;
  }

  let result = text;

  if (hasAt) {
    result = result.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
  }

  if (hasDigits) {
    result = result
      .replace(CREDIT_CARD_REGEX, '[REDACTED_CREDIT_CARD]')
      .replace(ISRAELI_PHONE_REGEX, '[REDACTED_PHONE]')
      .replace(GENERAL_PHONE_REGEX, '[REDACTED_PHONE]');
  }

  if (hasNoteTokens) {
    result = result.replace(PERSONAL_NOTE_PREFIXES, (match) => {
      const parts = match.split(/[:\s]+/);
      const prefix = parts[0] || 'NOTE';
      return `${prefix}: [REDACTED_PERSONAL_INFO]`;
    });
  }

  return result;
}

/**
 * Pure JavaScript synchronous implementation of SHA-256 for browser and Node.js environments.
 * Used for deterministic client-side salted hashing without external libraries or asynchronous WebCrypto overhead.
 * 
 * @param {string} ascii - Input string to hash.
 * @returns {string} Hexadecimal SHA-256 hash string.
 */
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  // Constants: first 32 bits of the fractional parts of the cube roots of first 64 primes (2..311)
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x3910c8a5, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Initial hash values: first 32 bits of fractional parts of square roots of first 8 primes (2..19)
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const utf8 = unescape(encodeURIComponent(ascii));
  const utf8Length = utf8[lengthProperty];

  for (i = 0; i < utf8Length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }

  words[utf8Length >> 2] |= 0x80 << ((3 - (utf8Length % 4)) * 8);
  words[(((utf8Length + 8) >> 6) << 4) + 15] = asciiBitLength;

  const w = new Array(64);

  for (i = 0; i < words[lengthProperty]; i += 16) {
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const bVal = (hash[i] >> (8 * j)) & 255;
      result += (bVal < 16 ? '0' : '') + bVal.toString(16);
    }
  }

  return result;
}

/**
 * Generates a deterministic, local salted SHA-256 hash string for tracking numbers.
 * Enables anonymous telemetry analytics without leaking real courier tracking identifiers.
 * 
 * @param {string} trackingNumber - Courier tracking number to hash.
 * @param {string} [salt='deliveree_v1'] - Secret salt for anti-rainbow table protection.
 * @returns {string} Truncated or full salted SHA-256 hash (prefixed with `trk_hash_`).
 */
export function hashTrackingNumber(trackingNumber, salt = 'deliveree_v1') {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return '';
  }
  const cleanInput = trackingNumber.trim().toUpperCase();
  if (!cleanInput) {
    return '';
  }
  const combined = `${salt}:${cleanInput}`;
  const digest = sha256Sync(combined);
  return `trk_${digest.slice(0, 16)}`;
}

/**
 * Deeply sanitizes an arbitrary object, array, or primitive for telemetry or error reporting.
 * Scrubs any personal identifying information (PII) including email addresses, phone numbers,
 * credit cards, and sensitive customer keys before dispatch.
 * 
 * @template T
 * @param {T} payload - Telemetry payload or error report.
 * @returns {T} Sanitized payload safe for logging or remote telemetry transmission.
 */
export function sanitizeForTelemetry(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    return /** @type {T} */ (redactPII(payload));
  }

  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return /** @type {T} */ (payload.map(item => sanitizeForTelemetry(item)));
  }

  if (typeof payload === 'object') {
    /** @type {Record<string, any>} */
    const sanitizedObj = {};
    const sensitiveStringKeys = new Set([
      'password', 'token', 'auth', 'uid', 'creditcard', 'card', 'secret'
    ]);

    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();

      if (lowerKey === 'user') {
        if (typeof value === 'object' && value !== null) {
          sanitizedObj[key] = sanitizeForTelemetry(value);
        } else {
          sanitizedObj[key] = 'Anonymous Tester';
        }
      } else if (lowerKey === 'name' && typeof value === 'string') {
        sanitizedObj[key] = 'Anonymous Tester';
      } else if (lowerKey.includes('email') && typeof value === 'string') {
        sanitizedObj[key] = '[REDACTED_EMAIL]';
      } else if ((lowerKey.includes('phone') || lowerKey.includes('contact')) && typeof value === 'string') {
        sanitizedObj[key] = '[REDACTED_PHONE]';
      } else if (sensitiveStringKeys.has(lowerKey)) {
        sanitizedObj[key] = '[REDACTED]';
      } else if (lowerKey.includes('tracking') && typeof value === 'string') {
        sanitizedObj[key] = hashTrackingNumber(value);
      } else {
        sanitizedObj[key] = sanitizeForTelemetry(value);
      }
    }
    return /** @type {T} */ (sanitizedObj);
  }

  return payload;
}
