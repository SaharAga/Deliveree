import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { deliveryService } from './deliveryService';
import { validatePackageListSafe, validatePackageSafe } from '../schemas/packageSchema';
import { validatePackageList, validatePackage } from '../utils/packageValidator';

/**
 * Validates a package using Zod schema with fallback to packageValidator.
 * 
 * @param {unknown} pkg
 * @returns {object|null}
 */
function strictlyValidatePackage(pkg) {
  const result = validatePackageSafe(pkg);
  if (result.success) {
    return result.data;
  }
  return validatePackage(pkg);
}

/**
 * Validates a package list using Zod schema with fallback to packageValidator.
 * 
 * @param {unknown} packages
 * @returns {Array<object>}
 */
function strictlyValidatePackageList(packages) {
  if (!Array.isArray(packages)) return [];
  const result = validatePackageListSafe(packages);
  if (result.success) {
    return result.data;
  }
  return validatePackageList(packages);
}

/**
 * Unified Cloud Storage Adapter
 * Provides real-time synchronization with Cloud Firestore under `users/{uid}/packages`
 * with automatic fallback to LocalStorage for offline and demo mode.
 */
export class CloudStorageAdapter {
  constructor(options = {}) {
    this.mode = options.mode || (isFirebaseConfigured ? 'firestore' : 'local');
    this.userId = options.userId || null;
    this.listeners = new Set();
    this.firestoreUnsubscribe = null;
  }

  setUserId(userId) {
    if (this.userId === userId) return;
    this.userId = userId;
    
    // Clean up existing listener if user changes
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    if (this.isFirestoreActive()) {
      this.initFirestoreListener();
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  isFirestoreActive() {
    return isFirebaseConfigured && this.mode === 'firestore' && Boolean(this.userId) && Boolean(db);
  }

  initFirestoreListener() {
    if (!this.isFirestoreActive()) return;

    // Teardown any existing listener before attaching a new one
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    try {
      const packagesRef = collection(db, 'users', this.userId, 'packages');
      const q = query(packagesRef, orderBy('updatedAt', 'desc'));

      this.firestoreUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remotePackages = [];
          snapshot.forEach((docSnap) => {
            remotePackages.push({ ...docSnap.data(), id: docSnap.id });
          });

          const validated = strictlyValidatePackageList(remotePackages);
          // Keep local storage mirror in sync
          deliveryService.savePackages(validated, this.userId);
          this.notifyListeners(validated);
        },
        (error) => {
          console.warn('[CloudStorageAdapter] Firestore onSnapshot warning:', error.message);
        }
      );
    } catch (err) {
      console.warn('[CloudStorageAdapter] Failed to initialize Firestore listener:', err);
    }
  }

  /**
   * Fetches packages with fallback to local cache
   */
  async getPackages() {
    if (!this.isFirestoreActive()) {
      return deliveryService.getPackages(this.userId);
    }

    try {
      const packagesRef = collection(db, 'users', this.userId, 'packages');
      const snapshot = await getDocs(packagesRef);
      if (snapshot.empty) {
        // Authenticated user with intentionally empty remote collection - do not resurrect local mock data
        deliveryService.savePackages([], this.userId);
        return [];
      }

      const remotePackages = [];
      snapshot.forEach((docSnap) => {
        remotePackages.push({ ...docSnap.data(), id: docSnap.id });
      });

      const validated = strictlyValidatePackageList(remotePackages);
      deliveryService.savePackages(validated, this.userId);
      return validated;
    } catch (err) {
      console.warn('[CloudStorageAdapter] Firestore getPackages error, falling back to local:', err);
      return deliveryService.getPackages(this.userId);
    }
  }

  /**
   * Saves/Syncs full package list
   */
  async savePackages(packages) {
    const validated = strictlyValidatePackageList(packages);
    deliveryService.savePackages(validated, this.userId);
    this.notifyListeners(validated);

    if (this.isFirestoreActive()) {
      try {
        // Batch sync up to 500 packages per batch atomically into subcollection
        const BATCH_LIMIT = 500;
        for (let i = 0; i < validated.length; i += BATCH_LIMIT) {
          const chunk = validated.slice(i, i + BATCH_LIMIT);
          const batch = writeBatch(db);
          for (const pkg of chunk) {
            const docRef = doc(db, 'users', this.userId, 'packages', pkg.id);
            batch.set(docRef, { ...pkg, userId: this.userId }, { merge: true });
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn('[CloudStorageAdapter] Firestore savePackages sync error:', err);
      }
    }

    return validated;
  }

  /**
   * Adds or updates a single package
   */
  async upsertPackage(pkg) {
    const validatedPkg = strictlyValidatePackage(pkg);
    if (!validatedPkg) return await this.getPackages();

    const existing = await this.getPackages();
    const index = existing.findIndex((p) => p.id === validatedPkg.id);

    let updated;
    if (index >= 0) {
      updated = [...existing];
      updated[index] = validatedPkg;
    } else {
      updated = [validatedPkg, ...existing];
    }

    deliveryService.savePackages(updated, this.userId);
    this.notifyListeners(updated);

    if (this.isFirestoreActive()) {
      try {
        const docRef = doc(db, 'users', this.userId, 'packages', validatedPkg.id);
        await setDoc(docRef, { ...validatedPkg, userId: this.userId }, { merge: true });
      } catch (err) {
        console.warn('[CloudStorageAdapter] Firestore upsert error:', err);
      }
    }

    return updated;
  }

  /**
   * Deletes a package by ID
   */
  async deletePackage(packageId) {
    const existing = await this.getPackages();
    const updated = existing.filter((p) => p.id !== packageId);

    deliveryService.savePackages(updated, this.userId);
    this.notifyListeners(updated);

    if (this.isFirestoreActive()) {
      try {
        const docRef = doc(db, 'users', this.userId, 'packages', packageId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('[CloudStorageAdapter] Firestore delete error:', err);
      }
    }

    return updated;
  }

  /**
   * Subscribes to real-time updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('[CloudStorageAdapter] Listener callback error:', e);
      }
    });
  }

  teardown() {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const cloudAdapter = new CloudStorageAdapter();
