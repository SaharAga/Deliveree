import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  appleProvider, 
  facebookProvider, 
  isFirebaseConfigured 
} from '../services/firebase';
import { cloudAdapter } from '../services/cloudStorageAdapter';
import { deliveryService } from '../services/deliveryService';
import { sanitizeString } from '../utils/packageValidator';

const AuthContext = createContext();

const STORAGE_AUTH_KEY = 'deliveree_auth_user_v1';
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Executes a promise with a safety timeout to prevent UI hanging.
 */
async function withTimeout(promise, ms = 2000) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), ms);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return res;
  } catch (err) {
    clearTimeout(timeoutHandle);
    console.warn('[AuthContext] Firestore operation error:', err);
    return null;
  }
}

/**
 * Migrates isolated guest packages to user storage partition.
 */
export async function migrateGuestDataToUser(targetUserId) {
  if (!targetUserId || typeof targetUserId !== 'string') return [];
  try {
    const guestStored = localStorage.getItem('deliveree_packages_guest');
    if (!guestStored) return [];

    const guestPackages = deliveryService.getPackages(null);
    if (!Array.isArray(guestPackages) || guestPackages.length === 0) {
      localStorage.removeItem('deliveree_packages_guest');
      return [];
    }

    const userPackages = deliveryService.getPackages(targetUserId) || [];
    const existingTracking = new Set(userPackages.map((p) => p.trackingNumber).filter(Boolean));
    const existingIds = new Set(userPackages.map((p) => p.id).filter(Boolean));

    const packagesToAdd = [];
    for (const gPkg of guestPackages) {
      if (!gPkg) continue;
      const isDuplicate =
        (gPkg.trackingNumber && existingTracking.has(gPkg.trackingNumber)) ||
        (gPkg.id && existingIds.has(gPkg.id));
      if (!isDuplicate) {
        packagesToAdd.push({
          ...gPkg,
          userId: targetUserId
        });
        if (gPkg.trackingNumber) existingTracking.add(gPkg.trackingNumber);
        if (gPkg.id) existingIds.add(gPkg.id);
      }
    }

    const merged = [...packagesToAdd, ...userPackages];
    deliveryService.savePackages(merged, targetUserId);

    if (cloudAdapter) {
      cloudAdapter.setUserId(targetUserId);
      if (cloudAdapter.isFirestoreActive?.()) {
        withTimeout(cloudAdapter.savePackages(merged), 2500);
      }
    }

    localStorage.removeItem('deliveree_packages_guest');
    return merged;
  } catch (err) {
    console.warn('[AuthContext] Guest data migration error:', err);
    return [];
  }
}

/**
 * Sanitizes and translates all Firebase authentication error codes into clear human messages.
 */
