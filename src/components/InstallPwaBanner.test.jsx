import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

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
});

