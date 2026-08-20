import { validatePackageListSafe, validatePackageSafe } from '../schemas/packageSchema';
import { validatePackageList, validatePackage } from '../utils/packageValidator';
import { deliveryService } from './deliveryService';

/**
 * IndexedDB Configuration Constants
 */
export const DB_NAME = 'deliveree_idb_store';
export const DB_VERSION = 1;
export const STORE_PACKAGES = 'packages';
export const STORE_METADATA = 'metadata';
export const SWR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes stale window

/**
 * In-memory L1 cache map to provide sub-millisecond access (Tier 1).
 */
const memoryCache = new Map();
let memoryCacheTimestamp = 0;

/**
 * Validates a package item strictly using Zod schema with fallback.
 * @param {unknown} pkg
 * @returns {object|null}
 */
export function strictlyValidatePackage(pkg) {
  const result = validatePackageSafe(pkg);
  if (result.success) {
    return result.data;
  }
  return validatePackage(pkg);
}

/**
 * Validates a package list strictly using Zod schema with fallback.
 * @param {unknown} packages
 * @returns {Array<object>}
 */
export function strictlyValidatePackageList(packages) {
  if (!Array.isArray(packages)) return [];
  const result = validatePackageListSafe(packages);
  if (result.success) {
    return result.data;
  }
  return validatePackageList(packages);
}

/**
 * Opens or upgrades the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>}
 */
