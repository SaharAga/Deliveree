import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  extractPackageValue,
  calculatePackageTransitDays,
  calculateCarrierTurnaroundLeaderboard,
  calculateMultiCurrencyBreakdown,
  calculateDeliveryMetrics,
  SUPPORTED_CURRENCIES
} from './analyticsUtils';

describe('analyticsUtils - Multi-Currency & Turnaround Calculations', () => {
  describe('SUPPORTED_CURRENCIES Constant', () => {
    it('defines ILS, USD, EUR, and GBP currency metadata', () => {
      expect(SUPPORTED_CURRENCIES.ILS.symbol).toBe('₪');
      expect(SUPPORTED_CURRENCIES.USD.symbol).toBe('$');
      expect(SUPPORTED_CURRENCIES.EUR.symbol).toBe('€');
      expect(SUPPORTED_CURRENCIES.GBP.symbol).toBe('£');
    });
  });

  describe('extractPackageValue', () => {
    it('extracts numeric value and currency from explicit package fields', () => {
      expect(extractPackageValue({ value: 150, currency: 'ILS' })).toEqual({ amount: 150, currency: 'ILS' });
      expect(extractPackageValue({ price: 49.99, currency: 'USD' })).toEqual({ amount: 49.99, currency: 'USD' });
      expect(extractPackageValue({ amount: 120, currency: 'EUR' })).toEqual({ amount: 120, currency: 'EUR' });
      expect(extractPackageValue({ value: 85.5, currency: 'GBP' })).toEqual({ amount: 85.5, currency: 'GBP' });
    });

    it('extracts currency from Hebrew & string formats', () => {
      expect(extractPackageValue({ value: '₪250' })).toEqual({ amount: 250, currency: 'ILS' });
      expect(extractPackageValue({ value: '$129.99' })).toEqual({ amount: 129.99, currency: 'USD' });
      expect(extractPackageValue({ value: '€89.50' })).toEqual({ amount: 89.5, currency: 'EUR' });
      expect(extractPackageValue({ value: '£45' })).toEqual({ amount: 45, currency: 'GBP' });
    });

    it('extracts currency and value from notes and title text', () => {
      expect(extractPackageValue({ notes: 'Purchased for $45 on sale' })).toEqual({ amount: 45, currency: 'USD' });
      expect(extractPackageValue({ titleHe: 'שולם 120 ש"ח כולל מע"מ' })).toEqual({ amount: 120, currency: 'ILS' });
      expect(extractPackageValue({ notes: 'Total price: €99.00' })).toEqual({ amount: 99, currency: 'EUR' });
      expect(extractPackageValue({ notesHe: 'מחיר: £35' })).toEqual({ amount: 35, currency: 'GBP' });
    });

    it('returns null for missing or invalid values safely', () => {
      expect(extractPackageValue(null)).toBeNull();
      expect(extractPackageValue(undefined)).toBeNull();
      expect(extractPackageValue({})).toBeNull();
      expect(extractPackageValue({ notes: 'No price mentioned here' })).toBeNull();
      expect(extractPackageValue({ value: -50 })).toBeNull();
    });
  });

  describe('calculatePackageTransitDays', () => {
    it('calculates days from orderDate to delivered updatedAt', () => {
      const pkg = {
        orderDate: '2026-08-01T00:00:00Z',
        status: 'delivered',
        updatedAt: '2026-08-11T00:00:00Z'
      };
      expect(calculatePackageTransitDays(pkg)).toBe(10);
    });

    it('calculates transit days using checkpoints when available', () => {
      const pkg = {
        status: 'delivered',
        checkpoints: [
          { title: 'Package Shipped', timestamp: '2026-08-01T00:00:00Z' },
          { title: 'Delivered', timestamp: '2026-08-06T00:00:00Z' }
        ]
      };
      expect(calculatePackageTransitDays(pkg)).toBe(5);
    });

    it('guarantees a minimum of 1 day for same-day delivery to avoid zero division', () => {
      const pkg = {
        orderDate: '2026-08-10',
        status: 'delivered',
        updatedAt: '2026-08-10T11:00:00Z'
      };
      expect(calculatePackageTransitDays(pkg)).toBeGreaterThanOrEqual(1);
    });

    it('handles clock-skew or invalid timestamps gracefully', () => {
      const pkg = {
        orderDate: '2026-08-15',
        status: 'delivered',
        updatedAt: '2026-08-10T11:00:00Z' // Before order date
      };
      expect(calculatePackageTransitDays(pkg)).toBe(1);
    });
  });

  describe('calculateCarrierTurnaroundLeaderboard', () => {
    it('ranks carriers with faster average turnaround higher', () => {
      const packages = [
        { id: '1', carrier: 'dhl', status: 'delivered', orderDate: '2026-08-01T00:00:00Z', updatedAt: '2026-08-04T00:00:00Z' }, // 3 days
        { id: '2', carrier: 'israel-post', status: 'delivered', orderDate: '2026-08-01T00:00:00Z', updatedAt: '2026-08-11T00:00:00Z' }, // 10 days
        { id: '3', carrier: 'chita', status: 'in_transit', orderDate: '2026-08-10' }
      ];

      const leaderboard = calculateCarrierTurnaroundLeaderboard(packages);
      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].carrierId).toBe('dhl');
      expect(leaderboard[0].avgDays).toBe(3);
      expect(leaderboard[1].carrierId).toBe('israel-post');
      expect(leaderboard[1].avgDays).toBe(10);
    });

    it('returns empty array when packages array is empty', () => {
      expect(calculateCarrierTurnaroundLeaderboard([])).toEqual([]);
      expect(calculateCarrierTurnaroundLeaderboard(null)).toEqual([]);
    });
  });

  describe('calculateMultiCurrencyBreakdown', () => {
    it('partitions spending by ILS, USD, EUR, and GBP', () => {
      const packages = [
        { id: '1', value: 200, currency: 'ILS' },
        { id: '2', value: 150.50, currency: 'ILS' },
        { id: '3', value: 50, currency: 'USD' },
        { id: '4', value: 80, currency: 'EUR' },
        { id: '5', value: 30, currency: 'GBP' }
      ];

      const result = calculateMultiCurrencyBreakdown(packages);
      expect(result.hasValues).toBe(true);
      expect(result.totalValuedPackages).toBe(5);
      expect(result.currencies.ILS.total).toBe(350.5);
      expect(result.currencies.ILS.count).toBe(2);
      expect(result.currencies.USD.total).toBe(50);
      expect(result.currencies.EUR.total).toBe(80);
      expect(result.currencies.GBP.total).toBe(30);
    });

    it('returns default zeroed currencies when no values present', () => {
      const result = calculateMultiCurrencyBreakdown([{ id: '1', title: 'Package without price' }]);
      expect(result.hasValues).toBe(false);
      expect(result.totalValuedPackages).toBe(0);
      expect(result.currencies.ILS.total).toBe(0);
      expect(result.currencies.USD.total).toBe(0);
    });
  });

  describe('calculateDeliveryMetrics', () => {
    it('calculates success rate, on-time rate, and active counts accurately', () => {
      const packages = [
        { id: '1', status: 'delivered', orderDate: '2026-08-01T00:00:00Z', updatedAt: '2026-08-05T00:00:00Z', carrier: 'dhl' },
        { id: '2', status: 'delivered', orderDate: '2026-08-01T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', carrier: 'israel-post' },
        { id: '3', status: 'customs', carrier: 'cainiao' },
        { id: '4', status: 'exception', carrier: 'fedex' }
      ];

      const metrics = calculateDeliveryMetrics(packages);
      expect(metrics.totalCount).toBe(4);
      expect(metrics.deliveredCount).toBe(2);
      expect(metrics.activeCount).toBe(2);
      expect(metrics.customsCount).toBe(1);
      expect(metrics.exceptionCount).toBe(1);
      expect(metrics.deliverySuccessRate).toBe(75); // (4-1)/4 = 75%
      expect(metrics.avgTransitDays).toBeGreaterThan(0);
    });

    it('handles empty package list without crashing or NaN', () => {
      const metrics = calculateDeliveryMetrics([]);
      expect(metrics.totalCount).toBe(0);
      expect(metrics.deliverySuccessRate).toBe(100);
      expect(metrics.onTimeRate).toBe(100);
      expect(metrics.avgTransitDays).toBe(0);
      expect(Number.isNaN(metrics.deliverySuccessRate)).toBe(false);
      expect(Number.isNaN(metrics.onTimeRate)).toBe(false);
    });
  });

  describe('Property-Based Invariants (fast-check)', () => {
    it('Invariant 1: Total partitioned valued packages === sum of individual currency counts', () => {
      const currencyArb = fc.constantFrom('ILS', 'USD', 'EUR', 'GBP');
      const packageArb = fc.record({
        id: fc.uuid(),
        value: fc.float({ min: 1, max: 5000, noNaN: true }),
        currency: currencyArb,
        status: fc.constantFrom('ordered', 'shipped', 'in_transit', 'delivered')
      });

      fc.assert(
        fc.property(fc.array(packageArb, { maxLength: 50 }), (pkgs) => {
          const breakdown = calculateMultiCurrencyBreakdown(pkgs);
          const sumCounts = Object.values(breakdown.currencies).reduce((acc, c) => acc + c.count, 0);
          expect(breakdown.totalValuedPackages).toBe(sumCounts);
        }),
        { numRuns: 200 }
      );
    });

    it('Invariant 2: Delivery metrics percentages are strictly bounded in [0, 100]', () => {
      const packageArb = fc.record({
        id: fc.uuid(),
        carrier: fc.constantFrom('israel-post', 'dhl', 'fedex', 'ups', 'cainiao', 'chita'),
        status: fc.constantFrom('ordered', 'shipped', 'in_transit', 'customs', 'delivered', 'exception'),
        orderDate: fc.constant('2026-08-01T00:00:00Z'),
        updatedAt: fc.constant('2026-08-10T12:00:00Z')
      });

      fc.assert(
        fc.property(fc.array(packageArb, { maxLength: 100 }), (pkgs) => {
          const metrics = calculateDeliveryMetrics(pkgs);
          expect(metrics.deliverySuccessRate).toBeGreaterThanOrEqual(0);
          expect(metrics.deliverySuccessRate).toBeLessThanOrEqual(100);
          expect(metrics.onTimeRate).toBeGreaterThanOrEqual(0);
          expect(metrics.onTimeRate).toBeLessThanOrEqual(100);
          expect(Number.isNaN(metrics.deliverySuccessRate)).toBe(false);
          expect(Number.isNaN(metrics.onTimeRate)).toBe(false);
        }),
        { numRuns: 200 }
      );
    });
  });
});