export function sanitizeAuthError(err, language = 'en') {
  if (!err) {
    return language === 'he' 
      ? 'אירעה שגיאה בתהליך האימות. נא לנסות שוב.' 
      : 'An unexpected authentication error occurred. Please try again.';
  }
  
  const rawMsg = typeof err === 'object' && err !== null && err.message ? String(err.message) : String(err);
  let code = typeof err === 'object' && err !== null && err.code ? String(err.code) : '';
  
  if (!code && rawMsg) {
    const match = rawMsg.match(/auth\/([a-z0-9-]+)/i);
    if (match) code = `auth/${match[1].toLowerCase()}`;
  }
  
  console.warn('[AuthContext] Auth error code:', code, 'rawMsg:', rawMsg);
  
  switch (code) {
    case 'auth/email-already-in-use':
      return language === 'he'
        ? 'כתובת אימייל זו כבר רשומה במערכת. נא להתחבר או להשתמש בכתובת אחרת.'
        : 'This email address is already in use by another account.';
    case 'auth/wrong-password':
      return language === 'he'
        ? 'הסיסמה שהוזנה שגויה. נא לבדוק את הסיסמה ולנסות שוב.'
        : 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-not-found':
      return language === 'he'
        ? 'לא נמצא חשבון עם כתובת אימייל זו. נא לבדוק את הכתובת או להירשם.'
        : 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return language === 'he'
        ? 'אימייל או סיסמה שגויים. נא לבדוק את הפרטים ולנסות שוב.'
        : 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-email':
      return language === 'he'
        ? 'כתובת האימייל אינה תקינה. נא להזין כתובת תקינה (למשל: name@domain.com).'
        : 'The email address is invalid. Please check the formatting.';
    case 'auth/weak-password':
      return language === 'he'
        ? 'הסיסמה חלשה מדי. נא לבחור סיסמה עם 8 תווים לפחות הכוללת אותיות, מספרים ותו מיוחד.'
        : 'The password is too weak. Please use at least 8 characters.';
    case 'auth/popup-blocked':
      return language === 'he'
        ? 'חלון ההתחברות של Google נחסם על ידי הדפדפן. נא לאפשר חלונות קופצים בדפדפן.'
        : 'Sign-in popup was blocked by your browser. Please allow popups or use email.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return language === 'he'
        ? 'חלון ההתחברות נסגר לפני סיום תהליך האימות.'
        : 'Sign-in window was closed before completing authentication.';
    case 'auth/unauthorized-domain':
      return language === 'he'
        ? 'הדומיין הנוכחי אינו מורשה לאימות Google. נא להשתמש בכתובת הרשמית: https://deliveree-app-2a938.web.app'
        : 'This domain is not authorized for Google OAuth. Please use https://deliveree-app-2a938.web.app';
    case 'auth/network-request-failed':
      return language === 'he'
        ? 'שגיאת חיבור לרשת. נא לבדוק את החיבור לאינטרנט.'
        : 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return language === 'he'
        ? 'בוצעו יותר מדי ניסיונות שגויים ברצף. החשבון ננעל זמנית להגנה. נא לנסות שוב בעוד מספר דקות או לאפס סיסמה.'
        : 'Too many unsuccessful attempts. Access temporarily disabled. Try again later.';
    case 'auth/requires-recent-login':
      return language === 'he'
        ? 'פעולה זו (מחיקת חשבון) דורשת אימות עדכני. נא להתנתק, להתחבר מחדש ולנסות שוב.'
        : 'This action requires recent authentication. Please log out and sign in again before retrying.';
    case 'auth/operation-not-allowed':
      return language === 'he'
        ? 'שיטת התחברות זו עדיין אינה מופעלת במסוף Firebase. יש להפעיל אותה ב-Authentication -> Sign-in method.'
        : 'This sign-in method is currently disabled in Firebase Console. Please enable it under Authentication -> Sign-in method.';
    case 'auth/operation-not-supported-in-this-environment':
      return language === 'he'
        ? 'שיטת התחברות זו אינה נתמכת בסביבת דפדפן זו. נא לנסות בדפדפן אחר או באמצעות אימייל.'
        : 'This sign-in method is not supported in this browser environment. Please use another browser or email.';
    case 'auth/account-exists-with-different-credential':
      return language === 'he'
        ? 'קיים כבר חשבון עם כתובת אימייל זו בשיטת התחברות אחרת. נא להתחבר בשיטה המקורית.'
        : 'An account already exists with the same email address using a different sign-in method.';
    case 'auth/user-disabled':
      return language === 'he'
        ? 'חשבון זה הושבת. נא לפנות לתמיכה.'
        : 'This user account has been disabled. Please contact support.';
    case 'auth/admin-restricted-operation':
    case 'auth/configuration-not-found':
      return language === 'he'
        ? 'ספק Google אינו מופעל עדיין במסוף Firebase. נא להתחבר עם אימייל וסיסמה או להפעיל את Google ב-Firebase Console.'
        : 'Google Sign-In is not enabled in Firebase Console. Please use Email/Password or enable Google Provider.';
    case 'auth/credential-already-in-use':
      return language === 'he'
        ? 'פרטי האימות כבר משויכים לחשבון משתמש אחר.'
        : 'This credential is already linked to a different user account.';
    case 'auth/web-storage-unsupported':
      return language === 'he'
        ? 'אחסון הדפדפן מושבת או חסום (למשל במצב גלישה פרטית). נא לאפשר עוגיות ואחסון מקומי.'
        : 'Web storage or cookies are blocked/unsupported. Please enable cookies and local storage.';
    case 'auth/cookies-blocked':
      return language === 'he'
        ? 'העוגיות בדפדפן חסומות. נא לאפשר עוגיות צד שלישי עבור אימות Google.'
        : 'Browser cookies are blocked. Please enable cookies for Google Sign-In.';
    case 'auth/timeout':
      return language === 'he'
        ? 'פג הזמן המוקצב לתהליך האימות. נא לנסות שוב.'
        : 'Authentication request timed out. Please try again.';
    case 'auth/invalid-api-key':
      return language === 'he'
        ? 'מפתח API לא תקין. נא לבדוק את הגדרות המערכת.'
        : 'Invalid API key configuration.';
    case 'auth/app-deleted':
      return language === 'he'
        ? 'מופע האימות אותחל מחדש. נא לרענן את הדף.'
        : 'Authentication instance was reinitialized. Please refresh.';
    case 'auth/internal-error':
      return language === 'he'
        ? 'אירעה שגיאה פנימית בשירות האימות. נא לנסות שוב.'
        : 'An internal authentication error occurred. Please try again.';
    case 'auth/invalid-auth-event':
      return language === 'he'
        ? 'אירוע אימות לא תקין. נא לנסות שוב.'
        : 'Invalid authentication event. Please try again.';
    case 'auth/user-token-expired':
    case 'auth/id-token-expired':
    case 'auth/id-token-revoked':
      return language === 'he'
        ? 'פג תוקף חיבור המשתמש. נא להתחבר מחדש.'
        : 'User session expired. Please sign in again.';
    case 'auth/quota-exceeded':
      return language === 'he'
        ? 'חרגת ממכסת הבקשות של השירות. נא לנסות שוב בעוד מספר דקות.'
        : 'Service quota exceeded. Please try again in a few minutes.';
    default: {
      if (/network-request-failed/i.test(rawMsg)) {
        return language === 'he'
          ? 'שגיאת חיבור לרשת. נא לבדוק את החיבור לאינטרנט.'
          : 'Network connection failed. Please check your internet connection.';
      }
      if (/email-already-in-use/i.test(rawMsg)) {
        return language === 'he'
          ? 'כתובת אימייל זו כבר רשומה במערכת. נא להתחבר.'
          : 'This email address is already in use by another account.';
      }
      if (/wrong-password|invalid-credential|invalid-login-credentials/i.test(rawMsg)) {
        return language === 'he'
          ? 'אימייל או סיסמה שגויים. נא לבדוק את הפרטים ולנסות שוב.'
          : 'Invalid email or password. Please check your credentials and try again.';
      }
      if (/user-not-found/i.test(rawMsg)) {
        return language === 'he'
          ? 'לא נמצא חשבון עם כתובת זו.'
          : 'Invalid email or password. Please check your credentials and try again.';
      }
      if (/web-storage-unsupported|cookies-blocked/i.test(rawMsg)) {
        return language === 'he'
          ? 'אחסון הדפדפן או העוגיות חסומים בדפדפן זה.'
          : 'Web storage or cookies are blocked in this browser.';
      }
      if (code) {
        return language === 'he'
          ? `שגיאת אימות (${code}). נא לנסות שוב או להשתמש באימייל וסיסמה.`
          : `Authentication error (${code}). Please try again or use email/password.`;
      }
      return language === 'he' ? 'ההתחברות נכשלה. נא לנסות שוב או להשתמש באימייל וסיסמה.' : 'Authentication failed. Please try again.';
    }
  }
}

