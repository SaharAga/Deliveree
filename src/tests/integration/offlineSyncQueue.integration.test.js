import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { SyncQueueService, MUTATION_TYPES } from '../../services/syncQueueService';
import { IDBStorageAdapter } from '../../services/idbStorageAdapter';

describe('Integration Testbench: Offline Sync Queue (Offline mutation -> syncQueueService -> online replay -> IDB/Storage)', () => {
  let syncQueue;
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
    syncQueue = new SyncQueueService();
    syncQueue.clearQueue();
    adapter = new IDBStorageAdapter({ userId: 'offline-user-99' });
    adapter.clearMemoryCache();
  });

  it('accumulates multiple offline mutations and reliably executes replay upon reconnection', async () => {
    // 1. Simulate Offline Mode
    syncQueue.isOnline = false;

    const pkg1 = {
      id: 'pkg-mut-1',
      title: 'Camping Tent',
      trackingNumber: '784920194821',
      carrier: 'fedex',
      status: 'ordered'
    };

    const pkg2 = {
      id: 'pkg-mut-2',
      title: 'Solar Charger',
      trackingNumber: '1Z9999999999999999',
      carrier: 'ups',
      status: 'shipped'
    };

    // 2. Queue mutations offline
    syncQueue.enqueue(MUTATION_TYPES.ADD, pkg1, 'offline-user-99');
    syncQueue.enqueue(MUTATION_TYPES.ADD, pkg2, 'offline-user-99');

    expect(syncQueue.getQueue().length).toBe(2);

    // 3. Queue status change offline
    syncQueue.enqueue(MUTATION_TYPES.STATUS_CHANGE, { packageId: 'pkg-mut-1', newStatus: 'in_transit' }, 'offline-user-99');
    expect(syncQueue.getQueue().length).toBe(3);

    // 4. Simulate Online Event
    syncQueue.isOnline = true;
    const replayResult = await syncQueue.replayQueue();

    expect(replayResult.processed).toBe(3);
    expect(replayResult.failed).toBe(0);
    expect(replayResult.remaining).toBe(0);

    // 5. Verify IDB state after replay
    adapter.setUserId('offline-user-99');
    const finalPackages = await adapter.getPackages();
    expect(finalPackages.length).toBe(2);

    const tent = finalPackages.find(p => p.id === 'pkg-mut-1');
    expect(tent).toBeDefined();
    expect(tent.status).toBe('in_transit');

    const charger = finalPackages.find(p => p.id === 'pkg-mut-2');
    expect(charger).toBeDefined();
    expect(charger.carrier).toBe('ups');
  });
});
