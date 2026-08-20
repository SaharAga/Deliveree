import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  maskEmail,
  validateAndSanitizeFeedback,
  submitFeedback,
  getOfflineFeedbackCount,
  flushOfflineFeedbackQueue,
  getLocalFeedbackHistory,
  OFFLINE_FEEDBACK_QUEUE_KEY
} from './feedbackService';
import * as telegramConstants from '../constants/telegram';

describe('FeedbackService Unit & Resilience Test Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, val) => { mockStorage[key] = String(val); }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; })
    });
    vi.stubGlobal('navigator', {
      onLine: true,
      userAgent: 'Vitest/TestAgent 1.0'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('maskEmail Utility', () => {
    it('masks emails properly across varying string lengths and domains', () => {
      expect(maskEmail('sahar@gmail.com')).toBe('s***r@gmail.com');
      expect(maskEmail('john.doe@company.org')).toBe('j***e@company.org');
      expect(maskEmail('a@domain.com')).toBe('*@domain.com');
      expect(maskEmail('ab@domain.com')).toBe('a*@domain.com');
      expect(maskEmail('abc@domain.com')).toBe('a*c@domain.com');
      expect(maskEmail('')).toBe('');
      expect(maskEmail(null)).toBe('');
      expect(maskEmail('invalid-email')).toBe('***');
    });
  });

  describe('validateAndSanitizeFeedback', () => {
    it('throws error for invalid input types or empty message', () => {
      expect(() => validateAndSanitizeFeedback(null)).toThrow();
      expect(() => validateAndSanitizeFeedback('string')).toThrow();
      expect(() => validateAndSanitizeFeedback({ message: '' })).toThrow();
      expect(() => validateAndSanitizeFeedback({ message: '   ' })).toThrow();
    });

    it('sanitizes XSS payloads and script tags from message', () => {
      const dirty = {
        type: 'bug',
        message: '<script>alert("hacked")</script>App crashed on tracking button <img src=x onerror=alert(1)>',
        rating: 4,
        user: { name: '<b onmouseover=evil()>Sahar</b>', email: 'test@example.com' }
      };

      const result = validateAndSanitizeFeedback(dirty);
      expect(result.message).not.toContain('<script>');
      expect(result.message).not.toContain('onerror');
      expect(result.message).toContain('App crashed on tracking button');
      expect(result.user.name).toBe('Sahar');
      expect(result.type).toBe('bug');
      expect(result.rating).toBe(4);
      expect(result.isAnonymous).toBe(false);
    });

    it('handles anonymous feedback correctly by setting user to Anonymous Tester', () => {
      const anonymousPayload = {
        type: 'feature',
        message: 'Private suggestions without sharing email',
        rating: 5,
        isAnonymous: true,
        user: { name: 'Secret User', email: 'secret@domain.com' }
      };

      const result = validateAndSanitizeFeedback(anonymousPayload);
      expect(result.isAnonymous).toBe(true);
      expect(result.user).toBe('Anonymous Tester');
    });

    it('clamps ratings between 1 and 5 and defaults valid feedback category', () => {
      const low = validateAndSanitizeFeedback({ message: 'Low rating test', rating: -2 });
      expect(low.rating).toBe(5);

      const validHigh = validateAndSanitizeFeedback({ message: 'High rating test', rating: 5 });
      expect(validHigh.rating).toBe(5);

      const invalidType = validateAndSanitizeFeedback({ message: 'Unknown type', type: 'exploit_type' });
      expect(invalidType.type).toBe('bug');

      const featureType = validateAndSanitizeFeedback({ message: 'New feature', type: 'feature' });
      expect(featureType.type).toBe('feature');

      const praiseType = validateAndSanitizeFeedback({ message: 'Awesome app', type: 'praise' });
      expect(praiseType.type).toBe('praise');
    });
  });

  describe('submitFeedback & Offline Queueing', () => {
    it('successfully queues and records offline feedback when Firestore is unconfigured/offline', async () => {
      vi.spyOn(telegramConstants, 'sendTelegramFeedbackRelay').mockResolvedValue(true);

      const submission = await submitFeedback({
        type: 'bug',
        message: 'Bluetooth receipt printer disconnects during package handover',
        rating: 3,
        user: 'Driver #42'
      });

      expect(submission.success).toBe(true);
      expect(getOfflineFeedbackCount()).toBe(1);
      
      const localHistory = getLocalFeedbackHistory();
      expect(localHistory.length).toBe(1);
      expect(localHistory[0].message).toContain('Bluetooth receipt printer');
    });

    it('handles offline state properly and enqueues payload', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      const submission = await submitFeedback({
        type: 'feature',
        message: 'Add dark mode toggle to navigation drawer',
        rating: 5
      });

      expect(submission.success).toBe(true);
      expect(submission.syncedToCloud).toBe(false);
      expect(getOfflineFeedbackCount()).toBe(1);
    });

    it('flushes offline queue when network becomes online', async () => {
      // Seed offline queue
      const initialQueue = [
        {
          id: 'fb-test-1',
          status: 'pending',
          type: 'bug',
          message: 'Saved offline item 1',
          rating: 4,
          timestamp: new Date().toISOString()
        },
        {
          id: 'fb-test-2',
          status: 'pending',
          type: 'feature',
          message: 'Saved offline item 2',
          rating: 5,
          timestamp: new Date().toISOString()
        }
      ];
      mockStorage[OFFLINE_FEEDBACK_QUEUE_KEY] = JSON.stringify(initialQueue);

      vi.spyOn(telegramConstants, 'sendTelegramFeedbackRelay').mockResolvedValue(true);
      vi.stubGlobal('navigator', { onLine: true });

      const flushResult = await flushOfflineFeedbackQueue();
      expect(flushResult.flushed).toBe(2);
      expect(flushResult.remaining).toBe(0);
      expect(getOfflineFeedbackCount()).toBe(0);

      const history = getLocalFeedbackHistory();
      expect(history.length).toBe(2);
      expect(history[0].syncedToCloud).toBe(true);
    });

    it('retains queued items if still offline during flush', async () => {
      const initialQueue = [
        {
          id: 'fb-test-1',
          status: 'pending',
          type: 'bug',
          message: 'Item while offline',
          rating: 2,
          timestamp: new Date().toISOString()
        }
      ];
      mockStorage[OFFLINE_FEEDBACK_QUEUE_KEY] = JSON.stringify(initialQueue);
      vi.stubGlobal('navigator', { onLine: false });

      const flushResult = await flushOfflineFeedbackQueue();
      expect(flushResult.flushed).toBe(0);
      expect(flushResult.remaining).toBe(1);
      expect(getOfflineFeedbackCount()).toBe(1);
    });
  });
});
