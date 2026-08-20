import { describe, it, expect } from 'vitest';

describe('Integration Testbench: Analytics Aggregation (Multi-carrier history -> turnaround calculation -> multi-currency totals)', () => {
  const sampleDeliveredPackages = [
    {
      id: 'pkg-turnaround-1',
      title: 'Espresso Machine',
      trackingNumber: 'RS948219481IL',
      carrier: 'israel-post',
      status: 'delivered',
      price: 150,
      currency: 'USD',
      orderDate: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-11T00:00:00Z', // exactly 10 days
      checkpoints: [
        { id: 'cp1', title: 'Delivered', timestamp: '2026-08-11T00:00:00Z', isCompleted: true }
      ]
    },
    {
      id: 'pkg-turnaround-2',
      title: 'Smart Watch',
      trackingNumber: '4829104821',
      carrier: 'dhl',
      status: 'delivered',
      price: 320,
      currency: 'USD',
      orderDate: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-08T00:00:00Z', // exactly 3 days
      checkpoints: [
        { id: 'cp2', title: 'Delivered', timestamp: '2026-08-08T00:00:00Z', isCompleted: true }
      ]
    },
    {
      id: 'pkg-turnaround-3',
      title: 'Hebrew Book Set',
      trackingNumber: 'CH123456789IL',
      carrier: 'israel-post',
      status: 'delivered',
      price: 180,
      currency: 'ILS',
      orderDate: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-16T00:00:00Z', // exactly 6 days
      checkpoints: [
        { id: 'cp3', title: 'Delivered', timestamp: '2026-08-16T00:00:00Z', isCompleted: true }
      ]
    }
  ];

  it('aggregates multi-currency financial totals accurately', () => {
    const currencyTotals = {};
    for (const pkg of sampleDeliveredPackages) {
      const cur = pkg.currency || 'USD';
      currencyTotals[cur] = (currencyTotals[cur] || 0) + (pkg.price || 0);
    }

    expect(currencyTotals['USD']).toBe(470);
    expect(currencyTotals['ILS']).toBe(180);
  });

  it('calculates turnaround speed leaderboard per carrier correctly', () => {
    const carrierLeadTimes = {};

    for (const pkg of sampleDeliveredPackages) {
      if (pkg.status !== 'delivered' || !pkg.orderDate) continue;
      const orderTs = new Date(pkg.orderDate).getTime();
      const deliveredTs = new Date(pkg.updatedAt).getTime();
      const days = Math.max(1, Math.round((deliveredTs - orderTs) / (1000 * 60 * 60 * 24)));

      if (!carrierLeadTimes[pkg.carrier]) {
        carrierLeadTimes[pkg.carrier] = { totalDays: 0, count: 0 };
      }
      carrierLeadTimes[pkg.carrier].totalDays += days;
      carrierLeadTimes[pkg.carrier].count += 1;
    }

    // Israel Post: (10 + 6) / 2 = 8 days
    const ilpAvg = carrierLeadTimes['israel-post'].totalDays / carrierLeadTimes['israel-post'].count;
    expect(ilpAvg).toBe(8);

    // DHL: 3 / 1 = 3 days
    const dhlAvg = carrierLeadTimes['dhl'].totalDays / carrierLeadTimes['dhl'].count;
    expect(dhlAvg).toBe(3);

    // Fastest carrier should be DHL
    const sortedCarriers = Object.entries(carrierLeadTimes).sort((a, b) => (a[1].totalDays / a[1].count) - (b[1].totalDays / b[1].count));
    expect(sortedCarriers[0][0]).toBe('dhl');
  });
});
