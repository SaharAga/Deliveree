/**
 * Telegram Alpha Feedback Relay Configuration
 * Bot tokens must NOT be hardcoded in client bundles.
 * Client sends feedback payloads directly to Firestore (/feedback),
 * where server-side daemons (e.g. scripts/telegram_daemon.py) perform authenticated relay.
 */
export const TELEGRAM_FEEDBACK_BOT_TOKEN = (typeof process !== 'undefined' && process.env?.TELEGRAM_FEEDBACK_BOT_TOKEN)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_FEEDBACK_BOT_TOKEN)
  || '';

export const TELEGRAM_FEEDBACK_CHAT_ID = (typeof process !== 'undefined' && process.env?.TELEGRAM_FEEDBACK_CHAT_ID)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_FEEDBACK_CHAT_ID)
  || '726522010';


/**
 * Dispatches an HTML formatted feedback payload directly to Telegram Bot API if a token is configured.
 * Otherwise gracefully returns false without error, delegating relay to server/daemon.
 * @param {Object} feedback
 * @returns {Promise<boolean>}
 */
export async function sendTelegramFeedbackRelay(feedback) {
  const botToken = TELEGRAM_FEEDBACK_BOT_TOKEN
    || (typeof process !== 'undefined' && process.env?.TELEGRAM_FEEDBACK_BOT_TOKEN)
    || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_FEEDBACK_BOT_TOKEN)
    || '';

  if (!botToken) {
    // Pure Firestore write-only / server-side daemon relay mode
    return false;
  }

  try {
    const typeEmoji = feedback.type === 'bug' ? '🚨' : feedback.type === 'feature' ? '💡' : '❤️';
    const ratingStars = '⭐'.repeat(Math.max(1, Math.min(5, Number(feedback.rating) || 5)));
    
    const userDisplay = 'Anonymous Tester';

    const text = [
      `<b>${typeEmoji} New Alpha Tester Feedback</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>⭐ Rating:</b> ${ratingStars} (${feedback.rating || 5}/5)`,
      `<b>🏷️ Category:</b> ${feedback.type || 'general'}`,
      `<b>👤 User:</b> ${userDisplay}`,
      `<b>📱 Device:</b> ${feedback.screenWidth}x${feedback.screenHeight}`,
      `<b>📦 App Version:</b> v${feedback.appVersion || '0.2.0-alpha'} (${feedback.buildChannel || 'alpha'})`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📝 Message:</b>`,
      `${(feedback.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_FEEDBACK_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });

    return response.ok;
  } catch (err) {
    console.warn('[TelegramRelay] Failed to send feedback to Telegram bot:', err);
    return false;
  }
}
