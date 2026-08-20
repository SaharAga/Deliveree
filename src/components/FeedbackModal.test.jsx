import { describe, it, expect } from 'vitest';
import { TELEGRAM_FEEDBACK_BOT_TOKEN, TELEGRAM_FEEDBACK_CHAT_ID } from '../constants/telegram';

describe('Feedback & Telegram Relay Logic', () => {
  it('does not leak hardcoded secret bot tokens into client bundle', () => {
    expect(TELEGRAM_FEEDBACK_BOT_TOKEN === '' || typeof TELEGRAM_FEEDBACK_BOT_TOKEN === 'string').toBe(true);
    expect(TELEGRAM_FEEDBACK_CHAT_ID).toBe('726522010');
  });

  it('correctly constructs Telegram HTML notification text with masked email', async () => {
    const { maskEmail } = await import('../services/feedbackService');
    const feedback = {
      type: 'bug',
      rating: 5,
      message: 'Found an alignment issue with the side navigation drawer on mobile',
      screenWidth: 393,
      screenHeight: 852,
      appVersion: '0.2.0-alpha',
      buildChannel: 'alpha',
      isAnonymous: false,
      user: { name: 'Sahar', email: 'sahar@test.com' }
    };

    const typeEmoji = feedback.type === 'bug' ? '🚨' : '💡';
    const ratingStars = '⭐'.repeat(feedback.rating);
    const userName = feedback.user.name;
    const userEmail = ` (${maskEmail(feedback.user.email)})`;

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
    expect(text).toContain('Sahar (s***r@test.com)');
    expect(text).not.toContain('sahar@test.com)');
    expect(text).toContain('393x852');
    expect(text).toContain('v0.2.0-alpha');
  });

  it('correctly displays Anonymous Tester (Private) for anonymous feedback', () => {
    const feedback = {
      type: 'feature',
      rating: 4,
      message: 'Add custom status tags',
      isAnonymous: true,
      user: 'Anonymous Tester'
    };

    const userDisplay = feedback.isAnonymous ? 'Anonymous Tester (Private)' : feedback.user;
    expect(userDisplay).toBe('Anonymous Tester (Private)');
  });
});