/**
 * Validates, sanitizes, and normalizes a user profile object.
 */
export function validateUserProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const safeObj = Object.create(null);
  for (const key of Object.keys(raw)) {
    if (!DANGEROUS_KEYS.has(key)) {
      safeObj[key] = raw[key];
    }
  }

  const id = sanitizeString(safeObj.id, 100) || `usr-${Date.now()}`;
  const name = sanitizeString(safeObj.name, 100) || 'User';
  const email = sanitizeString(safeObj.email, 150) || 'user@example.com';

  let avatar = null;
  if (typeof safeObj.avatar === 'string') {
    const cleanAvatar = sanitizeString(safeObj.avatar, 1000);
    if (/^https?:\/\//i.test(cleanAvatar)) {
      avatar = cleanAvatar;
    }
  }

  const cleanPrefix = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const ingestionEmail = sanitizeString(safeObj.ingestionEmail, 150) || `${cleanPrefix}.pkg@in.deliveree.app`;
  const plan = sanitizeString(safeObj.plan, 50) || 'Personal Account';

  const devicesCount =
    typeof safeObj.devicesCount === 'number' &&
    Number.isFinite(safeObj.devicesCount) &&
    safeObj.devicesCount >= 0
      ? Math.floor(safeObj.devicesCount)
      : 1;

  const createdAt = sanitizeString(safeObj.createdAt, 50) || new Date().toISOString().slice(0, 10);

  const preferences = safeObj.preferences && typeof safeObj.preferences === 'object' && !Array.isArray(safeObj.preferences)
    ? {
        defaultCarrier: sanitizeString(safeObj.preferences.defaultCarrier, 50) || 'all',
        language: sanitizeString(safeObj.preferences.language, 10) || 'he',
        theme: sanitizeString(safeObj.preferences.theme, 10) || 'dark',
        dateFormat: sanitizeString(safeObj.preferences.dateFormat, 20) || 'DD/MM/YYYY'
      }
    : {
        defaultCarrier: 'all',
        language: 'he',
        theme: 'dark',
        dateFormat: 'DD/MM/YYYY'
      };

  return {
    id,
    name,
    email,
    avatar,
    ingestionEmail,
    plan,
    devicesCount,
    createdAt,
    emailVerified: Boolean(safeObj.emailVerified),
    preferences
  };
}

