import { detectCarrier } from './carrierDetector';
import { validatePackageList } from './packageValidator';

/**
 * Standard gold-standard tracking numbers across supported major carriers.
 */
export const GOLD_STANDARD_CARRIER_SAMPLES = Object.freeze({
  'israel-post': 'RS948219481IL',
  'cainiao': 'LP00582910482CN',
  'dhl': '4829104821',
  'fedex': '784920194821',
  'ups': '1Z9999999999999999'
});

/**
 * Maximum capacity constraint for in-memory package validation list.
 */
export const MAX_PACKAGE_MEMORY_BOUND = 1000;

/**
 * Probes localStorage availability, write-read-delete cycle, and quota integrity.
 * Detects private browsing locks, permission denials, or quota errors.
 * 
 * @param {Storage} [customStorage] - Optional storage mock/instance for testability
 * @returns {{ id: string, name: string, status: 'PASS' | 'FAIL', message: string, details?: any }}
 */
export function runStorageSelfTest(customStorage) {
  const probeKey = `__deliveree_bist_storage_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const probeValue = `probe_payload_${Date.now()}`;

  let storage;
  try {
    storage = customStorage !== undefined ? customStorage : (typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null));
  } catch (err) {
    return {
      id: 'storage-self-test',
      name: 'LocalStorage Write-Read-Delete Integrity Probe',
      status: 'FAIL',
      message: `LocalStorage access denied or restricted: ${err.message}`,
      details: { error: err.name || 'SecurityError' }
    };
  }

  if (!storage || typeof storage.setItem !== 'function' || typeof storage.getItem !== 'function' || typeof storage.removeItem !== 'function') {
    return {
      id: 'storage-self-test',
      name: 'LocalStorage Write-Read-Delete Integrity Probe',
      status: 'FAIL',
      message: 'LocalStorage API is unavailable in current runtime environment',
      details: { available: false }
    };
  }

  try {
    // 1. Write probe
    storage.setItem(probeKey, probeValue);

    // 2. Read verification
    const readValue = storage.getItem(probeKey);
    if (readValue !== probeValue) {
      // Attempt cleanup
      try { storage.removeItem(probeKey); } catch {}
      return {
        id: 'storage-self-test',
        name: 'LocalStorage Write-Read-Delete Integrity Probe',
        status: 'FAIL',
        message: `LocalStorage read mismatch: expected "${probeValue}", got "${readValue}"`,
        details: { expected: probeValue, actual: readValue }
      };
    }

    // 3. Delete probe
    storage.removeItem(probeKey);
    const postDeleteValue = storage.getItem(probeKey);
    if (postDeleteValue !== null) {
      return {
        id: 'storage-self-test',
        name: 'LocalStorage Write-Read-Delete Integrity Probe',
        status: 'FAIL',
        message: 'LocalStorage delete cycle failed: key persisted after removeItem',
        details: { postDeleteValue }
      };
    }

    return {
      id: 'storage-self-test',
      name: 'LocalStorage Write-Read-Delete Integrity Probe',
      status: 'PASS',
      message: 'LocalStorage write-read-delete cycle completed successfully',
      details: { probeKey }
    };
  } catch (err) {
    // Attempt cleanup if possible
    try { storage.removeItem(probeKey); } catch {}
    return {
      id: 'storage-self-test',
      name: 'LocalStorage Write-Read-Delete Integrity Probe',
      status: 'FAIL',
      message: `LocalStorage write-read-delete cycle failed (Quota/Private browsing lock): ${err.message}`,
      details: { error: err.name || 'StorageError', message: err.message }
    };
  }
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Asserts that gold-standard tracking numbers for Israel Post, Cainiao, DHL, FedEx, UPS resolve correctly against detectCarrier().
 * 
 * @param {Record<string, string>} [customSamples] - Optional mapping of carrierId -> trackingNumber
 * @returns {{ id: string, name: string, status: 'PASS' | 'FAIL', message: string, details?: any }}
 */
export function runCarrierRegexSelfTest(customSamples = GOLD_STANDARD_CARRIER_SAMPLES) {
  if (!customSamples || typeof customSamples !== 'object') {
    return {
      id: 'carrier-regex-self-test',
      name: 'Carrier Regex Detection Gold-Standard Verification',
      status: 'FAIL',
      message: 'Invalid carrier samples input: expected an object mapping carrierId to trackingNumber',
      details: { customSamples }
    };
  }

  const failures = [];
  const results = {};

  for (const [expectedCarrierId, trackingNumber] of Object.entries(customSamples)) {
    if (DANGEROUS_KEYS.has(expectedCarrierId) || typeof trackingNumber !== 'string') {
      continue;
    }

    try {
      const detection = detectCarrier(trackingNumber);
      results[expectedCarrierId] = {
        trackingNumber,
        detectedCarrierId: detection.carrierId,
        confidence: detection.confidence,
        matched: detection.carrierId === expectedCarrierId
      };

      if (detection.carrierId !== expectedCarrierId) {
        failures.push({
          carrier: expectedCarrierId,
          trackingNumber,
          expected: expectedCarrierId,
          actual: detection.carrierId
        });
      }
    } catch (err) {
      failures.push({
        carrier: expectedCarrierId,
        trackingNumber,
        expected: expectedCarrierId,
        error: err.message
      });
    }
  }

  if (failures.length > 0) {
    return {
      id: 'carrier-regex-self-test',
      name: 'Carrier Regex Detection Gold-Standard Verification',
      status: 'FAIL',
      message: `Carrier regex detection failed for ${failures.length} carrier sample(s)`,
      details: { failures, results }
    };
  }

  return {
    id: 'carrier-regex-self-test',
    name: 'Carrier Regex Detection Gold-Standard Verification',
    status: 'PASS',
    message: `All ${Object.keys(customSamples).length} gold-standard carrier tracking numbers resolved with 100% precision`,
    details: { results }
  };
}

/**
 * Asserts that the 1,000 package limit constraint is intact and enforced by validatePackageList().
 * 
 * @param {number} [testInputSize=1250] - Size of test input array to verify against invariant
 * @returns {{ id: string, name: string, status: 'PASS' | 'FAIL', message: string, details?: any }}
 */
export function runMemoryBoundsSelfTest(testInputSize = 1250) {
  try {
    const inputSize = Math.max(testInputSize, MAX_PACKAGE_MEMORY_BOUND + 100);
    const oversizedArray = Array.from({ length: inputSize }, (_, idx) => ({
      id: `pkg-bench-${idx}`,
      title: `Benchmark Package #${idx}`,
      trackingNumber: `TRACK-${idx}`,
      carrier: 'other',
      status: 'in_transit'
    }));

    const result = validatePackageList(oversizedArray);

    if (!Array.isArray(result)) {
      return {
        id: 'memory-bounds-self-test',
        name: 'Memory Bounds & Package Cap Invariant Probe',
        status: 'FAIL',
        message: 'validatePackageList did not return an array',
        details: { resultType: typeof result }
      };
    }

    if (result.length > MAX_PACKAGE_MEMORY_BOUND) {
      return {
        id: 'memory-bounds-self-test',
        name: 'Memory Bounds & Package Cap Invariant Probe',
        status: 'FAIL',
        message: `Package capacity bound breached: allowed ${result.length} items (system limit: ${MAX_PACKAGE_MEMORY_BOUND})`,
        details: { inputSize, outputSize: result.length, limit: MAX_PACKAGE_MEMORY_BOUND }
      };
    }

    if (result.length !== MAX_PACKAGE_MEMORY_BOUND) {
      return {
        id: 'memory-bounds-self-test',
        name: 'Memory Bounds & Package Cap Invariant Probe',
        status: 'FAIL',
        message: `Package cap truncation anomaly: expected exactly ${MAX_PACKAGE_MEMORY_BOUND} valid items, got ${result.length}`,
        details: { inputSize, outputSize: result.length, limit: MAX_PACKAGE_MEMORY_BOUND }
      };
    }

    return {
      id: 'memory-bounds-self-test',
      name: 'Memory Bounds & Package Cap Invariant Probe',
      status: 'PASS',
      message: `Memory bounds constraint verified: input array of ${inputSize} items safely capped to ${result.length} (limit: ${MAX_PACKAGE_MEMORY_BOUND})`,
      details: { inputSize, outputSize: result.length, limit: MAX_PACKAGE_MEMORY_BOUND }
    };
  } catch (err) {
    return {
      id: 'memory-bounds-self-test',
      name: 'Memory Bounds & Package Cap Invariant Probe',
      status: 'FAIL',
      message: `Memory bounds self-test threw unexpected error: ${err.message}`,
      details: { error: err.name || 'Error', message: err.message }
    };
  }
}