export function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || !indexedDB) {
      reject(new Error('IndexedDB is not supported in this runtime environment'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_PACKAGES)) {
          const packageStore = db.createObjectStore(STORE_PACKAGES, { keyPath: 'id' });
          packageStore.createIndex('userId', 'userId', { unique: false });
          packageStore.createIndex('status', 'status', { unique: false });
          packageStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        reject(new Error('IndexedDB open blocked by another connection'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 4-Tier High-Performance Storage Adapter:
 * Tier 1: In-Memory L1 Cache (Sub-ms)
 * Tier 2: IndexedDB Persistence (Asynchronous, High Capacity)
 * Tier 3: LocalStorage Fallback & Migration (Synchronous fallback)
 * Tier 4: Remote Cloud / SWR Sync
 */
export class IDBStorageAdapter {
  constructor(options = {}) {
    this.userId = options.userId || null;
    this.useLocalStorageFallback = false;
    this.subscribers = new Set();
    this._initPromise = null;
    this._migratedKeys = new Set();
  }

  setUserId(userId) {
    if (this.userId === userId) return;
    this.userId = userId;
    this.clearMemoryCache();
  }

  clearMemoryCache() {
    memoryCache.clear();
    memoryCacheTimestamp = 0;
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.add(callback);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  notifySubscribers(data) {
    for (const callback of this.subscribers) {
      try {
        callback(data);
      } catch (err) {
        console.error('[IDBStorageAdapter] Subscriber error:', err);
      }
    }
  }

  /**
   * Derives storage partition key.
   */
  getPartitionKey() {
    return this.userId ? `user_${this.userId}` : 'guest';
  }

  /**
   * Migrate legacy data from localStorage into IndexedDB seamlessly.
   */
  async migrateFromLocalStorage() {
    const partitionKey = this.getPartitionKey();
    if (this._migratedKeys.has(partitionKey)) return;

    try {
      const localPackages = deliveryService.getPackages(this.userId);
      if (Array.isArray(localPackages) && localPackages.length > 0) {
        const db = await openIndexedDB();
        const tx = db.transaction([STORE_PACKAGES], 'readwrite');
        const store = tx.objectStore(STORE_PACKAGES);

        for (const pkg of localPackages) {
          const itemToStore = {
            ...pkg,
            userId: this.userId || 'guest',
            _partition: partitionKey
          };
          store.put(itemToStore);
        }

        await new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      }
      this._migratedKeys.add(partitionKey);
    } catch (err) {
      console.warn('[IDBStorageAdapter] Migration from localStorage skipped/failed:', err);
    }
  }

  /**
   * Retrieves all packages using Stale-While-Revalidate pattern.
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<Array<object>>}
   */
  async getPackages(forceRefresh = false) {
    const partitionKey = this.getPartitionKey();
    const now = Date.now();

    // Tier 1: Check In-Memory L1 Cache
    if (!forceRefresh && memoryCache.has(partitionKey) && (now - memoryCacheTimestamp < SWR_CACHE_TTL_MS)) {
      return memoryCache.get(partitionKey);
    }

    // Tier 2: Fetch from IndexedDB
    try {
      await this.migrateFromLocalStorage();
      const db = await openIndexedDB();
      const tx = db.transaction([STORE_PACKAGES], 'readonly');
      const store = tx.objectStore(STORE_PACKAGES);

      const items = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Filter by current partition / user scope
      const userScoped = items.filter((item) => {
        if (this.userId) {
          return item.userId === this.userId || item._partition === partitionKey;
        }
        return !item.userId || item.userId === 'guest' || item._partition === partitionKey;
      });

      const validated = strictlyValidatePackageList(userScoped);

      // Update L1 Cache
      memoryCache.set(partitionKey, validated);
      memoryCacheTimestamp = now;

      // Keep LocalStorage in sync as Tier 3 shadow backup
      deliveryService.savePackages(validated, this.userId);

      return validated;
    } catch (err) {
      // Tier 3: LocalStorage Fallback
      console.warn('[IDBStorageAdapter] IndexedDB read failed, falling back to localStorage:', err);
      this.useLocalStorageFallback = true;
      const fallbackList = deliveryService.getPackages(this.userId);
      memoryCache.set(partitionKey, fallbackList);
      memoryCacheTimestamp = now;
      return fallbackList;
    }
  }

  /**
   * Bulk saves/replaces packages for current partition.
   * @param {Array<object>} packages
   * @returns {Promise<Array<object>>}
   */
  async savePackages(packages) {
    const validated = strictlyValidatePackageList(packages);
    const partitionKey = this.getPartitionKey();

    // Update L1 Cache immediately (Tier 1)
    memoryCache.set(partitionKey, validated);
    memoryCacheTimestamp = Date.now();

    // Sync LocalStorage Shadow (Tier 3)
    deliveryService.savePackages(validated, this.userId);

    // Notify UI Subscribers
    this.notifySubscribers(validated);

    // Tier 2: Persist to IndexedDB
    try {
      const db = await openIndexedDB();
      const tx = db.transaction([STORE_PACKAGES], 'readwrite');
      const store = tx.objectStore(STORE_PACKAGES);

      // Delete existing records for partition or clean replace
      const allRecords = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const rec of allRecords) {
        if (this.userId ? (rec.userId === this.userId || rec._partition === partitionKey) : (!rec.userId || rec.userId === 'guest' || rec._partition === partitionKey)) {
          store.delete(rec.id);
        }
      }

      for (const pkg of validated) {
        store.put({
          ...pkg,
          userId: this.userId || 'guest',
          _partition: partitionKey,
          updatedAt: pkg.updatedAt || new Date().toISOString()
        });
      }

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[IDBStorageAdapter] IndexedDB save failed, saved to localStorage only:', err);
    }

    return validated;
  }

  /**
   * Upsert a single package.
   * @param {object} pkg
   * @returns {Promise<Array<object>>}
   */
  async upsertPackage(pkg) {
    const validatedPkg = strictlyValidatePackage(pkg);
    if (!validatedPkg) {
      return await this.getPackages();
    }

    const currentList = await this.getPackages();
    const index = currentList.findIndex((p) => p.id === validatedPkg.id);

    let updatedList;
    if (index >= 0) {
      updatedList = [...currentList];
      updatedList[index] = validatedPkg;
    } else {
      updatedList = [validatedPkg, ...currentList];
    }

    return await this.savePackages(updatedList);
  }

  /**
   * Delete a single package by ID.
   * @param {string} packageId
   * @returns {Promise<Array<object>>}
   */
  async deletePackage(packageId) {
    const currentList = await this.getPackages();
    const updatedList = currentList.filter((p) => p.id !== packageId);

    const partitionKey = this.getPartitionKey();
    memoryCache.set(partitionKey, updatedList);
    memoryCacheTimestamp = Date.now();

    deliveryService.savePackages(updatedList, this.userId);
    this.notifySubscribers(updatedList);

    try {
      const db = await openIndexedDB();
      const tx = db.transaction([STORE_PACKAGES], 'readwrite');
      const store = tx.objectStore(STORE_PACKAGES);
      store.delete(packageId);

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[IDBStorageAdapter] IndexedDB delete error:', err);
    }

    return updatedList;
  }

  /**
   * Clear all records in current partition.
   * @returns {Promise<Array<object>>}
   */
  async clearPartition() {
    return await this.savePackages([]);
  }
}

export const idbStorageAdapter = new IDBStorageAdapter();
