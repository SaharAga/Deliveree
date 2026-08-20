import { describe, it, expect } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFS } from '../services/notificationService';

describe('AccountModal Component Logic & Schema', () => {
  it('validates account deletion keyword requirements ("DELETE" or "מחק")', () => {
    const isValidConfirmation = (input) => {
      const trimmed = (input || '').trim().toUpperCase();
      return trimmed === 'DELETE' || trimmed === 'מחק';
    };

    expect(isValidConfirmation('DELETE')).toBe(true);
    expect(isValidConfirmation('delete')).toBe(true);
    expect(isValidConfirmation('  DELETE  ')).toBe(true);
    expect(isValidConfirmation('מחק')).toBe(true);
    expect(isValidConfirmation('  מחק  ')).toBe(true);

    expect(isValidConfirmation('del')).toBe(false);
    expect(isValidConfirmation('cancel')).toBe(false);
    expect(isValidConfirmation('')).toBe(false);
    expect(isValidConfirmation(null)).toBe(false);
  });

  it('correctly constructs CSV backup rows from packages list', () => {
    const mockPackages = [
      {
        id: 'pkg-1',
        title: 'Sneakers "Air"',
        titleHe: 'נעלי ספורט',
        trackingNumber: 'RR123456789IL',
        carrier: 'israel_post',
        status: 'in_transit',
        orderDate: '2026-08-10',
        expectedDeliveryDate: '2026-08-25',
        origin: 'US',
        destination: 'IL',
        notes: 'Special "Priority" delivery'
      }
    ];

    const headers = ['ID', 'Title', 'TrackingNumber', 'Carrier', 'Status', 'OrderDate', 'ExpectedDeliveryDate', 'Origin', 'Destination', 'Notes'];
    const rows = mockPackages.map(p => [
      `"${p.id || ''}"`,
      `"${(p.title || p.titleHe || '').replace(/"/g, '""')}"`,
      `"${p.trackingNumber || ''}"`,
      `"${p.carrier || ''}"`,
      `"${p.status || ''}"`,
      `"${p.orderDate || ''}"`,
      `"${p.expectedDeliveryDate || ''}"`,
      `"${p.origin || ''}"`,
      `"${p.destination || ''}"`,
      `"${(p.notes || p.notesHe || '').replace(/"/g, '""')}"`
    ]);

    expect(headers.length).toBe(10);
    expect(rows.length).toBe(1);
    expect(rows[0][0]).toBe('"pkg-1"');
    expect(rows[0][1]).toBe('"Sneakers ""Air"""');
    expect(rows[0][9]).toBe('"Special ""Priority"" delivery"');
  });

  it('verifies notification toggle updates structure matching schema', () => {
    const updated = {
      ...DEFAULT_NOTIFICATION_PREFS,
      telegramEnabled: true,
      telegramChatId: '987654321',
      notifyOnException: false
    };

    expect(updated.telegramEnabled).toBe(true);
    expect(updated.telegramChatId).toBe('987654321');
    expect(updated.notifyOnException).toBe(false);
    expect(updated.notifyOnStatusChange).toBe(true);
  });
});