/**
 * Aggregates all Built-in Self-Test probes into a structured diagnostic report.
 * 
 * @param {object} [options] - Optional custom test parameters/mocks
 * @param {Storage} [options.storage] - Custom storage instance
 * @param {Record<string, string>} [options.carrierSamples] - Custom carrier samples
 * @param {number} [options.memoryLimit] - Custom memory bound limit
 * @returns {{
 *   status: 'PASS' | 'WARN' | 'FAIL',
 *   timestamp: string,
 *   summary: { total: number, passed: number, failed: number, warnings: number },
 *   checks: Array<{ id: string, name: string, status: 'PASS' | 'WARN' | 'FAIL', message: string, details?: any }>
 * }}
 */
export function runAllBistDiagnostics(options = {}) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const checks = [
    runStorageSelfTest(safeOptions.storage),
    runCarrierRegexSelfTest(safeOptions.carrierSamples),
    runMemoryBoundsSelfTest(typeof safeOptions.memoryLimit === 'number' ? safeOptions.memoryLimit : undefined)
  ];

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const check of checks) {
    if (check.status === 'PASS') {
      passed += 1;
    } else if (check.status === 'FAIL') {
      failed += 1;
    } else if (check.status === 'WARN') {
      warnings += 1;
    }
  }

  let aggregateStatus = 'PASS';
  if (failed > 0) {
    aggregateStatus = 'FAIL';
  } else if (warnings > 0) {
    aggregateStatus = 'WARN';
  }

  return {
    status: aggregateStatus,
    timestamp: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings
    },
    checks
  };
}
