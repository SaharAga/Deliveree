import { detectCarrier } from '../utils/carrierDetector';
import { validatePackageSafe } from '../schemas/packageSchema';

/**
 * Cooldown duration in milliseconds per tracking number (60 seconds)
 */
export const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

/**
 * In-memory map of tracking number -> timestamp of last successful tracking fetch.
 * Maximum capacity bounded to avoid memory exhaustion attacks.
 */
const trackingCooldownMap = new Map();
const MAX_COOLDOWN_MAP_SIZE = 1000;

/**
 * Reset all or specific cooldowns (useful for testing and manual resets)
 * @param {string} [trackingNumber]
 */
export function resetTrackingCooldown(trackingNumber) {
  if (typeof trackingNumber === 'string' && trackingNumber.length > 0) {
    trackingCooldownMap.delete(trackingNumber.trim().toUpperCase().slice(0, 100));
  } else if (!trackingNumber) {
    trackingCooldownMap.clear();
  }
}

/**
 * Check if a tracking number is currently rate-limited
 * @param {string} trackingNumber
 * @returns {{ isLimited: boolean, remainingMs: number }}
 */
export function checkRateLimit(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') return { isLimited: false, remainingMs: 0 };
  const key = trackingNumber.trim().toUpperCase().slice(0, 100);
  const lastFetch = trackingCooldownMap.get(key);
  if (!lastFetch || typeof lastFetch !== 'number') {
    return { isLimited: false, remainingMs: 0 };
  }

  const elapsed = Date.now() - lastFetch;
  if (elapsed >= 0 && elapsed < RATE_LIMIT_COOLDOWN_MS) {
    return {
      isLimited: true,
      remainingMs: RATE_LIMIT_COOLDOWN_MS - elapsed
    };
  }

  // Auto prune expired entry
  trackingCooldownMap.delete(key);
  return { isLimited: false, remainingMs: 0 };
}

/**
 * Record a successful fetch timestamp for a tracking number with bounded memory cleanup.
 * @param {string} trackingNumber
 */
export function recordTrackingFetch(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') return;
  const key = trackingNumber.trim().toUpperCase().slice(0, 100);

  // Evict expired entries or oldest if max capacity reached
  if (trackingCooldownMap.size >= MAX_COOLDOWN_MAP_SIZE) {
    const now = Date.now();
    for (const [k, ts] of trackingCooldownMap.entries()) {
      if (now - ts >= RATE_LIMIT_COOLDOWN_MS) {
        trackingCooldownMap.delete(k);
      }
    }
    if (trackingCooldownMap.size >= MAX_COOLDOWN_MAP_SIZE) {
      const oldestKey = trackingCooldownMap.keys().next().value;
      if (oldestKey) trackingCooldownMap.delete(oldestKey);
    }
  }

  trackingCooldownMap.set(key, Date.now());
}

/**
 * Normalizes checkpoints into the schema-conforming structure
 * @param {Array<any>} rawCheckpoints
 * @param {string} trackingNumber
 * @returns {import('../types/deliveree').Checkpoint[]}
 */
export function normalizeCheckpoints(rawCheckpoints, trackingNumber = '') {
  if (!Array.isArray(rawCheckpoints)) return [];

  const safeTrack = typeof trackingNumber === 'string' ? trackingNumber.slice(0, 50) : 'trk';

  return rawCheckpoints.slice(0, 50).map((cp, idx) => {
    if (!cp || typeof cp !== 'object') {
      return {
        id: `cp-${safeTrack}-${idx}-${Date.now()}`.slice(0, 100),
        title: 'Checkpoint Update',
        description: '',
        descriptionHe: '',
        location: '',
        timestamp: new Date().toISOString(),
        isCompleted: true
      };
    }

    const id = cp.id ? String(cp.id) : `cp-${safeTrack}-${idx}-${Date.now()}`;
    const timestamp = cp.timestamp || cp.time || new Date().toISOString();
    return {
      id: String(id).slice(0, 100),
      title: String(cp.title || cp.status || cp.stage || 'Checkpoint Update').slice(0, 200),
      titleHe: cp.titleHe ? String(cp.titleHe).slice(0, 200) : undefined,
      description: cp.description || cp.details || cp.desc ? String(cp.description || cp.details || cp.desc).slice(0, 500) : '',
      descriptionHe: cp.descriptionHe || cp.detailsHe ? String(cp.descriptionHe || cp.detailsHe).slice(0, 500) : '',
      location: cp.location || cp.place ? String(cp.location || cp.place).slice(0, 150) : '',
      timestamp: String(timestamp).slice(0, 50),
      isCompleted: cp.isCompleted !== undefined ? Boolean(cp.isCompleted) : true
    };
  });
}

