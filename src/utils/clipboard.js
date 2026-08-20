/**
 * Safely copies text to the system clipboard with robust fallback mechanisms.
 * Supports Modern Async Clipboard API and legacy execCommand fallback.
 * 
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Resolves to true if copy was successful, false otherwise
 */
export async function copyToClipboard(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 1. Try modern async navigator.clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] navigator.clipboard.writeText failed, falling back to legacy command:', err);
  }

  // 2. Legacy fallback using invisible textarea + document.execCommand('copy')
  try {
    if (typeof document !== 'undefined' && document.body) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return !!successful;
    }
  } catch (fallbackErr) {
    console.warn('[Clipboard] Fallback document.execCommand failed:', fallbackErr);
  }

  return false;
}
