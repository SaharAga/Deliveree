import { describe, it, expect } from 'vitest';
import { validateAndSanitizeFeedback } from '../services/feedbackService';

describe('Feedback Sanitization Logic', () => {
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
