import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  inferStageFromText, 
  getCachedTracking, 
  setCachedTracking, 
  fetchLiveCarrierTracking 
} from './carrierApiProxy';

describe('carrierApiProxy Service', () => {
  const store = new Map();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };
    vi.restoreAllMocks();
  });

  describe('inferStageFromText', () => {
    it('infers delivered stage correctly in Hebrew and English', () => {
      expect(inferStageFromText('החבילה נמסרה ליעדה בהצלחה')).toBe('delivered');
      expect(inferStageFromText('Package delivered to front door')).toBe('delivered');
      expect(inferStageFromText('נאסף מהלוקר')).toBe('delivered');
    });

    it('infers out_for_delivery for locker, pickup and collection', () => {
      expect(inferStageFromText('ממתין לאיסוף בנקודת שירות')).toBe('out_for_delivery');
      expect(inferStageFromText('הוכנס ללוקר שופרסל')).toBe('out_for_delivery');
      expect(inferStageFromText('קוד איסוף נשלח ב-SMS')).toBe('out_for_delivery');
      expect(inferStageFromText('Ready for collection at store')).toBe('out_for_delivery');
    });

    it('infers customs and clearance events', () => {
      expect(inferStageFromText('מעוכב לבדיקת מכס')).toBe('customs');
      expect(inferStageFromText('Held by customs authorities')).toBe('customs');
    });

    it('infers out for delivery stage', () => {
      expect(inferStageFromText('השליח יצא לחלוקה')).toBe('out_for_delivery');
      expect(inferStageFromText('Out for delivery today')).toBe('out_for_delivery');
    });

    it('defaults to in_transit for generic events', () => {
      expect(inferStageFromText('הגיע למוקד מיון תל אביב')).toBe('in_transit');
      expect(inferStageFromText('Departed transit hub')).toBe('in_transit');
    });
  });

  describe('2-Hour Caching Mechanism', () => {
    it('stores and retrieves cached tracking within 2-hour window', () => {
      const sample = {
        carrier: 'israel-post',
        status: 'in_transit',
        checkpoints: [{ id: '1', title: 'Test event' }]
      };

      setCachedTracking('RS123456789IL', sample);
      const retrieved = getCachedTracking('RS123456789IL');

      expect(retrieved).not.toBeNull();
      expect(retrieved.carrier).toBe('israel-post');
      expect(retrieved.status).toBe('in_transit');
    });

    it('returns null for non-existent cache keys', () => {
      expect(getCachedTracking('NON_EXISTENT')).toBeNull();
    });
  });

  describe('fetchLiveCarrierTracking', () => {
    it('creates a clean structured initial carrier record for new shipments', async () => {
      const res = await fetchLiveCarrierTracking('CH10849201', 'chita', true);
      expect(res.carrier).toBe('chita');
      expect(res.status).toBe('ordered');
      expect(res.checkpoints.length).toBeGreaterThan(0);
      expect(res.checkpoints[0].title).toBe('פרטי המשלוח נקלטו במערכת');
    });

    it('returns from cache when available', async () => {
      const cachedData = {
        carrier: 'hfd',
        status: 'out_for_delivery',
        checkpoints: []
      };
      setCachedTracking('HFD90481029', cachedData);

      const res = await fetchLiveCarrierTracking('HFD90481029', 'hfd', false);
      expect(res.isFromCache).toBe(true);
      expect(res.status).toBe('out_for_delivery');
    });
  });
});