/**
 * Carrier-specific mock tracking resolution engine.
 * Generates carrier-accurate realistic checkpoints and lifecycle status.
 * Supports Israeli carriers (Israel Post, Cheetah, HFD, BoxIt) & Global carriers (FedEx, UPS, Aramex, Cainiao, DHL, etc.).
 *
 * @param {string} trackingNumber
 * @param {string} carrierId
 * @returns {Promise<{ checkpoints: import('../types/deliveree').Checkpoint[], status: import('../types/deliveree').DeliveryStageId, estimatedDelivery?: string }>}
 */
export async function simulateCarrierTracking(trackingNumber, carrierId) {
  const normCarrier = carrierId || detectCarrier(trackingNumber).carrierId || 'other';
  const cleanTrack = (trackingNumber || '').trim().toUpperCase();

  // Deterministic seed based on tracking number to ensure stable mock responses
  const charSum = cleanTrack.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const now = new Date();

  // Carrier-specific mock data generation
  switch (normCarrier) {
    case 'israel-post': {
      const isDelivered = cleanTrack.includes('DEL') || charSum % 5 === 0;
      const isOutForDelivery = !isDelivered && (cleanTrack.includes('OUT') || charSum % 3 === 0);
      const isCustoms = !isDelivered && !isOutForDelivery && (cleanTrack.includes('CUST') || charSum % 4 === 0);

      const status = isDelivered ? 'delivered' : isOutForDelivery ? 'out_for_delivery' : isCustoms ? 'customs' : 'in_transit';

      const checkpoints = [
        {
          id: `cp-ilp-1-${cleanTrack}`,
          title: 'Electronic Notification Received',
          titleHe: 'התקבל מידע אלקטרוני על המשלוח',
          description: 'Sender generated shipping label',
          descriptionHe: 'השולח הפיק תעודת משלוח אלקטרונית בדואר ישראל',
          location: 'Israel Post Gateway',
          timestamp: new Date(now.getTime() - 86400000 * 5).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-ilp-2-${cleanTrack}`,
          title: 'Sorted at Modiin Logistics Center',
          titleHe: 'מוין במרכז הלוגיסטי הארצי במודיעין',
          description: 'Package sorted for regional hub distribution',
          descriptionHe: 'החבילה מוינה ומועברת למרכז חלוקה אזורי',
          location: 'Modiin Logistics Center',
          timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
          isCompleted: true
        }
      ];

      if (isCustoms || isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-ilp-3-${cleanTrack}`,
          title: 'Customs Clearance Processed',
          titleHe: 'עבר בדיקת ושחרור מכס',
          description: 'Package released from customs inspection',
          descriptionHe: 'החבילה שוחררה מהליך בדיקת המכס',
          location: 'Ben Gurion Customs Hub',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        });
      }

      if (isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-ilp-4-${cleanTrack}`,
          title: 'Ready for Collection / Out for Delivery',
          titleHe: 'ממתין לאיסוף בסניף / נמסר לחלוקה',
          description: 'Awaiting customer pickup at local postal branch',
          descriptionHe: 'החבילה הגיעה לסניף הדואר המקומי וממתינה לאיסוף',
          location: 'Local Post Office',
          timestamp: new Date(now.getTime() - 3600000 * 4).toISOString(),
          isCompleted: true
        });
      }

      if (isDelivered) {
        checkpoints.unshift({
          id: `cp-ilp-5-${cleanTrack}`,
          title: 'Item Delivered to Recipient',
          titleHe: 'נמסר בהצלחה לידי הנמען',
          description: 'Package collected at branch by recipient',
          descriptionHe: 'החבילה נמסרה בסניף לאחר הצגת תעודה מזהה',
          location: 'Local Post Office',
          timestamp: new Date(now.getTime() - 1800000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000 * 2).toISOString().slice(0, 10)
      };
    }

    case 'chita': {
      const status = charSum % 3 === 0 ? 'out_for_delivery' : 'in_transit';
      const checkpoints = [
        {
          id: `cp-chita-1-${cleanTrack}`,
          title: 'Order Received in Cheetah System',
          titleHe: 'המשלוח נקלט במערכת צ\'יטה',
          description: 'Package scanned at Cheetah central hub',
          descriptionHe: 'החבילה נקלטה ונסרקה במרכז הלוגיסטי של צ\'יטה',
          location: 'Cheetah Hub Holon',
          timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-chita-2-${cleanTrack}`,
          title: 'Assigned to Courier',
          titleHe: 'נמסר לשליח צ\'יטה לחלוקה',
          description: 'Courier assigned for route delivery today',
          descriptionHe: 'החבילה יצאה עם השליח לכתובת היעד',
          location: 'Central Israel Hub',
          timestamp: new Date(now.getTime() - 3600000 * 3).toISOString(),
          isCompleted: true
        }
      ];

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
      };
    }

    case 'hfd': {
      const status = charSum % 2 === 0 ? 'out_for_delivery' : 'in_transit';
      const checkpoints = [
        {
          id: `cp-hfd-1-${cleanTrack}`,
          title: 'Package Ingested at HFD Hub',
          titleHe: 'החבילה נקלטה במרכז המיון HFD',
          description: 'Undergoing barcoding and routing',
          descriptionHe: 'החבילה נסרקה ומנותבת לאזור החלוקה',
          location: 'HFD Logistics Center',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        }
      ];

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000 * 2).toISOString().slice(0, 10)
      };
    }

    case 'boxit': {
      const isCollected = cleanTrack.includes('DEL') || charSum % 5 === 0;
      const status = isCollected ? 'delivered' : 'out_for_delivery';
      const lockerCode = `BX-${(charSum % 9000) + 1000}`;
      const lockerStationNum = (charSum % 80) + 101;

      const checkpoints = [
        {
          id: `cp-boxit-1-${cleanTrack}`,
          title: 'Package Received at BoxIt Automated Sorting Facility',
          titleHe: 'החבילה נקלטה במרכז המיון האוטומטי של BoxIt',
          description: 'Package routed to neighborhood locker locker network',
          descriptionHe: 'החבילה נותבה לרשת הלוקרים השכונתית',
          location: 'BoxIt Central Hub Petah Tikva',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-boxit-2-${cleanTrack}`,
          title: `Deposited into BoxIt Locker #${lockerStationNum}`,
          titleHe: `החבילה הופקדה בלוקר BoxIt #${lockerStationNum}`,
          description: `Ready for pickup. Locker Unlock Code: ${lockerCode} (sent via SMS).`,
          descriptionHe: `החבילה ממתינה לאיסוף בלוקר. קוד פתיחה סודי: ${lockerCode} נשלח ב-SMS.`,
          location: `BoxIt Station #${lockerStationNum}`,
          timestamp: new Date(now.getTime() - 3600000 * 4).toISOString(),
          isCompleted: true
        }
      ];

      if (isCollected) {
        checkpoints.unshift({
          id: `cp-boxit-3-${cleanTrack}`,
          title: 'Collected from Locker by Recipient',
          titleHe: 'החבילה נאספה בהצלחה מהלוקר',
          description: `Locker compartment opened using code ${lockerCode}`,
          descriptionHe: `תא הלוקר נפתח ונאסף באמצעות קוד הזיהוי ${lockerCode}`,
          location: `BoxIt Station #${lockerStationNum}`,
          timestamp: new Date(now.getTime() - 1800000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: now.toISOString().slice(0, 10)
      };
    }

    case 'fedex': {
      const isDelivered = cleanTrack.includes('DEL') || charSum % 4 === 0;
      const isOutForDelivery = !isDelivered && (charSum % 2 === 0);
      const status = isDelivered ? 'delivered' : isOutForDelivery ? 'out_for_delivery' : 'in_transit';

      const checkpoints = [
        {
          id: `cp-fdx-1-${cleanTrack}`,
          title: 'FedEx International Shipment Picked Up',
          titleHe: 'המשלוח נאסף ע״י FedEx במדינת המוצא',
          description: 'Package scanned at origin FedEx World Service Center',
          descriptionHe: 'החבילה נסרקה במרכז השילוח הבינלאומי של פדאקס',
          location: 'FedEx SuperHub Memphis / Roissy CDG',
          timestamp: new Date(now.getTime() - 86400000 * 4).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-fdx-2-${cleanTrack}`,
          title: 'International Flight Arrived & Customs Cleared',
          titleHe: 'טיסת מטען בינלאומית נחתה ושחרור מכס הושלם',
          description: 'Direct air express linehaul sorted at Ben Gurion Gateway',
          descriptionHe: 'עבר שחרור מכס מהיר במסוף פדאקס בנתב״ג',
          location: 'Ben Gurion FedEx Gateway, Israel',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        }
      ];

      if (isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-fdx-3-${cleanTrack}`,
          title: 'On FedEx Vehicle for Delivery',
          titleHe: 'ברכב השליחויות של FedEx לחלוקה היום',
          description: 'Package loaded on delivery van for door-to-door delivery',
          descriptionHe: 'החבילה בדרכה עם השליח לכתובת היעד',
          location: 'Tel Aviv / Central Delivery Station',
          timestamp: new Date(now.getTime() - 3600000 * 3).toISOString(),
          isCompleted: true
        });
      }

      if (isDelivered) {
        checkpoints.unshift({
          id: `cp-fdx-4-${cleanTrack}`,
          title: 'Delivered - Direct Signature Received',
          titleHe: 'נמסר בהצלחה - נחתם ישירות ע״י הנמען',
          description: 'Delivered to front door / recipient',
          descriptionHe: 'החבילה נמסרה ונחתמה בכתובת המבוקשת',
          location: 'Recipient Address',
          timestamp: new Date(now.getTime() - 1200000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
      };
    }

    case 'ups': {
      const isDelivered = cleanTrack.includes('DEL') || charSum % 4 === 0;
      const isOutForDelivery = !isDelivered && (charSum % 2 === 0);
      const status = isDelivered ? 'delivered' : isOutForDelivery ? 'out_for_delivery' : 'in_transit';

      const checkpoints = [
        {
          id: `cp-ups-1-${cleanTrack}`,
          title: 'Origin Scan at UPS Worldport Facility',
          titleHe: 'סריקת מוצא במרכז העולמי של UPS',
          description: 'Export scan processed at UPS sorting air hub',
          descriptionHe: 'החבילה עברה סריקת יצוא במרכז ההפצה האווירי',
          location: 'UPS Air Worldport Hub, Cologne / Louisville',
          timestamp: new Date(now.getTime() - 86400000 * 3).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-ups-2-${cleanTrack}`,
          title: 'Import Scan & Customs Process Complete',
          titleHe: 'סריקת יבוא והשלמת הליך המכס',
          description: 'Transferred to UPS Israel regional depot',
          descriptionHe: 'החבילה הועברה למרכז ההפצה האזורי של UPS ישראל',
          location: 'UPS Israel Hub, Lod',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        }
      ];

      if (isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-ups-3-${cleanTrack}`,
          title: 'Out for Delivery Today by UPS Courier',
          titleHe: 'יצא לחלוקה היום עם שליח UPS',
          description: 'Scheduled for delivery by end of day',
          descriptionHe: 'השליח יצא לביצוע מסירה בכתובתך',
          location: 'Local UPS Delivery Route',
          timestamp: new Date(now.getTime() - 3600000 * 2).toISOString(),
          isCompleted: true
        });
      }

      if (isDelivered) {
        checkpoints.unshift({
          id: `cp-ups-4-${cleanTrack}`,
          title: 'Delivered',
          titleHe: 'נמסר בהצלחה לנמען',
          description: 'Delivered and confirmed in UPS tracking system',
          descriptionHe: 'נמסר בהצלחה ונחתם ע״י המקבל',
          location: 'Destination Address',
          timestamp: new Date(now.getTime() - 900000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
      };
    }

    case 'aramex': {
      const isDelivered = cleanTrack.includes('DEL') || charSum % 4 === 0;
      const isOutForDelivery = !isDelivered && (charSum % 2 === 0);
      const status = isDelivered ? 'delivered' : isOutForDelivery ? 'out_for_delivery' : 'in_transit';

      const checkpoints = [
        {
          id: `cp-arx-1-${cleanTrack}`,
          title: 'Shipment Created at Aramex Gateway',
          titleHe: 'המשלוח נוצר ונקלט ברשת אראמקס',
          description: 'Departed Aramex Middle East / Global Distribution Center',
          descriptionHe: 'יצא ממרכז ההפצה והשילוח האזורי של אראמקס',
          location: 'Aramex International Hub Dubai / Amman',
          timestamp: new Date(now.getTime() - 86400000 * 3).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-arx-2-${cleanTrack}`,
          title: 'Arrived at Local Gateway & Customs Inspection Complete',
          titleHe: 'הגיע למרכז ההפצה המקומי ועבר מכס',
          description: 'Sorted for regional express distribution route',
          descriptionHe: 'עבר בדיקת שחרור מכס והועבר למוקד החלוקה',
          location: 'Aramex Israel Gateway',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        }
      ];

      if (isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-arx-3-${cleanTrack}`,
          title: 'Out for Delivery with Aramex Driver',
          titleHe: 'נמסר לשליח אראמקס לחלוקה היום',
          description: 'Courier en route to final destination address',
          descriptionHe: 'השליח יצא לחלוקה בכתובת היעד',
          location: 'Regional Route',
          timestamp: new Date(now.getTime() - 3600000 * 3).toISOString(),
          isCompleted: true
        });
      }

      if (isDelivered) {
        checkpoints.unshift({
          id: `cp-arx-4-${cleanTrack}`,
          title: 'Delivered - Received by Customer',
          titleHe: 'נמסר בהצלחה לידי הלקוח',
          description: 'Proof of delivery signed and recorded',
          descriptionHe: 'אישור מסירה חתום נקלט במערכת',
          location: 'Delivery Address',
          timestamp: new Date(now.getTime() - 1500000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000 * 2).toISOString().slice(0, 10)
      };
    }

    case 'cainiao':
    case 'yunexpress':
    case '4px':
    case 'yanwen': {
      const isCustoms = charSum % 3 === 0;
      const status = isCustoms ? 'customs' : 'in_transit';
      const checkpoints = [
        {
          id: `cp-global-1-${cleanTrack}`,
          title: 'Dispatched from Overseas Merchant',
          titleHe: 'נשלח ממחסן המוכר בחו״ל',
          description: 'Handed over to carrier international linehaul',
          descriptionHe: 'החבילה הועברה לטיסת מטען בינלאומית',
          location: 'Shenzhen / Hong Kong Hub',
          timestamp: new Date(now.getTime() - 86400000 * 6).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-global-2-${cleanTrack}`,
          title: 'Arrived at Destination Airport',
          titleHe: 'נחת בנמל התעופה בן גוריון',
          description: 'Flight arrived, cargo unloading in progress',
          descriptionHe: 'הטיסה נחתה, המטען נפרק להמשך הליך שחרור',
          location: 'Ben Gurion Airport, Israel',
          timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
          isCompleted: true
        }
      ];

      if (isCustoms) {
        checkpoints.unshift({
          id: `cp-global-3-${cleanTrack}`,
          title: 'Customs Clearance Inspection',
          titleHe: 'בבדיקת מכס / שחרור מהיר',
          description: 'Awaiting automated customs release',
          descriptionHe: 'ממתין לשחרור ממסוף המכס',
          location: 'Customs Terminal Lod',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000 * 4).toISOString().slice(0, 10)
      };
    }

    case 'dhl':
    case 'usps':
    case 'royal-mail':
    default: {
      const isDelivered = charSum % 4 === 0;
      const isOutForDelivery = !isDelivered && (charSum % 2 === 0);
      const status = isDelivered ? 'delivered' : isOutForDelivery ? 'out_for_delivery' : 'in_transit';

      const checkpoints = [
        {
          id: `cp-exp-1-${cleanTrack}`,
          title: 'Shipment Processed at Origin Sorting Facility',
          titleHe: 'המשלוח עבר מיון במתקן המוצא',
          description: 'Departed origin facility towards destination',
          descriptionHe: 'החבילה יצאה בטיסה בינלאומית למדינת היעד',
          location: 'International Hub',
          timestamp: new Date(now.getTime() - 86400000 * 3).toISOString(),
          isCompleted: true
        },
        {
          id: `cp-exp-2-${cleanTrack}`,
          title: 'Arrived at Local Gateway',
          titleHe: 'הגיע למרכז ההפצה המקומי',
          description: 'Customs cleared and transferred to courier network',
          descriptionHe: 'עבר שחרור מכס והועבר לרשת ההפצה המקומית',
          location: 'Tel Aviv Hub, Israel',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          isCompleted: true
        }
      ];

      if (isOutForDelivery || isDelivered) {
        checkpoints.unshift({
          id: `cp-exp-3-${cleanTrack}`,
          title: 'With Delivery Courier',
          titleHe: 'נמסר לשליח לחלוקה היום',
          description: 'Out for delivery to address',
          descriptionHe: 'החבילה יצאה עם השליח לכתובת היעד',
          location: 'Regional Depot',
          timestamp: new Date(now.getTime() - 3600000 * 2).toISOString(),
          isCompleted: true
        });
      }

      if (isDelivered) {
        checkpoints.unshift({
          id: `cp-exp-4-${cleanTrack}`,
          title: 'Delivered',
          titleHe: 'נמסר בהצלחה',
          description: 'Signed by recipient',
          descriptionHe: 'החבילה נמסרה ונחתמה על ידי הנמען',
          location: 'Recipient Address',
          timestamp: new Date(now.getTime() - 1800000).toISOString(),
          isCompleted: true
        });
      }

      return {
        checkpoints: normalizeCheckpoints(checkpoints, cleanTrack),
        status,
        estimatedDelivery: new Date(now.getTime() + 86400000 * 2).toISOString().slice(0, 10)
      };
    }
  }
}

/**
 * Fetches tracking updates for a package with rate limiting and checkpoint normalization.
 * 
 * @param {string} trackingNumber - Tracking number
 * @param {string} [carrierId] - Optional carrier ID
 * @param {boolean} [bypassRateLimit=false] - Force fetch bypassing rate limit
 * @returns {Promise<{
 *   success: boolean,
 *   rateLimited?: boolean,
 *   remainingCooldownMs?: number,
 *   error?: string,
 *   carrier: string,
 *   status?: import('../types/deliveree').DeliveryStageId,
 *   checkpoints?: import('../types/deliveree').Checkpoint[],
 *   expectedDeliveryDate?: string
 * }>}
 */
export async function fetchTrackingUpdates(trackingNumber, carrierId, bypassRateLimit = false) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return { success: false, error: 'Invalid tracking number', carrier: 'other' };
  }

  const cleanTrack = trackingNumber.trim().toUpperCase();
  const detectedCarrier = carrierId || detectCarrier(cleanTrack).carrierId || 'other';

  if (!bypassRateLimit) {
    const rateCheck = checkRateLimit(cleanTrack);
    if (rateCheck.isLimited) {
      return {
        success: false,
        rateLimited: true,
        remainingCooldownMs: rateCheck.remainingMs,
        carrier: detectedCarrier,
        error: `Please wait ${Math.ceil(rateCheck.remainingMs / 1000)}s before refreshing this package again.`
      };
    }
  }

  try {
    const trackingData = await simulateCarrierTracking(cleanTrack, detectedCarrier);
    recordTrackingFetch(cleanTrack);

    return {
      success: true,
      carrier: detectedCarrier,
      status: trackingData.status,
      checkpoints: trackingData.checkpoints,
      expectedDeliveryDate: trackingData.estimatedDelivery
    };
  } catch (err) {
    return {
      success: false,
      carrier: detectedCarrier,
      error: err instanceof Error ? err.message : 'Failed to fetch tracking data'
    };
  }
}

/**
 * Debounce helper for client performance optimization
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait
 * @returns {(...args: Parameters<T>) => void}
 */
export function debounce(fn, wait = 300) {
  let timeoutId = null;
  return function debounced(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Batch refreshes an array of packages with throttling and progress reporting.
 *
 * @param {import('../types/deliveree').Package[]} packages - Array of packages to refresh
 * @param {((progress: { completed: number, total: number, updatedCount: number }) => void)} [onProgress] - Optional progress callback
 * @param {number} [concurrencyLimit=3] - Maximum parallel requests
 * @returns {Promise<{
 *   updatedPackages: import('../types/deliveree').Package[],
 *   refreshedCount: number,
 *   rateLimitedCount: number,
 *   errors: string[]
 * }>}
 */
export async function batchRefreshTracking(packages, onProgress, concurrencyLimit = 3) {
  if (!Array.isArray(packages) || packages.length === 0) {
    return { updatedPackages: [], refreshedCount: 0, rateLimitedCount: 0, errors: [] };
  }

  const results = [...packages];
  let completed = 0;
  let refreshedCount = 0;
  let rateLimitedCount = 0;
  const errors = [];
  const batchCache = new Map();

  const total = packages.length;

  // Process in throttled chunks
  for (let i = 0; i < packages.length; i += concurrencyLimit) {
    const chunk = packages.slice(i, i + concurrencyLimit);
    const promises = chunk.map(async (pkg, chunkIdx) => {
      const actualIndex = i + chunkIdx;
      if (!pkg.trackingNumber || pkg.isArchived || pkg.status === 'delivered') {
        completed++;
        return;
      }

      const cleanTrack = String(pkg.trackingNumber).trim().toUpperCase();
      let res;
      if (batchCache.has(cleanTrack)) {
        res = batchCache.get(cleanTrack);
      } else {
        res = await fetchTrackingUpdates(pkg.trackingNumber, pkg.carrier);
        if (res.success) {
          batchCache.set(cleanTrack, res);
        }
      }

      if (res.success && res.checkpoints) {
        // Merge checkpoints ensuring uniqueness by id
        const rawCheckpoints = Array.isArray(pkg.checkpoints) ? pkg.checkpoints : [];
        const existingIds = new Set(rawCheckpoints.map(cp => cp && cp.id));
        const newCheckpoints = res.checkpoints.filter(cp => cp && !existingIds.has(cp.id));
        const mergedCheckpoints = [...newCheckpoints, ...rawCheckpoints];

        const updatedPkg = {
          ...pkg,
          status: res.status || pkg.status,
          checkpoints: mergedCheckpoints,
          expectedDeliveryDate: res.expectedDeliveryDate || pkg.expectedDeliveryDate,
          updatedAt: new Date().toISOString()
        };

        const validated = validatePackageSafe(updatedPkg);
        if (validated.success) {
          results[actualIndex] = validated.data;
          refreshedCount++;
        }
      } else if (res.rateLimited) {
        rateLimitedCount++;
      } else if (res.error) {
        errors.push(`${pkg.trackingNumber}: ${res.error}`);
      }

      completed++;
    });

    await Promise.all(promises);

    if (onProgress) {
      onProgress({ completed, total, updatedCount: refreshedCount });
    }
  }

  return {
    updatedPackages: results,
    refreshedCount,
    rateLimitedCount,
    errors
  };
}

export const trackingService = {
  RATE_LIMIT_COOLDOWN_MS,
  resetTrackingCooldown,
  checkRateLimit,
  recordTrackingFetch,
  normalizeCheckpoints,
  simulateCarrierTracking,
  fetchTrackingUpdates,
  batchRefreshTracking,
  debounce
};
