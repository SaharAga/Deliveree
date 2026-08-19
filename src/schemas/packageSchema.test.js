import { describe, it, expect } from 'vitest';
import {
  validatePackageSafe,
  validatePackageListSafe
} from './packageSchema';

describe('packageSchema Zod validation', () => {
  it('validates a complete, well-formed package', () => {
    const validPkg = {
      id: 'pkg-123',
      title: 'Ergonomic Keyboard',
      titleHe: 'מקלדת ארגונומית',
      trackingNumber: 'IL123456789IL',
      carrier: 'israel_post',
      carrierName: 'Israel Post',
      status: 'in_transit',
      category: 'electronics',
      orderDate: '2026-08-10',
      expectedDeliveryDate: '2026-08-25',
      origin: 'Shenzhen, China',
      destination: 'Tel Aviv, Israel',
      notes: 'Please leave at the door',
      notesHe: 'להשאיר ליד הדלת',
      isPinned: true,
      isArchived: false,
      checkpoints: [
        {
          id: 'cp-1',
          title: 'Departed sorting facility',
          titleHe: 'יצא ממרכז מיון',
          description: 'Package en route',
          location: 'Shenzhen',
          timestamp: '2026-08-12T10:00:00Z',
          isCompleted: true
        }
      ],
      createdAt: '2026-08-10T12:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
      userId: 'user-xyz-123'
    };

    const result = validatePackageSafe(validPkg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Ergonomic Keyboard');
      expect(result.data.trackingNumber).toBe('IL123456789IL');
      expect(result.data.status).toBe('in_transit');
      expect(result.data.checkpoints.length).toBe(1);
    }
  });

  it('rejects invalid statuses outside the permitted enum', () => {
    const invalidPkg = {
      id: 'pkg-123',
      title: 'Item',
      trackingNumber: 'TRK123',
      status: 'exploit_stage'
    };

    const result = validatePackageSafe(invalidPkg);
    expect(result.success).toBe(false);
  });

  it('rejects packages where checkpoints exceed array cap of 50', () => {
    const checkpoints = Array.from({ length: 51 }, (_, i) => ({
      id: `cp-${i}`,
      title: `Checkpoint ${i}`
    }));

    const result = validatePackageSafe({
      id: 'pkg-overflow',
      title: 'Overflowing Checkpoints',
      trackingNumber: 'TRK999',
      status: 'in_transit',
      checkpoints
    });

    expect(result.success).toBe(false);
  });

  it('enforces string length constraints on fields', () => {
    const longTitlePkg = {
      id: 'pkg-long',
      title: 'A'.repeat(201),
      trackingNumber: 'TRK123',
      status: 'in_transit'
    };

    const result = validatePackageSafe(longTitlePkg);
    expect(result.success).toBe(false);
  });

  it('strips extraneous unwhitelisted keys to prevent parameter injection / prototype pollution', () => {
    const dirtyData = {
      id: 'pkg-clean',
      title: 'Clean Item',
      trackingNumber: 'TRKCLEAN',
      status: 'shipped',
      maliciousField: 'exploit',
      __proto__: { polluted: true }
    };

    const result = validatePackageSafe(dirtyData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maliciousField).toBeUndefined();
      expect({}.polluted).toBeUndefined();
    }
  });

  it('validates package lists safely', () => {
    const list = [
      { id: 'pkg-1', title: 'Package 1', trackingNumber: 'TRK1', status: 'shipped' },
      { id: 'pkg-2', title: 'Package 2', trackingNumber: 'TRK2', status: 'delivered' }
    ];

    const result = validatePackageListSafe(list);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(2);
    }
  });
});