/**
 * Helper to retrieve existing cached user profile matching UID to preserve preferences & custom fields.
 */
export function getCachedUserForUid(uid) {
  if (!uid) return null;
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_AUTH_KEY) : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.id === uid || parsed.uid === uid)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse/storage error
  }
  return null;
}

/**
 * Builds and validates a clean Deliveree user profile from Firebase User credentials
 * while merging and preserving custom preferences and metadata.
 */
export function buildCleanUserProfile(firebaseUser, customName = null) {
  if (!firebaseUser) return null;
  const cached = getCachedUserForUid(firebaseUser.uid);
  const resolvedName =
    (customName && customName.trim()) ||
    (cached?.name && cached.name.trim() && cached.name !== 'User' ? cached.name : null) ||
    (firebaseUser.displayName && firebaseUser.displayName.trim()) ||
    firebaseUser.email?.split('@')[0] ||
    cached?.name ||
    'User';

  const cleanPrefix =
    resolvedName.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    firebaseUser.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'user';

  return validateUserProfile({
    id: firebaseUser.uid,
    name: resolvedName,
    email: firebaseUser.email || cached?.email || '',
    emailVerified: Boolean(firebaseUser.emailVerified ?? cached?.emailVerified),
    avatar: firebaseUser.photoURL || cached?.avatar || null,
    ingestionEmail: cached?.ingestionEmail || `${cleanPrefix}.pkg@in.deliveree.app`,
    plan: cached?.plan || 'Personal Account',
    devicesCount: cached?.devicesCount || 1,
    createdAt: firebaseUser.metadata?.creationTime || cached?.createdAt || new Date().toISOString(),
    preferences: cached?.preferences
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateUserProfile(parsed);
        if (validated) return validated;
      }
    } catch {
      // Ignore JSON parse error
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const syncTimerRef = useRef(null);
  const isExplicitLogoutRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  // Cross-tab synchronization for auth session and profile preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAuthStorageChange = (e) => {
      if (!isMountedRef.current) return;
      if (e.key === STORAGE_AUTH_KEY) {
        if (!e.newValue) {
          // User session cleared or logged out in another tab
          setUser(null);
          cloudAdapter.setUserId(null);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            const validated = validateUserProfile(parsed);
            if (validated) {
              setUser(validated);
              cloudAdapter.setUserId(validated.id);
            }
          } catch (err) {
            console.warn('[AuthContext] Cross-tab auth storage parse error:', err);
          }
        }
      }
    };

    window.addEventListener('storage', handleAuthStorageChange);
    return () => window.removeEventListener('storage', handleAuthStorageChange);
  }, []);

  useEffect(() => {
    try {
      if (user?.id) {
        cloudAdapter.setUserId(user.id);
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(user));
      } else {
        cloudAdapter.setUserId(null);
        localStorage.removeItem(STORAGE_AUTH_KEY);
      }
    } catch (storageErr) {
      console.warn('[AuthContext] LocalStorage error:', storageErr);
    }
  }, [user]);

  const syncProfileToFirestore = async (firebaseUser, customName = null) => {
    if (!db || !firebaseUser) return null;
    const cleanUser = buildCleanUserProfile(firebaseUser, customName);
    if (!cleanUser) return null;
    
    const profileData = {
      ...cleanUser,
      updatedAt: new Date().toISOString()
    };

    // Non-blocking firestore sync with timeout to guarantee ultra-fast registration
    withTimeout(setDoc(doc(db, 'users', firebaseUser.uid), profileData, { merge: true }), 1500);
    return profileData;
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    // Check if user returned from mobile or desktop redirect flow
    getRedirectResult(auth)
      .then((res) => {
        if (!isMountedRef.current) return;
        if (res?.user) {
          isExplicitLogoutRef.current = false;
          const cleanUser = buildCleanUserProfile(res.user);
          setUser(cleanUser);
          syncProfileToFirestore(res.user);
          migrateGuestDataToUser(res.user.uid);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        console.warn('[AuthContext] getRedirectResult warning:', err?.message);
        const isCancelled =
          err?.code === 'auth/redirect-cancelled-by-user' ||
          err?.code === 'auth/popup-closed-by-user' ||
          err?.code === 'auth/cancelled-popup-request' ||
          /redirect-cancelled|popup-closed/i.test(err?.message || '');
        if (!isCancelled) {
          setAuthError(sanitizeAuthError(err));
        }
        setLoading(false);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMountedRef.current) return;
      if (firebaseUser) {
        isExplicitLogoutRef.current = false;
        const cleanUser = buildCleanUserProfile(firebaseUser);
        migrateGuestDataToUser(firebaseUser.uid);
        setUser(cleanUser);
      } else {
        if (isExplicitLogoutRef.current) {
          setUser(null);
          cloudAdapter.setUserId(null);
          try {
            localStorage.removeItem(STORAGE_AUTH_KEY);
          } catch {
            // Ignore
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerCloudSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    if (isMountedRef.current) {
      setSyncStatus('syncing');
    }
    syncTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }
      syncTimerRef.current = null;
    }, 600);
  }, []);

  const executeOAuthSignIn = useCallback(async (provider) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured.');
    }
    try {
      const result = await signInWithPopup(auth, provider);
      if (!isMountedRef.current) return null;
      if (result?.user && !isExplicitLogoutRef.current) {
        const cleanUser = buildCleanUserProfile(result.user);
        setUser(cleanUser);
        syncProfileToFirestore(result.user);
        migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
      return result?.user || null;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const shouldFallbackToRedirect =
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/operation-not-supported-in-this-environment' ||
        err?.code === 'auth/internal-error' ||
        err?.code === 'auth/web-storage-unsupported' ||
        /popup-blocked|operation-not-supported|storage-unsupported/i.test(err?.message || '');

      if (shouldFallbackToRedirect) {
        try {
          console.info('[AuthContext] Popup unavailable or blocked, falling back to redirect flow...');
          await signInWithRedirect(auth, provider);
          return null;
        } catch (redirectErr) {
          if (!isMountedRef.current) return null;
          const cleanErr = sanitizeAuthError(redirectErr);
          setAuthError(cleanErr);
          throw new Error(cleanErr);
        }
      } else if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        /popup-closed|cancelled-popup/i.test(err?.message || '')
      ) {
        return null;
      } else {
        const cleanErr = sanitizeAuthError(err);
        setAuthError(cleanErr);
        throw new Error(cleanErr);
      }
    }
  }, [triggerCloudSync]);

  const loginWithGoogle = useCallback(async () => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    return executeOAuthSignIn(googleProvider);
  }, [executeOAuthSignIn]);

  const loginWithApple = useCallback(async () => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    return executeOAuthSignIn(appleProvider);
  }, [executeOAuthSignIn]);

  const loginWithFacebook = useCallback(async () => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    return executeOAuthSignIn(facebookProvider);
  }, [executeOAuthSignIn]);

  const loginWithEmail = useCallback(async (email, password) => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured.');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!isMountedRef.current) return null;
      if (result?.user && !isExplicitLogoutRef.current) {
        const cleanUser = buildCleanUserProfile(result.user);
        setUser(cleanUser);
        syncProfileToFirestore(result.user);
        migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
      return result.user;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const cleanErr = sanitizeAuthError(err, 'he');
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, [triggerCloudSync]);

  const registerWithEmail = useCallback(async (email, password, name = '') => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured.');
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (!isMountedRef.current) return null;
      if (result?.user && !isExplicitLogoutRef.current) {
        if (name.trim()) {
          updateProfile(result.user, { displayName: name.trim() }).catch(() => {});
        }
        const cleanUser = buildCleanUserProfile(result.user, name.trim());
        setUser(cleanUser);
        syncProfileToFirestore(result.user, name.trim());
        migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
      return result.user;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const cleanErr = sanitizeAuthError(err, 'he');
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, [triggerCloudSync]);

  const resetPassword = useCallback(async (email) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured.');
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      if (!isMountedRef.current) return false;
      const cleanErr = sanitizeAuthError(err, 'he');
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth || !auth.currentUser) {
      throw new Error('No authenticated user found to send verification email.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err) {
      const cleanErr = sanitizeAuthError(err, 'he');
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, []);

  const updateUserPreferences = useCallback(async (newPrefs) => {
    if (!user || !isMountedRef.current) return;
    const sanitizedPrefs = {
      defaultCarrier: sanitizeString(newPrefs?.defaultCarrier, 50) || user.preferences?.defaultCarrier || 'all',
      language: sanitizeString(newPrefs?.language, 10) || user.preferences?.language || 'he',
      theme: sanitizeString(newPrefs?.theme, 10) || user.preferences?.theme || 'dark',
      dateFormat: sanitizeString(newPrefs?.dateFormat, 20) || user.preferences?.dateFormat || 'DD/MM/YYYY'
    };

    const updatedUser = {
      ...user,
      preferences: sanitizedPrefs
    };
    setUser(updatedUser);

    if (db && user.id) {
      withTimeout(setDoc(doc(db, 'users', user.id), { preferences: sanitizedPrefs, updatedAt: new Date().toISOString() }, { merge: true }), 1500);
    }
    triggerCloudSync();
  }, [user, triggerCloudSync]);

  const deleteUserAccountAndData = useCallback(async (userId) => {
    const targetId = userId || user?.id;
    if (!targetId) return;
    isExplicitLogoutRef.current = true;

    // 1. Delete local caches immediately
    try {
      localStorage.removeItem(`deliveree_packages_${targetId}`);
      localStorage.removeItem('deliveree_packages_guest');
      localStorage.removeItem(STORAGE_AUTH_KEY);
      localStorage.removeItem('deliveree_tester_feedback');
      localStorage.removeItem('deliveree_pwa_banner_dismissed');
    } catch {
      // Ignore
    }

    // 2. Non-blocking Firestore purge with timeout
    if (db) {
      withTimeout((async () => {
        const userPackagesRef = collection(db, 'users', targetId, 'packages');
        const snapshot = await getDocs(userPackagesRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        await deleteDoc(doc(db, 'users', targetId));
      })(), 2000);
    }

    // 3. Delete Firebase Auth user
    if (auth && auth.currentUser) {
      try {
        await deleteUser(auth.currentUser);
      } catch (err) {
        console.warn('[AuthContext] Error deleting auth user, signing out:', err);
        try {
          await firebaseSignOut(auth);
        } catch {
          // Ignore
        }
      }
    }

    // 4. Immediately clear client session
    cloudAdapter.setUserId(null);
    if (isMountedRef.current) {
      setUser(null);
    }
  }, [user]);

  const logout = useCallback(async () => {
    isExplicitLogoutRef.current = true;
    cloudAdapter.setUserId(null);
    if (isMountedRef.current) {
      setUser(null);
    }
    try {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    } catch {
      // Ignore
    }
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
  }, []);

  const isGuestMode = !user;

  const contextValue = useMemo(() => ({
    user,
    isGuestMode,
    loading,
    authError,
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    sendVerificationEmail,
    migrateGuestDataToUser,
    updateUserPreferences,
    deleteUserAccountAndData,
    logout,
    syncStatus,
    lastSyncTime,
    triggerCloudSync
  }), [
    user,
    isGuestMode,
    loading,
    authError,
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    sendVerificationEmail,
    updateUserPreferences,
    deleteUserAccountAndData,
    logout,
    syncStatus,
    lastSyncTime,
    triggerCloudSync
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
