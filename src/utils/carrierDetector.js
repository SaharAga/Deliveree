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

  // 1. Israel Post (e.g. RS123456789IL, RR..., CP..., or ends with IL)
  if (/^[A-Z]{2}\d{9}IL$/i.test(cleaned) || (cleaned.length >= 9 && cleaned.endsWith('IL'))) {
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

  // 4. HFD Delivery (HFD...)
  if (/^HFD\d{8,12}$/i.test(cleaned)) {
    return { carrierId: 'hfd', confidence: 'high', carrier: CARRIERS['hfd'] };
  }

  // 5. YunExpress (YT...)
  if (/^YT\d{16,18}$/i.test(cleaned)) {
    return { carrierId: 'yunexpress', confidence: 'high', carrier: CARRIERS['yunexpress'] };
  }

  // 6. Cainiao / AliExpress (LP..., CAINIAO..., CN..., AE...)
  if (/^(LP|CAINIAO)\d+/i.test(cleaned) || /^[A-Z]{2}\d{9}CN$/i.test(cleaned) || /^AE[A-Z0-9]{10,18}$/i.test(cleaned)) {
    return { carrierId: 'cainiao', confidence: 'high', carrier: CARRIERS['cainiao'] };
  }

  // 7. 4PX
  if (/^4PX\d+/i.test(cleaned) || /^FPX\d+/i.test(cleaned)) {
    return { carrierId: '4px', confidence: 'high', carrier: CARRIERS['4px'] };
  }

  // 8. UPS (1Z...)
  if (/^1Z[0-9A-Z]{16}$/i.test(cleaned)) {
    return { carrierId: 'ups', confidence: 'high', carrier: CARRIERS['ups'] };
  }

  // 9. Royal Mail (UK - ends with GB)
  if (/^[A-Z]{2}\d{9}GB$/i.test(cleaned)) {
    return { carrierId: 'royal-mail', confidence: 'high', carrier: CARRIERS['royal-mail'] };
  }

  // 10. USPS (9400..., 9200..., ends with US)
  if (/^9[234]\d{20}$/.test(cleaned) || /^[A-Z]{2}\d{9}US$/i.test(cleaned)) {
    return { carrierId: 'usps', confidence: 'high', carrier: CARRIERS['usps'] };
  }

  // 11. Yanwen (e.g. UY894729184YP, VR...YP)
  if (/^U[A-Z]\d{9}YP$/i.test(cleaned) || /^VR\d{9}YP$/i.test(cleaned) || (cleaned.length >= 10 && cleaned.endsWith('YP'))) {
    return { carrierId: 'yanwen', confidence: 'high', carrier: CARRIERS['yanwen'] };
  }

  // 12. DHL (10 numeric digits, or JJD prefix)
  if (/^\d{10}$/.test(cleaned) || /^JJD\d+/i.test(cleaned) || /^GM\d{16,18}$/i.test(cleaned)) {
    return { carrierId: 'dhl', confidence: 'high', carrier: CARRIERS['dhl'] };
  }

  // 13. FedEx (12 or 15 digits)
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned)) {
    return { carrierId: 'fedex', confidence: 'high', carrier: CARRIERS['fedex'] };
  }

  // 14. Check carrier patterns loop for any remaining
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

