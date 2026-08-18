import { CARRIERS } from '../types/carriers';

/**
 * Automatically inspects a tracking number string and detects the most likely carrier
 * @param {string} trackingNumber - Raw tracking string
 * @returns {{ carrierId: string, confidence: 'high' | 'medium' | 'none', carrier: Object }}
 */
export function detectCarrier(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return { carrierId: 'other', confidence: 'none', carrier: CARRIERS['other'] };
  }

  const cleaned = trackingNumber.trim().toUpperCase().replace(/\s+/g, '');

  // Check Israel Post first (e.g. RS123456789IL, RR..., CP..., or ends with IL)
  if (/^[A-Z]{2}\d{9}IL$/i.test(cleaned) || cleaned.endsWith('IL')) {
    return { carrierId: 'israel-post', confidence: 'high', carrier: CARRIERS['israel-post'] };
  }

  // Check Cainiao / AliExpress (LP..., CAINIAO..., CN...)
  if (/^(LP|CAINIAO)\d+/i.test(cleaned) || /^[A-Z]{2}\d{9}CN$/i.test(cleaned)) {
    return { carrierId: 'cainiao', confidence: 'high', carrier: CARRIERS['cainiao'] };
  }

  // Check 4PX
  if (/^4PX\d+/i.test(cleaned) || /^FPX\d+/i.test(cleaned)) {
    return { carrierId: '4px', confidence: 'high', carrier: CARRIERS['4px'] };
  }

  // Check UPS (1Z...)
  if (/^1Z[0-9A-Z]{16}$/i.test(cleaned)) {
    return { carrierId: 'ups', confidence: 'high', carrier: CARRIERS['ups'] };
  }

  // Check Yanwen (e.g. UY894729184YP, VR...YP)
  if (/^U[A-Z]\d{9}YP$/i.test(cleaned) || /^VR\d{9}YP$/i.test(cleaned) || cleaned.endsWith('YP')) {
    return { carrierId: 'yanwen', confidence: 'high', carrier: CARRIERS['yanwen'] };
  }

  // Check DHL (10 numeric digits, or JJD prefix)
  if (/^\d{10}$/.test(cleaned) || /^JJD\d+/i.test(cleaned)) {
    return { carrierId: 'dhl', confidence: 'high', carrier: CARRIERS['dhl'] };
  }

  // Check FedEx (12 or 15 digits)
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned)) {
    return { carrierId: 'fedex', confidence: 'high', carrier: CARRIERS['fedex'] };
  }

  // Check carrier patterns loop for any remaining
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
