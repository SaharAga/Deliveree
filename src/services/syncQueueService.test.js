import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { SyncQueueService, MUTATION_TYPES } from './syncQueueService';

describe('SyncQueueService Unit Tests', () => {
  let syncQueue;
  let mockStore = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (k) => mockStore[k] || null,
      setItem: (k, v) => { mockStore[k] = String(v); },
      removeItem: (k) => { delete mockStore[k]; },
      clear: () => { mockStore = {}; }
    };
  });

  beforeEach(() => {
    mockStore = {};
    syncQueue = new SyncQueueService();
    syncQueue.clearQueue();
  });

  it('enqueues offline mutation with idempotency token', () => {
    const pkg = {
      id: 'pkg-offline-1',
      title: 'Offline Item',
      trackingNumber: 'RS948219481IL',
      carrier: 'israel-post',
      status: 'ordered'
    };

    const mutation = syncQueue.enqueue(MUTATION_TYPES.ADD, pkg, 'user-123');
    expect(mutation.id).toBeDefined();
    expect(mutation.type).toBe('ADD');
    expect(mutation.payload.id).toBe('pkg-offline-1');

    const queue = syncQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(mutation.id);
  });

  it('replays pending mutations and empties queue upon successful execution', async () => {
    const pkg = {
      id: 'pkg-replay-1',
      title: 'Replayed Item',
      trackingNumber: 'LP00582910482CN',
      carrier: 'cainiao',
      status: 'in_transit'
    };

    syncQueue.isOnline = false;
    syncQueue.enqueue(MUTATION_TYPES.ADD, pkg, 'user-abc');
    expect(syncQueue.getQueue().length).toBe(1);

    // Simulate coming back online
    syncQueue.isOnline = true;
    const res = await syncQueue.replayQueue();
    expect(res.processed).toBe(1);
    expect(res.failed).toBe(0);
    expect(syncQueue.getQueue().length).toBe(0);
  });

  it('deduplicates identical unplayed mutations for same package', () => {
    const pkg = { id: 'pkg-dup', title: 'Dup' };
    syncQueue.isOnline = false;
    syncQueue.enqueue(MUTATION_TYPES.ADD, pkg);
    syncQueue.enqueue(MUTATION_TYPES.ADD, pkg);

    expect(syncQueue.getQueue().length).toBe(1);
  });
});
