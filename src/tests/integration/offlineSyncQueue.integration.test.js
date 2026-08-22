import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { SyncQueueService, MUTATION_TYPES } from '../../services/syncQueueService';
import { cloudAdapter } from '../../services/cloudStorageAdapter';
import { deliveryService } from '../../services/deliveryService';

describe('Integration Testbench: Offline Sync Queue (Offline mutation -> syncQueueService -> online replay -> Firestore)', () => {
  let syncQueue;
  let mockLocalStorage = {};
  let upsertSpy;

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
    upsertSpy = vi.spyOn(cloudAdapter, 'upsertPackageRemote').mockResolvedValue(undefined);
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

    // Local persistence (deliveryService/localStorage) already happened synchronously at the
    // App.jsx call site before enqueue() is ever invoked — seed it here to match that reality,
    // since replayQueue()'s STATUS_CHANGE branch validates transitions against local state.
    deliveryService.savePackages([pkg1, pkg2], 'offline-user-99');

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

    // 5. Verify each mutation reached the Firestore remote-write path with the right payload
    expect(upsertSpy).toHaveBeenCalledWith(pkg1, 'offline-user-99');
    expect(upsertSpy).toHaveBeenCalledWith(pkg2, 'offline-user-99');
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pkg-mut-1', status: 'in_transit' }),
      'offline-user-99'
    );
  });
});
