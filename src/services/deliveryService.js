import { validatePackageList } from '../utils/packageValidator';

function getStorageKey(userId) {
  if (userId) {
    return `deliveree_packages_${userId}`;
  }
  return 'deliveree_packages_guest';
}

export const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_IMPORT_PACKAGES = 1000;

export const deliveryService = {
  /**
   * Helper to derive the storage key for a user or guest
   */
  getStorageKey,

  /**
   * Loads packages from localStorage scoped by userId or guest
   */
  getPackages: (userId = null) => {
    try {
      const key = getStorageKey(userId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return validatePackageList(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load packages from localStorage', e);
    }
    return [];
  },

  /**
   * Saves validated package list to localStorage scoped by userId or guest
   */
  savePackages: (packages, userId = null) => {
    const validated = validatePackageList(packages);
    try {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(validated));
    } catch (e) {
      console.error('Failed to save packages to localStorage', e);
    }
    return validated;
  },

  /**
   * Resets data to empty state scoped by userId or guest
   */
  resetToDemo: (userId = null) => {
    try {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify([]));
    } catch {
      // Storage unavailable or quota exceeded
    }
    return [];
  },

  /**
   * Clears specific user packages and returns empty array
   */
  clearUserPackages: (userId = null) => {
    try {
      const key = getStorageKey(userId);
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear user packages from localStorage', e);
    }
    return [];
  },

  /**
   * Exports data as JSON string for download using memory-efficient Blob URL
   */
  exportData: (packages) => {
    const safePackages = validatePackageList(packages);
    const blob = new Blob([JSON.stringify(safePackages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `deliveree_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Imports data from JSON file with strict size limits, count caps, and validation
   */
  importData: (jsonString) => {
    if (typeof jsonString !== 'string') {
      return { success: false, error: 'Invalid input (must be a JSON string)' };
    }

    const payloadSize = typeof Blob !== 'undefined'
      ? new Blob([jsonString]).size
      : jsonString.length;

    if (payloadSize > MAX_IMPORT_SIZE_BYTES) {
      return { success: false, error: 'Import payload exceeds 2MB maximum size limit' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const limited = parsed.slice(0, MAX_IMPORT_PACKAGES);
        const validated = validatePackageList(limited);
        if (validated.length === 0 && limited.length > 0) {
          return { success: false, error: 'Imported items failed schema validation' };
        }
        deliveryService.savePackages(validated);
        return { success: true, packages: validated };
      }
      return { success: false, error: 'Invalid JSON structure (must be an array of packages)' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
