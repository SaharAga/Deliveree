import { describe, it, expect, beforeEach } from 'vitest';
import { ThrottleGuard } from './throttleGuard';

describe('ThrottleGuard Unit Tests', () => {
  let guard;

  beforeEach(() => {
    guard = new ThrottleGuard({
      maxRequestsPerMinute: 3,
      windowMs: 1000,
      baseBackoffMs: 200,
      maxBackoffMs: 2000,
      backoffMultiplier: 2
    });
  });

  it('allows requests within max RPM quota', () => {
    expect(guard.checkLimit().allowed).toBe(true);
    guard.recordRequest();
    expect(guard.checkLimit().allowed).toBe(true);
    guard.recordRequest();
    expect(guard.checkLimit().allowed).toBe(true);
    guard.recordRequest();

    const fourthCheck = guard.checkLimit();
    expect(fourthCheck.allowed).toBe(false);
    expect(fourthCheck.reason).toBe('MAX_RPM_REACHED');
  });

  it('triggers exponential progressive backoff on 429 rate limit errors', () => {
    const backoff1 = guard.recordRateLimitError();
    expect(backoff1).toBeGreaterThanOrEqual(180); // ~200ms +/- jitter
    expect(guard.checkLimit().allowed).toBe(false);
    expect(guard.checkLimit().reason).toBe('ACTIVE_BACKOFF_LOCK');

    const backoff2 = guard.recordRateLimitError();
    expect(backoff2).toBeGreaterThanOrEqual(360); // ~400ms +/- jitter
  });

  it('executes async task successfully and handles error backoff', async () => {
    const successResult = await guard.execute(async () => 'OK');
    expect(successResult).toBe('OK');

    await expect(
      guard.execute(async () => {
        const err = new Error('429 Too Many Requests');
        err.status = 429;
        throw err;
      })
    ).rejects.toThrow('429');

    expect(guard.checkLimit().allowed).toBe(false);
  });
});
