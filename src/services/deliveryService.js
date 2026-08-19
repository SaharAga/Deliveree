import { validatePackageList } from '../utils/packageValidator';

function getStorageKey(userId) {
  if (userId) {
    return `deliveree_packages_${userId}`;
  }
  return 'deliveree_packages_guest';
}

/**
 * State machine transition matrix governing allowed package status transitions.
 */
export const TRANSITION_MATRIX = Object.freeze({
  ordered: ['ordered', 'shipped', 'in_transit', 'exception', 'archived'],
  shipped: ['shipped', 'in_transit', 'customs', 'out_for_delivery', 'exception', 'archived'],
  in_transit: ['in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception', 'archived'],
  customs: ['customs', 'in_transit', 'out_for_delivery', 'exception', 'archived'],
  out_for_delivery: ['out_for_delivery', 'delivered', 'exception', 'archived'],
  delivered: ['delivered', 'archived'],
  exception: ['exception', 'in_transit', 'out_for_delivery', 'delivered', 'archived'],
  archived: ['archived', 'ordered', 'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception']
});

/**
 * Checks whether transitioning from `fromStatus` to `toStatus` is permitted by the state machine.
 *
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired new status
 * @returns {boolean} True if transition is valid
 */
export function canTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = TRANSITION_MATRIX[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

export const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_IMPORT_PACKAGES = 1000;

export const deliveryService = {
  /**
   * State machine transition helper
   */
  canTransition,
  TRANSITION_MATRIX,
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
