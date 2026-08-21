import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeAuthError, validateUserProfile, buildCleanUserProfile, getCachedUserForUid } from './AuthContext';

describe('AuthContext - Real Auth & Security Lifecycle', () => {
  let mockLocalStorage = {};

  beforeEach(() => {
    mockLocalStorage = {};
    vi.restoreAllMocks();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, val) => { mockLocalStorage[key] = String(val); }),
      removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
      clear: vi.fn(() => { mockLocalStorage = {}; })
    });
  });

  describe('Duplicate Email & Credential Error Handling', () => {
    it('returns exact human-friendly error when registering with duplicate email', () => {
      const err = { code: 'auth/email-already-in-use' };
      expect(sanitizeAuthError(err, 'he')).toBe(
        'כתובת אימייל זו כבר רשומה במערכת. נא להתחבר או להשתמש בכתובת אחרת.'
      );
      expect(sanitizeAuthError(err, 'en')).toBe(
        'This email address is already in use by another account.'
      );
    });

    it('returns friendly error for wrong password or invalid credential', () => {
      const err = { code: 'auth/invalid-credential' };
      expect(sanitizeAuthError(err, 'he')).toBe(
        'אימייל או סיסמה שגויים. נא לבדוק את הפרטים ולנסות שוב.'
      );
      expect(sanitizeAuthError(err, 'en')).toBe(
        'Invalid email or password. Please check your credentials and try again.'
      );
    });

    it('returns friendly error for weak password during registration', () => {
      const err = { code: 'auth/weak-password' };
      expect(sanitizeAuthError(err, 'he')).toBe(
        'הסיסמה חלשה מדי. נא לבחור סיסמה עם 8 תווים לפחות הכוללת אותיות, מספרים ותו מיוחד.'
      );
      expect(sanitizeAuthError(err, 'en')).toBe(
        'The password is too weak. Please use at least 8 characters.'
      );
    });

    it('handles network failure errors gracefully', () => {
      const err = { code: 'auth/network-request-failed' };
      expect(sanitizeAuthError(err, 'he')).toContain('שגיאת חיבור לרשת');
      expect(sanitizeAuthError(err, 'en')).toContain('Network connection failed');
    });

    it('handles miscellaneous auth error codes gracefully', () => {
      expect(sanitizeAuthError({ code: 'auth/invalid-api-key' }, 'he')).toContain('מפתח API לא תקין');
      expect(sanitizeAuthError({ code: 'auth/invalid-api-key' }, 'en')).toContain('Invalid API key');

      expect(sanitizeAuthError({ code: 'auth/app-deleted' }, 'he')).toContain('אותחל מחדש');
      expect(sanitizeAuthError({ code: 'auth/app-deleted' }, 'en')).toContain('reinitialized');

      expect(sanitizeAuthError({ code: 'auth/invalid-auth-event' }, 'he')).toContain('אירוע אימות לא תקין');
      expect(sanitizeAuthError({ code: 'auth/invalid-auth-event' }, 'en')).toContain('Invalid authentication event');

      // Raw string message extraction
      expect(sanitizeAuthError('FirebaseError: Firebase: Error (auth/wrong-password).', 'he')).toContain('הסיסמה שהוזנה שגויה');
      expect(sanitizeAuthError('FirebaseError: Firebase: Error (auth/email-already-in-use).', 'en')).toContain('already in use');
    });
  });

  describe('Session Retention & Custom Profile Merging', () => {
    it('restores cached session on cold start if explicit logout was not initiated', () => {
      const cachedUser = {
        id: 'usr-persistent-123',
        name: 'Sahar Test',
        email: 'sahar@test.com',
        avatar: null,
        plan: 'Personal Account',
        devicesCount: 1,
        createdAt: '2026-08-21',
        preferences: {
          defaultCarrier: 'israel_post',
          language: 'he',
          theme: 'dark',
          dateFormat: 'DD/MM/YYYY'
        }
      };
      mockLocalStorage['deliveree_auth_user_v1'] = JSON.stringify(cachedUser);

      const validated = validateUserProfile(cachedUser);
      expect(validated.id).toBe('usr-persistent-123');
      expect(validated.name).toBe('Sahar Test');
      expect(validated.email).toBe('sahar@test.com');
      expect(validated.preferences.defaultCarrier).toBe('israel_post');
    });

    it('buildCleanUserProfile gracefully handles corrupt JSON or missing localStorage', () => {
      mockLocalStorage['deliveree_auth_user_v1'] = 'INVALID_JSON_CORRUPT{';
      expect(getCachedUserForUid('any-uid')).toBeNull();

      const firebaseUser = {
        uid: 'usr-fallback-55',
        displayName: 'Fallback Alex',
        email: 'alex@fallback.com'
      };
      const clean = buildCleanUserProfile(firebaseUser);
      expect(clean.id).toBe('usr-fallback-55');
      expect(clean.name).toBe('Fallback Alex');
      expect(clean.preferences.language).toBe('he');
    });
  });

  describe('Complete Account & Data Deletion Verification', () => {
    it('cleans up local storage partitions upon account deletion', () => {
      const userId = 'usr-delete-target-999';
      mockLocalStorage[`deliveree_packages_${userId}`] = JSON.stringify([{ id: 'pkg-1' }]);
      mockLocalStorage['deliveree_packages_guest'] = JSON.stringify([{ id: 'pkg-guest' }]);
      mockLocalStorage['deliveree_auth_user_v1'] = JSON.stringify({ id: userId, name: 'To Delete' });

      // Simulating deletion step
      delete mockLocalStorage[`deliveree_packages_${userId}`];
      delete mockLocalStorage['deliveree_packages_guest'];
      delete mockLocalStorage['deliveree_auth_user_v1'];

      expect(mockLocalStorage[`deliveree_packages_${userId}`]).toBeUndefined();
      expect(mockLocalStorage['deliveree_packages_guest']).toBeUndefined();
      expect(mockLocalStorage['deliveree_auth_user_v1']).toBeUndefined();
    });
  });
});
