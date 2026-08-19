/**
 * Gentle tactile vibration helper for mobile devices
 * Safe against environments where navigator.vibrate is unsupported
 * 
 * @param {number|number[]} pattern - Vibration duration in ms or pattern array
 */
export function triggerHapticFeedback(pattern = 15) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Gracefully ignore devices that block or lack vibration APIs
  }
}
