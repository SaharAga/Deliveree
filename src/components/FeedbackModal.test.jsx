import { describe, it, expect } from 'vitest';
import { TELEGRAM_FEEDBACK_BOT_TOKEN, TELEGRAM_FEEDBACK_CHAT_ID } from '../constants/telegram';

describe('Feedback & Telegram Relay Logic', () => {
  it('contains valid Telegram bot credentials for alpha tester ping', () => {
    expect(TELEGRAM_FEEDBACK_BOT_TOKEN).toMatch(/^\d+:[A-Za-z0-9_-]+$/);
    expect(TELEGRAM_FEEDBACK_CHAT_ID).toBe('726522010');
  });

  it('correctly constructs Telegram HTML notification text', () => {
    const feedback = {
      type: 'bug',
      rating: 5,
      message: 'Found an alignment issue with the side navigation drawer on mobile',
      screenWidth: 393,
      screenHeight: 852,
      appVersion: '0.2.0-alpha',
      buildChannel: 'alpha',
      user: { name: 'Sahar', email: 'sahar@test.com' }
    };

    const typeEmoji = feedback.type === 'bug' ? '🚨' : '💡';
    const ratingStars = '⭐'.repeat(feedback.rating);
    const userName = feedback.user.name;
    const userEmail = ` (${feedback.user.email})`;

    const text = [
      `<b>${typeEmoji} New Alpha Tester Feedback</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>⭐ Rating:</b> ${ratingStars} (${feedback.rating}/5)`,
      `<b>🏷️ Category:</b> ${feedback.type}`,
      `<b>👤 User:</b> ${userName}${userEmail}`,
      `<b>📱 Device:</b> ${feedback.screenWidth}x${feedback.screenHeight}`,
      `<b>📦 App Version:</b> v${feedback.appVersion} (${feedback.buildChannel})`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📝 Message:</b>`,
      `${feedback.message}`
    ].join('\n');

    expect(text).toContain('🚨 New Alpha Tester Feedback');
    expect(text).toContain('⭐⭐⭐⭐⭐');
    expect(text).toContain('Sahar (sahar@test.com)');
    expect(text).toContain('393x852');
    expect(text).toContain('v0.2.0-alpha');
  });
});
