import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compares two secrets in constant time, unconditionally pre-hashing to 32-byte digests
 * to eliminate timing side-channels from string length differences.
 */
export function safeCompareTokens(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(String(a), 'utf8').digest();
  const hashB = createHash('sha256').update(String(b), 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}