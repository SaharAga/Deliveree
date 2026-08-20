/**
 * ThrottleGuard — Graduated Client-Side Rate Limiter & Progressive Backoff
 * Prevents 429 Too Many Requests and API quota exhaustion on carrier endpoints.
 */

export const DEFAULT_CONFIG = Object.freeze({
  maxRequestsPerMinute: 30,
  windowMs: 60 * 1000,
  baseBackoffMs: 1000,
  maxBackoffMs: 30 * 1000,
  backoffMultiplier: 2
});

export class ThrottleGuard {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.requestHistory = [];
    this.consecutiveErrors = 0;
    this.lockedUntil = 0;
  }

  /**
   * Resets all throttle history and backoff locks.
   */
  reset() {
    this.requestHistory = [];
    this.consecutiveErrors = 0;
    this.lockedUntil = 0;
  }

  /**
   * Checks whether a new request is allowed immediately.
   * @returns {{ allowed: boolean, waitTimeMs: number, reason?: string }}
   */
  checkLimit() {
    const now = Date.now();

    // Check if under active progressive backoff lock
    if (now < this.lockedUntil) {
      return {
        allowed: false,
        waitTimeMs: this.lockedUntil - now,
        reason: 'ACTIVE_BACKOFF_LOCK'
      };
    }

    // Prune expired window records
    this.requestHistory = this.requestHistory.filter(ts => now - ts < this.config.windowMs);

    if (this.requestHistory.length >= this.config.maxRequestsPerMinute) {
      const oldestTs = this.requestHistory[0];
      const waitTimeMs = Math.max(0, this.config.windowMs - (now - oldestTs));
      return {
        allowed: false,
        waitTimeMs,
        reason: 'MAX_RPM_REACHED'
      };
    }

    return {
      allowed: true,
      waitTimeMs: 0
    };
  }

  /**
   * Records a request dispatch.
   */
  recordRequest() {
    this.requestHistory.push(Date.now());
  }

  /**
   * Records a successful response, decaying error backoff count.
   */
  recordSuccess() {
    this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
  }

  /**
   * Records a 429 or network rate limit error, triggering progressive exponential backoff.
   * @param {number} [suggestedRetryAfterSec]
   * @returns {number} Backoff lock duration in milliseconds
   */
  recordRateLimitError(suggestedRetryAfterSec) {
    this.consecutiveErrors += 1;

    let backoffMs;
    if (typeof suggestedRetryAfterSec === 'number' && suggestedRetryAfterSec > 0) {
      backoffMs = suggestedRetryAfterSec * 1000;
    } else {
      backoffMs = Math.min(
        this.config.maxBackoffMs,
        this.config.baseBackoffMs * Math.pow(this.config.backoffMultiplier, this.consecutiveErrors - 1)
      );
    }

    // Jitter: +/- 10% random skew to prevent stampeding herd
    const jitter = (Math.random() * 0.2 - 0.1) * backoffMs;
    const finalBackoff = Math.max(100, Math.round(backoffMs + jitter));

    this.lockedUntil = Date.now() + finalBackoff;
    return finalBackoff;
  }

  /**
   * Executes a task with automatic rate limiting and graduated backoff.
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async execute(fn) {
    const check = this.checkLimit();
    if (!check.allowed) {
      const err = new Error(`Request throttled: please wait ${Math.ceil(check.waitTimeMs / 1000)}s (${check.reason})`);
      err.throttled = true;
      err.waitTimeMs = check.waitTimeMs;
      throw err;
    }

    this.recordRequest();
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      if (err?.status === 429 || err?.message?.includes('429') || err?.rateLimited) {
        this.recordRateLimitError();
      }
      throw err;
    }
  }
}

export const defaultThrottleGuard = new ThrottleGuard();
