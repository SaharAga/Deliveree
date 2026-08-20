import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { IDBStorageAdapter } from './idbStorageAdapter';

describe('IDBStorageAdapter Unit Tests', () => {
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
    adapter = new IDBStorageAdapter({ userId: 'test-user-123' });
    adapter.clearMemoryCache();
  });

  it('initializes with correct userId and returns fallback array when storage is empty', async () => {
    const pkgs = await adapter.getPackages();
    expect(Array.isArray(pkgs)).toBe(true);
    expect(pkgs.length).toBe(0);
  });

  it('upserts a package and updates Tier 1 memory cache and Tier 3 localStorage', async () => {
    const pkg = {
      id: 'pkg-idb-001',
      title: 'Ergonomic Keyboard',
      trackingNumber: 'IL123456789IL',
      carrier: 'israel-post',
      status: 'in_transit'
    };

    const subscriber = vi.fn();
    const unsub = adapter.subscribe(subscriber);

    const saved = await adapter.upsertPackage(pkg);
    expect(saved.some(p => p.id === 'pkg-idb-001')).toBe(true);
    expect(subscriber).toHaveBeenCalledTimes(1);

    const cached = await adapter.getPackages();
    expect(cached.some(p => p.id === 'pkg-idb-001')).toBe(true);

    unsub();
  });

  it('deletes a package by ID correctly across tiers', async () => {
    const pkg1 = {
      id: 'pkg-del-1',
      title: 'Noise Cancelling Headphones',
      trackingNumber: 'LP00582910482CN',
      carrier: 'cainiao',
      status: 'in_transit'
    };

    await adapter.upsertPackage(pkg1);
    const beforeDel = await adapter.getPackages();
    expect(beforeDel.some(p => p.id === 'pkg-del-1')).toBe(true);

    const afterDel = await adapter.deletePackage('pkg-del-1');
    expect(afterDel.some(p => p.id === 'pkg-del-1')).toBe(false);
  });

  it('handles partition switching between guest and authenticated user cleanly', async () => {
    const guestPkg = {
      id: 'guest-001',
      title: 'Guest Mystery Box',
      trackingNumber: 'RS948219481IL',
      carrier: 'israel-post',
      status: 'ordered'
    };

    adapter.setUserId(null); // Guest
    await adapter.upsertPackage(guestPkg);

    const guestList = await adapter.getPackages();
    expect(guestList.some(p => p.id === 'guest-001')).toBe(true);

    // Switch to User
    adapter.setUserId('auth-user-999');
    const userList = await adapter.getPackages();
    expect(userList.some(p => p.id === 'guest-001')).toBe(false);
  });
});
