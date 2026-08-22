import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { CloudStorageAdapter } from './cloudStorageAdapter';

describe('CloudStorageAdapter', () => {
  let adapter;
  let mockStore = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (key) => mockStore[key] || null,
      setItem: (key, value) => { mockStore[key] = String(value); },
      removeItem: (key) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; }
    };
  });

  beforeEach(() => {
    localStorage.clear();
    adapter = new CloudStorageAdapter({ mode: 'local' });
  });

  it('returns empty array when storage is empty', async () => {
    const packages = await adapter.getPackages();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBe(0);
  });

  it('upserts a new package and notifies subscribers', async () => {
    const subscriber = vi.fn();
    const unsubscribe = adapter.subscribe(subscriber);

    const newPkg = {
      id: 'pkg-test-999',
      trackingNumber: 'IL123456789IL',
      title: 'Test Delivery Item',
      carrierId: 'israel-post',
      stageId: 'in_transit'
    };

    const savedList = await adapter.upsertPackage(newPkg);
    expect(savedList.some(p => p.id === 'pkg-test-999')).toBe(true);
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('deletes a package by ID', async () => {
    const newPkg = {
      id: 'pkg-delete-123',
      trackingNumber: 'IL999999999IL',
      title: 'Package to Delete',
      carrierId: 'israel-post',
      stageId: 'in_transit'
    };

    await adapter.upsertPackage(newPkg);
    const initialList = await adapter.getPackages();
    expect(initialList.length).toBe(1);

    const remaining = await adapter.deletePackage('pkg-delete-123');
    expect(remaining.some(p => p.id === 'pkg-delete-123')).toBe(false);
  });

  describe('upsertPackageRemote / deletePackageRemote (SYNC-08 replay path)', () => {
    it('throws rather than silently no-op-ing when userId is missing, so a caller (e.g. the sync queue replay loop) sees a real failure instead of a false success', async () => {
      await expect(adapter.upsertPackageRemote({ id: 'pkg-1', title: 'X', trackingNumber: 'T1' }, undefined))
        .rejects.toThrow(/userId/i);
      await expect(adapter.deletePackageRemote('pkg-1', undefined))
        .rejects.toThrow(/userId/i);
      await expect(adapter.upsertPackageRemote({ id: 'pkg-1', title: 'X', trackingNumber: 'T1' }, ''))
        .rejects.toThrow(/userId/i);
    });
  });
});
