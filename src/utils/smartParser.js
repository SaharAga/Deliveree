import { detectCarrier } from './carrierDetector';
import { detectStore } from './storeDetector';
import { CARRIERS } from '../types/carriers';
import { sanitizeString } from './packageValidator';

/**
 * Extracts potential tracking numbers from unstructured text.
 * @param {string} text 
 * @returns {string[]}
 */
export function extractTrackingCandidates(text) {
  if (!text || typeof text !== 'string') return [];

  const candidates = new Set();
  
  // 1. Explicit labels (e.g., "Tracking: RS123456789IL", "מספר מעקב: 1Z999...")
  const labeledRegex = /(?:tracking(?:\s*number|\s*no|\s*code)?|מעקב(?:\s*משלוח)?|מספר\s*מעקב|חבילה\s*מספר|מס['׳]\s*מעקב)[\s:=#-]+([A-Z0-9_-]{6,35})/gi;
  let match;
  while ((match = labeledRegex.exec(text)) !== null) {
    if (match[1]) candidates.add(match[1].trim());
  }

  // 2. Tokenized match across words
  const words = text.replace(/[,;:"'()<>[\]{}?&=/\\#%*+!|`^~]/g, ' ').split(/\s+/);
  for (const word of words) {
    const cleaned = word.trim().replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    if (!cleaned) continue;

    // Pattern matches
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(cleaned)) candidates.add(cleaned);
    else if (/^1Z[0-9A-Z]{16}$/i.test(cleaned)) candidates.add(cleaned);
    else if (/^(LP|CAINIAO)\d{10,}/i.test(cleaned)) candidates.add(cleaned);
    else if (/^4PX\d{10,}/i.test(cleaned)) candidates.add(cleaned);
    else if (/^YT\d{16,18}$/i.test(cleaned)) candidates.add(cleaned);
    else if (/^(CH|CT|HFD|BOX)\d{6,12}$/i.test(cleaned)) candidates.add(cleaned);
    else if (/^\d{10,22}$/.test(cleaned) && (cleaned.length === 10 || cleaned.length === 12 || cleaned.length === 22)) candidates.add(cleaned);
  }

  return Array.from(candidates);
}

/**
 * Intelligently parses raw email, SMS, or notification text to construct a package payload.
 * @param {string} rawText 
 * @returns {object} Partial package data extracted from text
 */
export function parseSmartText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      title: '',
      trackingNumber: '',
      carrier: 'other',
      carrierName: CARRIERS['other'].name,
      category: 'other',
      notes: ''
    };
  }

  const cleanText = sanitizeString(rawText, 5000);
  const candidates = extractTrackingCandidates(cleanText);
  
  let bestTracking = '';
  let bestCarrier = 'other';
  let bestConfidence = 'none';

  for (const cand of candidates) {
    const detection = detectCarrier(cand);
    if (detection.confidence === 'high') {
      bestTracking = cand;
      bestCarrier = detection.carrierId;
      bestConfidence = 'high';
      break;
    } else if (detection.confidence === 'medium' && bestConfidence !== 'high') {
      bestTracking = cand;
      bestCarrier = detection.carrierId;
      bestConfidence = 'medium';
    } else if (!bestTracking) {
      bestTracking = cand;
    }
  }

  // Detect merchant / store
  const storeInfo = detectStore(cleanText);
  let detectedStore = '';
  let detectedStoreHe = '';
  let category = 'other';

  if (storeInfo) {
    detectedStore = storeInfo.name;
    detectedStoreHe = storeInfo.hebrewName;
    if (['shein', 'asos', 'zara', 'next', 'terminalx'].includes(storeInfo.id)) {
      category = 'clothing';
    } else if (['amazon', 'ksp', 'ivory', 'apple'].includes(storeInfo.id)) {
      category = 'electronics';
    } else if (storeInfo.id === 'aliexpress') {
      category = 'clothing';
    }
  }

  // Determine Title
  let title = '';
  let titleHe = '';
  if (detectedStore) {
    title = `${detectedStore} Order`;
    titleHe = `הזמנה מ-${detectedStoreHe || detectedStore}`;
  } else if (bestTracking) {
    title = `Package ${bestTracking.slice(0, 8)}...`;
    titleHe = `חבילה ${bestTracking.slice(0, 8)}...`;
  } else {
    title = 'New Tracked Package';
    titleHe = 'חבילה חדשה למעקב';
  }

  const carrierObj = CARRIERS[bestCarrier] || CARRIERS['other'];

  return {
    title,
    titleHe,
    trackingNumber: bestTracking,
    carrier: bestCarrier,
    carrierName: carrierObj.name,
    category,
    origin: carrierObj.country || '',
    destination: 'Israel',
    notes: cleanText.length > 300 ? cleanText.slice(0, 300) + '...' : cleanText,
    notesHe: cleanText.length > 300 ? cleanText.slice(0, 300) + '...' : cleanText
  };
}
