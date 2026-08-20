import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, db } from '../services/firebase';
import { cloudAdapter } from '../services/cloudStorageAdapter';
import { deliveryService } from '../services/deliveryService';
import { sanitizeString } from '../utils/packageValidator';

const AuthContext = createContext();

const STORAGE_AUTH_KEY = 'deliveree_auth_user_v1';
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Migrates isolated guest packages (deliveree_packages_guest) to an authenticated user's
 * permanent storage partition (deliveree_packages_${targetUserId}) and cloud Firestore.
 * Performs union by trackingNumber and id to guarantee zero duplicate creation.
 *
 * @param {string} targetUserId - Target authenticated user ID
 * @returns {Promise<Array<object>>} Merged package list
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

    if (cloudAdapter.isFirestoreActive?.()) {
      await cloudAdapter.savePackages(merged);
    }

    localStorage.removeItem('deliveree_packages_guest');
    return merged;
  } catch (err) {
    console.warn('[AuthContext] Guest data migration error:', err);
    return [];
  }
}

/**
 * Sanitizes authentication errors to prevent raw error code / stack leakage (CWE-209).
 */
export function sanitizeAuthError(err) {
  if (!err) return 'An unexpected authentication error occurred. Please try again.';
  
  const code = typeof err === 'object' && err !== null && err.code ? String(err.code) : '';
  
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already in use by another account.';
    case 'auth/invalid-email':
      return 'The email address is invalid. Please check the formatting.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups or use email.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access temporarily disabled. Try again later.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled.';
    default: {
      const rawMessage = typeof err === 'object' && err !== null && err.message ? String(err.message) : String(err);
      if (/network-request-failed/i.test(rawMessage)) {
        return 'Network connection failed. Please check your internet connection.';
      }
      if (/user-not-found|wrong-password|invalid-credential/i.test(rawMessage)) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      if (/too-many-requests/i.test(rawMessage)) {
        return 'Too many unsuccessful attempts. Access temporarily disabled. Try again later.';
      }
      const clean = sanitizeString(rawMessage, 200)
        .replace(/auth\/[a-z0-9-]+/gi, '')
        .replace(/Firebase:\s*/gi, '')
        .replace(/\(Error\s*[^)]*\)/gi, '')
        .replace(/\bat\s+(?:line\s+)?\d+.*$/gim, '')
        .replace(/\bat\s+[^()\n]+\([^)]+\)/gi, '')
        .replace(/\bline\s+\d+(?::\d+)?/gi, '')
        .trim();
      return clean || 'Authentication failed. Please try again.';
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
    const cleanAvatar = sanitizeString(safeObj.avatar, 500);
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
    preferences
  };
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

  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const syncTimerRef = useRef(null);
  const isExplicitLogoutRef = useRef(false);

  // Sync state with cloudAdapter and localStorage with quota error resilience
  useEffect(() => {
    try {
      if (user?.id) {
        cloudAdapter.setUserId(user.id);
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(user));
      } else {
        cloudAdapter.setUserId(null);
        if (isExplicitLogoutRef.current) {
          localStorage.removeItem(STORAGE_AUTH_KEY);
        }
      }
    } catch (storageErr) {
      console.warn('[AuthContext] LocalStorage setItem error:', storageErr);
    }
  }, [user]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cleanUser = validateUserProfile({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || null,
          ingestionEmail: `${(firebaseUser.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}.pkg@in.deliveree.app`,
          plan: 'Cloud Synced Account',
          devicesCount: 1,
          createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString()
        });
        await migrateGuestDataToUser(firebaseUser.uid);
        setUser(cleanUser);
      } else {
        // Only wipe user if an explicit logout action was initiated.
        // On cold start or offline boot, retain cached user from localStorage.
        if (isExplicitLogoutRef.current) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cleanup cloud sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const triggerCloudSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    setSyncStatus('syncing');
    syncTimerRef.current = setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      syncTimerRef.current = null;
    }, 600);
  }, []);

  const loginWithGoogle = useCallback(async (customProfile = null) => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      // Dynamic local user generation for demo / offline mode
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const email = customProfile?.email || `user_${randomSuffix}@deliveree.app`;
      const emailPrefix = (email || '').split('@')[0] || `user_${randomSuffix}`;
      const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') || `user${randomSuffix}`;
      const cleanName = customProfile?.name?.trim() || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      const avatar = customProfile?.avatar || null;

      const newUser = validateUserProfile({
        id: `usr-google-${Date.now()}-${randomSuffix}`,
        name: cleanName,
        email: email,
        avatar: avatar,
        ingestionEmail: `${cleanPrefix.toLowerCase()}.pkg@in.deliveree.app`,
        plan: 'Local Profile',
        devicesCount: 1,
        createdAt: new Date().toISOString()
      });
      await migrateGuestDataToUser(newUser.id);
      setUser(newUser);
      triggerCloudSync();
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user?.uid) {
        await migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          const cleanErr = sanitizeAuthError(redirectErr);
          setAuthError(cleanErr);
          throw new Error(cleanErr);
        }
      } else {
        const cleanErr = sanitizeAuthError(err);
        setAuthError(cleanErr);
        throw new Error(cleanErr);
      }
    }
  }, [triggerCloudSync]);

  const loginWithEmail = useCallback(async (email, password = '', name = '') => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      const emailPrefix = (email || '').split('@')[0] || 'user';
      const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') || 'user';
      const cleanName = name.trim() || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newUser = validateUserProfile({
        id: `usr-email-${Date.now()}-${randomSuffix}`,
        name: cleanName,
        email: email,
        avatar: null,
        ingestionEmail: `${cleanPrefix.toLowerCase()}.del${randomSuffix}@in.deliveree.app`,
        plan: 'Local Profile',
        devicesCount: 1,
        createdAt: new Date().toISOString()
      });
      await migrateGuestDataToUser(newUser.id);
      setUser(newUser);
      triggerCloudSync();
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result?.user?.uid) {
        await migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
    } catch (err) {
      const cleanErr = sanitizeAuthError(err);
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, [triggerCloudSync]);

  const registerWithEmail = useCallback(async (email, password, name = '') => {
    isExplicitLogoutRef.current = false;
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      const emailPrefix = (email || '').split('@')[0] || 'user';
      const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') || 'user';
      const cleanName = name.trim() || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newUser = validateUserProfile({
        id: `usr-email-${Date.now()}-${randomSuffix}`,
        name: cleanName,
        email: email,
        avatar: null,
        ingestionEmail: `${cleanPrefix.toLowerCase()}.del${randomSuffix}@in.deliveree.app`,
        plan: 'Local Profile',
        devicesCount: 1,
        createdAt: new Date().toISOString()
      });
      await migrateGuestDataToUser(newUser.id);
      setUser(newUser);
      triggerCloudSync();
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result?.user?.uid) {
        await migrateGuestDataToUser(result.user.uid);
      }
      triggerCloudSync();
    } catch (err) {
      const cleanErr = sanitizeAuthError(err);
      setAuthError(cleanErr);
      throw new Error(cleanErr);
    }
  }, [triggerCloudSync]);

  const updateUserPreferences = useCallback((newPrefs) => {
    if (!user) return;
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
    triggerCloudSync();
  }, [user, triggerCloudSync]);

  const deleteUserAccountAndData = useCallback(async (userId) => {
    const targetId = userId || user?.id;
    if (!targetId) return;
    isExplicitLogoutRef.current = true;

    // 1. Wipe cloud Firestore data if configured
    if (isFirebaseConfigured && db) {
      try {
        const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
        const userPackagesRef = collection(db, 'users', targetId, 'packages');
        const snapshot = await getDocs(userPackagesRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        // Delete user root doc
        await deleteDoc(doc(db, 'users', targetId));
      } catch (err) {
        console.warn('[AuthContext] Error deleting cloud data:', err);
      }
    }

    // 2. Clear local storage delivery packages & custom data
    try {
      localStorage.removeItem(`deliveree_packages_${targetId}`);
      localStorage.removeItem('deliveree_packages_guest');
      localStorage.removeItem(STORAGE_AUTH_KEY);
      localStorage.removeItem('deliveree_tester_feedback');
      localStorage.removeItem('deliveree_pwa_banner_dismissed');
    } catch {
      // Ignore localStorage errors
    }

    // 3. Delete Firebase Auth user if active
    if (isFirebaseConfigured && auth && auth.currentUser) {
      try {
        const { deleteUser } = await import('firebase/auth');
        await deleteUser(auth.currentUser);
      } catch (err) {
        console.warn('[AuthContext] Error deleting auth user:', err);
        try {
          await firebaseSignOut(auth);
        } catch {
          // Ignore
        }
      }
    }

    // 4. Reset state
    cloudAdapter.setUserId(null);
    setUser(null);
  }, [user]);

  const logout = useCallback(async () => {
    isExplicitLogoutRef.current = true;
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    try {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    } catch {
      // Ignore
    }
    cloudAdapter.setUserId(null);
    setUser(null);
  }, []);

  const isGuestMode = !user;

  const contextValue = useMemo(() => ({
    user,
    isGuestMode,
    loading,
    authError,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
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
    loginWithEmail,
    registerWithEmail,
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
