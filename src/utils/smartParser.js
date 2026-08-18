import { detectCarrier } from './carrierDetector';
import { sanitizeString } from './packageValidator';

/**
 * Smart Parser to extract tracking number, title, carrier, and notes from raw SMS or Email notifications.
 * Examples of Israeli SMS / emails:
 * - "שלום, דבר דואר שמספרו RS948219481IL נמסר לחלוקה ביחידת הדואר דיזנגוף סנטר. שעות פתיחה..."
 * - "AliExpress update: Your order for 'Mechanical Keyboard' (LP00582910482CN) has arrived at the destination sorting facility."
 * - "DHL Express shipment 4829104821 is scheduled for delivery today."
 */
export function parseDeliveryText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const text = rawText.trim();
  const result = {
    trackingNumber: '',
    title: '',
    carrierId: 'other',
    notes: '',
    detectedSender: '',
    pickupLocation: ''
  };

  // 1. Look for tracking number patterns in the text
  // Pattern A: standard Israeli / international UPU S10 tracking (e.g. RS123456789IL, LP00582910482CN)
  const upuMatch = text.match(/\b([A-Z]{2}\d{8,12}[A-Z]{2})\b/i);
  const cainiaoMatch = text.match(/\b(LP[0-9A-Z]{10,}|CAINIAO\d+|CN\d{8,})\b/i);
  const fourPxMatch = text.match(/\b(4PX\d+|FPX\d+)\b/i);
  const upsMatch = text.match(/\b(1Z[0-9A-Z]{16})\b/i);
  const yanwenMatch = text.match(/\b(U[A-Z]\d{8,10}YP|VR\d{8,10}YP)\b/i);
  const dhlMatch = text.match(/\b(?:AWB[:\s]\s*)?(\d{10})\b/i);
  const fedexMatch = text.match(/\b(\d{12}|\d{15})\b/);

  if (cainiaoMatch) {
    result.trackingNumber = cainiaoMatch[1].toUpperCase();
  } else if (upuMatch) {
    result.trackingNumber = upuMatch[1].toUpperCase();
  } else if (fourPxMatch) {
    result.trackingNumber = fourPxMatch[1].toUpperCase();
  } else if (upsMatch) {
    result.trackingNumber = upsMatch[1].toUpperCase();
  } else if (yanwenMatch) {
    result.trackingNumber = yanwenMatch[1].toUpperCase();
  } else if (dhlMatch && text.toLowerCase().includes('dhl')) {
    result.trackingNumber = dhlMatch[1];
  } else if (fedexMatch && text.toLowerCase().includes('fedex')) {
    result.trackingNumber = fedexMatch[1];
  } else {
    // Generic alphanumeric code (must contain at least one digit and be 8-24 chars)
    const genericRegex = /\b([A-Z0-9]{8,24})\b/gi;
    let genericCode;
    while ((genericCode = genericRegex.exec(text)) !== null) {
      if (/\d/.test(genericCode[1])) {
        if (!/^(HTTPS?|WWW|COM|CO|IL|HTML|DELIVEREE|ALIEXPRESS)$/i.test(genericCode[1])) {
          result.trackingNumber = genericCode[1].toUpperCase();
          break;
        }
      }
    }
  }

  // 2. Carrier Auto-detection
  if (result.trackingNumber) {
    const detection = detectCarrier(result.trackingNumber);
    result.carrierId = detection.carrierId;
  }

  // 3. Extract Pickup location or SMS details
  if (text.includes('ביחידת הדואר') || text.includes('סניף') || text.includes('לוקר') || text.includes('נקודת מסירה')) {
    const locationMatch = text.match(/(?:ביחידת הדואר|בסניף|בלוקר|בנקודת מסירה)\s+([^.\n,]+)/i);
    if (locationMatch) {
      result.pickupLocation = locationMatch[1].trim();
      result.notes = `נקודת איסוף: ${locationMatch[1].trim()}`;
    }
  }

  // 4. Try extracting item title from quotes or common English/Hebrew subject lines
  const quoteMatch = text.match(/["'״]([^"'״]+)["'״]/);
  if (quoteMatch) {
    result.title = quoteMatch[1].trim();
  } else {
    // If no quotes, synthesize a smart default title
    if (result.carrierId === 'israel-post') {
      result.title = result.pickupLocation ? `דואר ישראל - ${result.pickupLocation}` : 'חבילה מדואר ישראל';
    } else if (result.carrierId === 'cainiao') {
      result.title = 'הזמנה מעליאקספרס / Cainiao';
    } else if (result.carrierId === 'dhl') {
      result.title = 'משלוח אקספרס DHL';
    } else if (result.carrierId === 'fedex') {
      result.title = 'משלוח FedEx';
    } else if (result.carrierId === 'ups') {
      result.title = 'משלוח UPS';
    } else {
      result.title = result.trackingNumber ? `משלוח ${result.trackingNumber}` : 'חבילה חדשה';
    }
  }

  // 5. Sanitize all returned string fields
  result.trackingNumber = sanitizeString(result.trackingNumber, 100);
  result.title = sanitizeString(result.title, 200);
  result.notes = sanitizeString(result.notes, 1000);
  result.detectedSender = sanitizeString(result.detectedSender, 100);
  result.pickupLocation = sanitizeString(result.pickupLocation, 150);

  return result;
}
