import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { parseSmartText } from '../../utils/smartParser';
import { detectCarrier } from '../../utils/carrierDetector';
import { detectStore } from '../../utils/storeDetector';
import { IDBStorageAdapter } from '../../services/idbStorageAdapter';

describe('Integration Testbench: Ingestion Pipeline (Web Share -> carrierDetector -> storeDetector -> idbStorageAdapter)', () => {
  let adapter;
  let mockLocalStorage = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (k) => mockLocalStorage[k] || null,
      setItem: (k, v) => { mockLocalStorage[k] = String(v); },
      removeItem: (k) => { delete mockLocalStorage[k]; },
      clear: () => { mockLocalStorage = {}; }
    };
  });

  beforeEach(() => {
    mockLocalStorage = {};
    adapter = new IDBStorageAdapter({ userId: 'integration-user' });
    adapter.clearMemoryCache();
  });

  it('end-to-end ingests Hebrew SMS from Israel Post with AliExpress origin and saves to IDB', async () => {
    const rawSms = 'שלום סהר, דבר דואר שמספרו RS948219481IL מאתר עליאקספרס הגיע למרכז המסירה בסניף דיזנגוף סנטר תל אביב.';

    // 1. Parse raw text (Smart Parser)
    const parsed = parseSmartText(rawSms);
    expect(parsed.trackingNumber).toBe('RS948219481IL');

    // 2. Detect Carrier
    const carrierRes = detectCarrier(parsed.trackingNumber);
    expect(carrierRes.carrierId).toBe('israel-post');

    // 3. Detect Store
    const packageDraft = {
      id: `pkg-${Date.now()}`,
      title: parsed.title || 'AliExpress Shipment',
      trackingNumber: parsed.trackingNumber,
      carrier: carrierRes.carrierId,
      status: 'in_transit',
      notes: rawSms,
      origin: 'AliExpress Global Hub'
    };

    const storeRes = detectStore(packageDraft);
    expect(storeRes).toBeDefined();
    expect(storeRes.id).toBe('aliexpress');

    // 4. Save to IndexedDB Storage Adapter
    const savedList = await adapter.upsertPackage(packageDraft);
    expect(savedList.some(p => p.trackingNumber === 'RS948219481IL')).toBe(true);

    // 5. Query verification
    const retrieved = await adapter.getPackages();
    const target = retrieved.find(p => p.trackingNumber === 'RS948219481IL');
    expect(target).toBeDefined();
    expect(target.carrier).toBe('israel-post');
    expect(target.origin).toBe('AliExpress Global Hub');
  });

  it('end-to-end ingests Amazon US DHL shipment text', async () => {
    const rawText = 'Your Amazon US package with tracking 4829104821 via DHL Express is out for delivery.';
    const parsed = parseSmartText(rawText);
    expect(parsed.trackingNumber).toBe('4829104821');

    const carrierRes = detectCarrier(parsed.trackingNumber);
    expect(carrierRes.carrierId).toBe('dhl');

    const pkg = {
      id: 'pkg-dhl-amazon',
      title: 'Amazon Gadget',
      trackingNumber: parsed.trackingNumber,
      carrier: carrierRes.carrierId,
      status: 'out_for_delivery',
      origin: 'Amazon US'
    };

    const store = detectStore(pkg);
    expect(store.id).toBe('amazon');

    await adapter.upsertPackage(pkg);
    const stored = await adapter.getPackages();
    expect(stored.some(p => p.id === 'pkg-dhl-amazon')).toBe(true);
  });
});
