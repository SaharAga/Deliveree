import { idbStorageAdapter } from './idbStorageAdapter';
import { cloudAdapter } from './cloudStorageAdapter';
import { deliveryService } from './deliveryService';

export const QUEUE_STORAGE_KEY = 'deliveree_offline_sync_queue';
export const MUTATION_TYPES = Object.freeze({
  ADD: 'ADD',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE'
});

/**
 * Creates a unique cryptographically random idempotency token.
 * @returns {string}
 */
export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Offline Sync Queue Service
 * Manages queued offline mutations with idempotency tokens and replays them when network is restored.
 */
export class SyncQueueService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isReplaying = false;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  handleNetworkChange(onlineStatus) {
    this.isOnline = Boolean(onlineStatus);
    this.notifyListeners({ isOnline: this.isOnline, queueSize: this.getQueue().length });
    if (this.isOnline) {
      this.replayQueue();
    }
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(state) {
    for (const cb of this.listeners) {
      try {
        cb(state);
      } catch (err) {
        console.error('[SyncQueueService] Listener error:', err);
      }
    }
  }

  /**
   * Retrieves all pending mutations from storage.
   * @returns {Array<object>}
   */
  getQueue() {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return [];
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('[SyncQueueService] Failed to read sync queue:', err);
    }
    return [];
  }

  /**
   * Saves mutations list to storage.
   * @param {Array<object>} queue
   */
  saveQueue(queue) {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return;
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.notifyListeners({ isOnline: this.isOnline, queueSize: queue.length });
    } catch (err) {
      console.warn('[SyncQueueService] Failed to persist sync queue:', err);
    }
  }

  /**
   * Enqueues an offline mutation.
   * @param {'ADD'|'UPDATE'|'DELETE'|'STATUS_CHANGE'} type
   * @param {object} payload
   * @param {string|null} [userId=null]
   * @returns {object} The queued mutation record
   */
  enqueue(type, payload, userId = null) {
    if (!MUTATION_TYPES[type]) {
      throw new Error(`Invalid mutation type: ${type}`);
    }

    const mutation = {
      id: generateIdempotencyKey(),
      type,
      payload,
      userId,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    const currentQueue = this.getQueue();
    // Avoid exact duplicate payloads if already enqueued
    const deduplicated = currentQueue.filter(
      (m) => !(m.type === type && m.payload?.id === payload?.id && m.type !== MUTATION_TYPES.STATUS_CHANGE)
    );

    deduplicated.push(mutation);
    this.saveQueue(deduplicated);

    // If online, immediately attempt replay
    if (this.isOnline && !this.isReplaying) {
      this.replayQueue();
    }

    return mutation;
  }

  /**
   * Clears the sync queue.
   */
  clearQueue() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem(QUEUE_STORAGE_KEY);
      }
      this.notifyListeners({ isOnline: this.isOnline, queueSize: 0 });
    } catch {}
  }

  /**
   * Replays pending mutations sequentially against local & cloud adapters.
   * @returns {Promise<{ processed: number, failed: number, remaining: number }>}
   */
  async replayQueue() {
    if (this.isReplaying) return { processed: 0, failed: 0, remaining: this.getQueue().length };
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

    this.isReplaying = true;
    let processed = 0;
    let failed = 0;
    const remainingQueue = [];

    for (const mutation of queue) {
      try {
        const { type, payload, userId } = mutation;

        if (type === MUTATION_TYPES.ADD || type === MUTATION_TYPES.UPDATE) {
          idbStorageAdapter.setUserId(userId);
          await idbStorageAdapter.upsertPackage(payload);
          if (cloudAdapter.isFirestoreActive()) {
            await cloudAdapter.upsertPackage(payload);
          }
        } else if (type === MUTATION_TYPES.DELETE) {
          idbStorageAdapter.setUserId(userId);
          await idbStorageAdapter.deletePackage(payload.id || payload);
          if (cloudAdapter.isFirestoreActive()) {
            await cloudAdapter.deletePackage(payload.id || payload);
          }
        } else if (type === MUTATION_TYPES.STATUS_CHANGE) {
          idbStorageAdapter.setUserId(userId);
          const pkgs = await idbStorageAdapter.getPackages();
          const target = pkgs.find(p => p.id === payload.packageId);
          if (target && deliveryService.canTransition(target.status, payload.newStatus)) {
            const updated = {
              ...target,
              status: payload.newStatus,
              updatedAt: new Date().toISOString()
            };
            await idbStorageAdapter.upsertPackage(updated);
            if (cloudAdapter.isFirestoreActive()) {
              await cloudAdapter.upsertPackage(updated);
            }
          }
        }

        processed++;
      } catch (err) {
        console.warn(`[SyncQueueService] Failed to replay mutation ${mutation.id}:`, err);
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        if (mutation.retryCount < 5) {
          remainingQueue.push(mutation);
        }
        failed++;
      }
    }

    this.saveQueue(remainingQueue);
    this.isReplaying = false;

    return {
      processed,
      failed,
      remaining: remainingQueue.length
    };
  }
}

export const syncQueueService = new SyncQueueService();
