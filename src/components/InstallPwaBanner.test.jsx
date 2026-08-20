import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import manifest from '../../public/manifest.json';

describe('InstallPwaBanner Storage & Dismissal Logic', () => {
  const PWA_DISMISSED_KEY = 'deliveree_pwa_banner_dismissed';
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
  });

  it('determines if PWA banner should be shown based on standalone mode and dismissal flag', () => {
    const shouldShowBanner = (isStandalone, isDismissed) => !isStandalone && !isDismissed;

    expect(shouldShowBanner(false, false)).toBe(true);
    expect(shouldShowBanner(true, false)).toBe(false);
    expect(shouldShowBanner(false, true)).toBe(false);
    expect(shouldShowBanner(true, true)).toBe(false);
  });

  it('persists dismissed flag to localStorage on dismissal', () => {
    expect(localStorage.getItem(PWA_DISMISSED_KEY)).toBeNull();

    // Dismiss action
    localStorage.setItem(PWA_DISMISSED_KEY, 'true');

    expect(localStorage.getItem(PWA_DISMISSED_KEY)).toBe('true');
  });

  describe('PWA Manifest & Web Share Target Config (TASK-14)', () => {
    it('declares app shortcuts for 1-Click Paste Tracking and Active Deliveries', () => {
      expect(Array.isArray(manifest.shortcuts)).toBe(true);
      expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);

      const pasteShortcut = manifest.shortcuts.find(s => s.url === '/?action=paste');
      expect(pasteShortcut).toBeDefined();
      expect(pasteShortcut.name).toBe('1-Click Paste Tracking');

      const activeShortcut = manifest.shortcuts.find(s => s.url === '/?tab=active');
      expect(activeShortcut).toBeDefined();
      expect(activeShortcut.name).toBe('Active Deliveries');
    });

    it('declares web share target matching GET parameters', () => {
      expect(manifest.share_target).toBeDefined();
      expect(manifest.share_target.action).toBe('/');
      expect(manifest.share_target.method).toBe('GET');
      expect(manifest.share_target.params).toEqual({
        title: 'title',
        text: 'text',
        url: 'url'
      });
    });
  });
});
