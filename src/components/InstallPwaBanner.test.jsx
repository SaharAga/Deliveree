import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InstallPwaBanner } from './InstallPwaBanner';
import { LanguageProvider } from '../context/LanguageContext';

describe('InstallPwaBanner', () => {
  let mockStore = {};

  beforeAll(() => {
    globalThis.localStorage = {
      getItem: (key) => mockStore[key] || null,
      setItem: (key, value) => { mockStore[key] = String(value); },
      removeItem: (key) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; }
    };
    
    // Mock matchMedia
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
      };
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders install banner when not standalone and not dismissed', () => {
    render(
      <LanguageProvider>
        <InstallPwaBanner />
      </LanguageProvider>
    );

    expect(screen.getByText(/Deliveree/i)).toBeInTheDocument();
  });

  it('dismisses banner on Not Now button click and sets storage flag', () => {
    render(
      <LanguageProvider>
        <InstallPwaBanner />
      </LanguageProvider>
    );

    const dismissBtn = screen.getByText(/Not now|לא עכשיו/i);
    fireEvent.click(dismissBtn);

    expect(localStorage.getItem('deliveree_pwa_banner_dismissed')).toBeTruthy();
  });
});
