/**
 * Telegram Alpha Feedback Relay Configuration
 */
export const TELEGRAM_FEEDBACK_BOT_TOKEN = '8897407993:AAFUOHmfkDT31HXpZbPDv2ZD-HDybDXCIgo';
export const TELEGRAM_FEEDBACK_CHAT_ID = '726522010';

/**
 * Dispatches an HTML formatted feedback payload directly to Telegram Bot API.
 * @param {Object} feedback
 * @returns {Promise<boolean>}
 */
export async function sendTelegramFeedbackRelay(feedback) {
  try {
    const typeEmoji = feedback.type === 'bug' ? '🚨' : feedback.type === 'feature' ? '💡' : '❤️';
    const ratingStars = '⭐'.repeat(Math.max(1, Math.min(5, Number(feedback.rating) || 5)));
    const userName = typeof feedback.user === 'object' && feedback.user !== null ? (feedback.user.name || 'Anonymous') : (feedback.user || 'Anonymous Tester');
    const userEmail = typeof feedback.user === 'object' && feedback.user !== null && feedback.user.email ? ` (${feedback.user.email})` : '';

    const text = [
      `<b>${typeEmoji} New Alpha Tester Feedback</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>⭐ Rating:</b> ${ratingStars} (${feedback.rating || 5}/5)`,
      `<b>🏷️ Category:</b> ${feedback.type || 'general'}`,
      `<b>👤 User:</b> ${userName}${userEmail}`,
      `<b>📱 Device:</b> ${feedback.screenWidth}x${feedback.screenHeight}`,
      `<b>📦 App Version:</b> v${feedback.appVersion || '0.2.0-alpha'} (${feedback.buildChannel || 'alpha'})`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📝 Message:</b>`,
      `${(feedback.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_FEEDBACK_BOT_TOKEN}/sendMessage`, {
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
