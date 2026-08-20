import { describe, it, expect } from 'vitest';
import { POPULAR_PICKUP_POINTS } from './LockerMapModal';

describe('LockerMapModal Logic & Data Specifications', () => {
  it('exposes valid pickup points with geolocation coordinates and contact details', () => {
    expect(Array.isArray(POPULAR_PICKUP_POINTS)).toBe(true);
    expect(POPULAR_PICKUP_POINTS.length).toBeGreaterThanOrEqual(4);

    for (const point of POPULAR_PICKUP_POINTS) {
      expect(point.id).toBeDefined();
      expect(point.name).toBeDefined();
      expect(point.nameHe).toBeDefined();
      expect(point.address).toBeDefined();
      expect(point.addressHe).toBeDefined();
      expect(typeof point.lat).toBe('number');
      expect(typeof point.lng).toBe('number');
      expect(point.lat).toBeGreaterThan(29);
      expect(point.lat).toBeLessThan(34);
      expect(point.lng).toBeGreaterThan(34);
      expect(point.lng).toBeLessThan(36);
    }
  });

  it('correctly constructs Waze navigation URL', () => {
    const getWazeUrl = (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const dizengoff = POPULAR_PICKUP_POINTS[0];
    const url = getWazeUrl(dizengoff.lat, dizengoff.lng);
    expect(url).toContain('https://waze.com/ul?ll=32.0754,34.775&navigate=yes');
  });

  it('correctly constructs Google Maps search URL', () => {
    const getGoogleMapsUrl = (lat, lng, query) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || `${lat},${lng}`)}`;
    const azrieli = POPULAR_PICKUP_POINTS[1];
    const url = getGoogleMapsUrl(azrieli.lat, azrieli.lng, azrieli.address);
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(url).toContain('Menachem%20Begin');
  });

  it('filters locations by bilingual text accurately', () => {
    const searchFilter = (query) => {
      const q = query.toLowerCase();
      return POPULAR_PICKUP_POINTS.filter(
        point =>
          point.name.toLowerCase().includes(q) ||
          point.nameHe.includes(q) ||
          point.address.toLowerCase().includes(q) ||
          point.addressHe.includes(q) ||
          point.carrier.toLowerCase().includes(q)
      );
    };

    expect(searchFilter('Dizengoff').length).toBe(1);
    expect(searchFilter('דיזנגוף').length).toBe(1);
    expect(searchFilter('Modiin').length).toBe(1);
    expect(searchFilter('BoxIt').length).toBe(2);
    expect(searchFilter('non_existent_locker_query').length).toBe(0);
  });
});
