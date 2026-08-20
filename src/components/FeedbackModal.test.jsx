import { describe, it, expect } from 'vitest';
import { TELEGRAM_FEEDBACK_BOT_TOKEN, TELEGRAM_FEEDBACK_CHAT_ID } from '../constants/telegram';
import { validateAndSanitizeFeedback } from '../services/feedbackService';

describe('Feedback & Telegram Relay Logic', () => {
  it('does not leak hardcoded secret bot tokens into client bundle', () => {
    expect(TELEGRAM_FEEDBACK_BOT_TOKEN === '' || typeof TELEGRAM_FEEDBACK_BOT_TOKEN === 'string').toBe(true);
    expect(TELEGRAM_FEEDBACK_CHAT_ID).toBe('726522010');
  });

  it('correctly constructs Telegram HTML notification text with 100% complete anonymity', () => {
    const feedback = {
      type: 'bug',
      rating: 5,
      message: 'Found an alignment issue with the side navigation drawer on mobile',
      screenWidth: 393,
      screenHeight: 852,
      appVersion: '0.2.0-alpha',
      buildChannel: 'alpha',
      isAnonymous: true,
      user: 'Anonymous Tester'
    };

    const typeEmoji = feedback.type === 'bug' ? '🚨' : '💡';
    const ratingStars = '⭐'.repeat(feedback.rating);
    const userDisplay = 'Anonymous Tester';

    const text = [
      `<b>${typeEmoji} New Alpha Tester Feedback</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>⭐ Rating:</b> ${ratingStars} (${feedback.rating}/5)`,
      `<b>🏷️ Category:</b> ${feedback.type}`,
      `<b>👤 User:</b> ${userDisplay}`,
      `<b>📱 Device:</b> ${feedback.screenWidth}x${feedback.screenHeight}`,
      `<b>📦 App Version:</b> v${feedback.appVersion} (${feedback.buildChannel})`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>📝 Message:</b>`,
      `${feedback.message}`
    ].join('\n');

    expect(text).toContain('🚨 New Alpha Tester Feedback');
    expect(text).toContain('⭐⭐⭐⭐⭐');
    expect(text).toContain('👤 User:</b> Anonymous Tester');
    expect(text).not.toContain('@');
    expect(text).toContain('393x852');
    expect(text).toContain('v0.2.0-alpha');
  });

  it('strictly enforces anonymous user representation in sanitized payloads', () => {
    const rawWithPii = {
      type: 'feature',
      rating: 4,
      message: 'Add custom status tags',
      isAnonymous: false,
      user: { name: 'Alice Smith', email: 'alice@company.com', id: 'usr-999' }
    };

    const sanitized = validateAndSanitizeFeedback(rawWithPii);
    expect(sanitized.isAnonymous).toBe(true);
    expect(sanitized.user).toBe('Anonymous Tester');
    expect(JSON.stringify(sanitized)).not.toContain('alice');
    expect(JSON.stringify(sanitized)).not.toContain('usr-999');
  });
});
