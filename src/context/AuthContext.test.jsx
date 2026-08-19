import { describe, it, expect } from 'vitest';
import { validateUserProfile, sanitizeAuthError } from './AuthContext';

describe('AuthContext - sanitizeAuthError', () => {
  it('maps known Firebase auth codes to sanitized user-friendly messages', () => {
    expect(sanitizeAuthError({ code: 'auth/user-not-found' })).toBe(
      'Invalid email or password. Please check your credentials and try again.'
    );
    expect(sanitizeAuthError({ code: 'auth/email-already-in-use' })).toBe(
      'This email address is already in use by another account.'
    );
    expect(sanitizeAuthError({ code: 'auth/popup-blocked' })).toBe(
      'Sign-in popup was blocked by your browser. Please allow popups or use email.'
    );
    expect(sanitizeAuthError({ code: 'auth/too-many-requests' })).toBe(
      'Too many unsuccessful attempts. Access temporarily disabled. Try again later.'
    );
  });

  it('strips internal codes and raw prefixes from unknown errors', () => {
    const rawError = { message: 'Firebase: Error (auth/unauthorized-domain) https://accounts.google.com/xyz' };
    const sanitized = sanitizeAuthError(rawError);
    expect(sanitized).not.toContain('auth/unauthorized-domain');
    expect(sanitized).not.toContain('Firebase:');
  });

  it('handles nullish errors gracefully', () => {
    expect(sanitizeAuthError(null)).toBe('An unexpected authentication error occurred. Please try again.');
    expect(sanitizeAuthError(undefined)).toBe('An unexpected authentication error occurred. Please try again.');
  });
});

describe('AuthContext - validateUserProfile', () => {
  it('returns null for non-object and nullish inputs', () => {
    expect(validateUserProfile(null)).toBeNull();
    expect(validateUserProfile(undefined)).toBeNull();
    expect(validateUserProfile('string')).toBeNull();
    expect(validateUserProfile(12345)).toBeNull();
    expect(validateUserProfile([])).toBeNull();
  });

  it('validates and normalizes valid user profiles', () => {
    const raw = {
      id: 'usr-123',
      name: 'Alice Developer',
      email: 'alice@example.com',
      avatar: 'https://example.com/avatar.jpg',
      ingestionEmail: 'alice.pkg123@in.deliveree.app',
      plan: 'Personal Account',
      devicesCount: 3,
      createdAt: '2026-08-15'
    };

    const validated = validateUserProfile(raw);
    expect(validated).toEqual({
      ...raw,
      preferences: {
        defaultCarrier: 'all',
        language: 'he',
        theme: 'dark',
        dateFormat: 'DD/MM/YYYY'
      }
    });
  });

  it('sanitizes XSS payloads and script tags from user fields', () => {
    const malicious = {
      id: 'usr-hacker',
      name: 'Alice <script>alert(1)</script>',
      email: 'alice<img src=x onerror=steal()>@example.com',
      avatar: 'javascript:alert(document.cookie)',
      plan: '<b>Pro</b> Plan',
      devicesCount: 2
    };

    const validated = validateUserProfile(malicious);
    expect(validated.name).toBe('Alice');
    expect(validated.email).toBe('alice@example.com');
    expect(validated.avatar).toBeNull();
    expect(validated.plan).toBe('Pro Plan');
  });

  it('guards against prototype pollution attacks in user profile', () => {
    const polluted = JSON.parse(
      '{"id": "usr-pwn", "name": "Hacker", "__proto__": {"isAdmin": true}, "constructor": {"prototype": {"isSuper": true}}}'
    );

    const validated = validateUserProfile(polluted);
    expect(validated.id).toBe('usr-pwn');
    expect({}.isAdmin).toBeUndefined();
    expect({}.isSuper).toBeUndefined();
    expect(Object.prototype.isAdmin).toBeUndefined();
  });

  it('normalizes missing or invalid numeric fields like devicesCount', () => {
    const invalidNumbers = {
      name: 'Bob',
      devicesCount: -5
    };

    const validated = validateUserProfile(invalidNumbers);
    expect(validated.devicesCount).toBe(1);

    const nanDevices = validateUserProfile({ name: 'Bob', devicesCount: NaN });
    expect(nanDevices.devicesCount).toBe(1);
  });

  it('provides sensible default properties and preferences when minimal data is supplied', () => {
    const minimal = { name: 'Charlie' };
    const validated = validateUserProfile(minimal);

    expect(validated.name).toBe('Charlie');
    expect(validated.email).toBe('user@example.com');
    expect(validated.plan).toBe('Personal Account');
    expect(validated.ingestionEmail).toBe('charlie.pkg@in.deliveree.app');
    expect(validated.devicesCount).toBe(1);
    expect(validated.preferences).toEqual({
      defaultCarrier: 'all',
      language: 'he',
      theme: 'dark',
      dateFormat: 'DD/MM/YYYY'
    });
  });

  it('validates and sanitizes custom user preferences', () => {
    const withCustomPrefs = {
      id: 'usr-456',
      name: 'Dana',
      preferences: {
        defaultCarrier: 'israel_post',
        language: 'en',
        theme: 'light',
        dateFormat: 'YYYY-MM-DD'
      }
    };

    const validated = validateUserProfile(withCustomPrefs);
    expect(validated.preferences.defaultCarrier).toBe('israel_post');
    expect(validated.preferences.language).toBe('en');
    expect(validated.preferences.theme).toBe('light');
    expect(validated.preferences.dateFormat).toBe('YYYY-MM-DD');
  });
});
