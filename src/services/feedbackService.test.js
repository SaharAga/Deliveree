import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as feedbackService from './feedbackService';

const {
  validateAndSanitizeFeedback,
  submitFeedback,
  flushOfflineFeedbackQueue,
  getOfflineFeedbackCount,
  getLocalFeedbackHistory,
  OFFLINE_FEEDBACK_QUEUE_KEY,
} = feedbackService;

describe('FeedbackService Unit & Resilience Test Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    vi.restoreAllMocks();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    });
  });

  describe('validateAndSanitizeFeedback', () => {
    it('throws on nullish or invalid input payloads', () => {
      expect(() => validateAndSanitizeFeedback(null)).toThrow();
      expect(() => validateAndSanitizeFeedback(undefined)).toThrow();
      expect(() => validateAndSanitizeFeedback('not-an-object')).toThrow();
      expect(() => validateAndSanitizeFeedback([])).toThrow();
    });

    it('throws if message is empty or whitespace-only', () => {
      expect(() => validateAndSanitizeFeedback({ message: '' })).toThrow();
      expect(() => validateAndSanitizeFeedback({ message: '   ' })).toThrow();
    });

    it('sanitizes XSS payloads and script tags from feedback message', () => {
      const result = validateAndSanitizeFeedback({
        message: 'Broken UI <script>alert("hacked")</script> on package card',
        rating: 4
      });

      expect(result.message).not.toContain('<script>');
      expect(result.message).not.toContain('alert');
      expect(result.message).toContain('Broken UI');
    });

    it('redacts sensitive PII like Israeli phone numbers and email addresses', () => {
      const result = validateAndSanitizeFeedback({
        message: 'Contact me at 054-1234567 or user@example.com for driver details',
        rating: 5
      });

      expect(result.message).not.toContain('054-1234567');
      expect(result.message).not.toContain('user@example.com');
      expect(result.message).toContain('[REDACTED_PERSONAL_INFO]');
    });

    it('validates rating within 1-5 range and defaults invalid values to 5', () => {
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
    it('successfully queues and records offline feedback when Firestore is offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });

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
