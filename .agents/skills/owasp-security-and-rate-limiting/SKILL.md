---
name: owasp-security-and-rate-limiting
description: Strictest enterprise security auditing protocol based on OWASP ASVS Level 3 and OWASP API Top 10. Activate when auditing any code change touching auth, data access, user input, regex patterns, file uploads, API endpoints, or server-side HTTP calls. Do NOT activate for pure frontend styling changes, static asset updates, or documentation-only commits.
inputs:
  - List of modified files and their code content
  - Identified threat surface (endpoints, user inputs, DB queries, regexes)
outputs:
  - Structured Security Audit Report (PASS / FAIL) with severity-graded, line-cited findings and exact drop-in remediation code
---

# Enterprise Security & Rate Limiting Audit Protocol

This skill guides any agent or security auditor in performing strict, enterprise-grade security evaluations conforming to **OWASP ASVS Level 3**, **NIST SSDF**, and **Zero-Trust principles**.

---

## 1. The Strictest Security Checklist

### A. Authorization, Multi-Tenancy & BOLA/BFLA (ASVS V4, OWASP API1)
* **Zero-Trust Invariant**: Every request and database operation must verify that the authenticated identity is authorized to access the specific object ID.
* **Cloud DB & Firestore Update Rule Invariant**:
  * For update operations on user-scoped collections, **BOTH** the existing document owner **AND** the incoming modified document owner must be validated:
    ```firestore
    allow update: if request.auth != null 
                  && resource.data.userId == request.auth.uid 
                  && request.resource.data.userId == request.auth.uid;
    ```
  * Failing to validate `request.resource.data.userId` allows an attacker to overwrite document ownership and inject rogue data into victim accounts (BOLA).

### B. Anti-ReDoS & Regex Backtracking Auditing (ASVS V5.2)
* **Adjacent Quantifier Traps**: Flag patterns with adjacent unanchored quantifiers separated by optional tokens (e.g. `\s*:?\s*` or `(a+)+`), which cause quadratic $O(N^2)$ or exponential $O(2^N)$ CPU freezes.
* **Deterministic Patterns**: Enforce anchored, single-pass character classes (e.g. `(?:AWB[:\s]\s*)?`).

### C. Cryptographic Standards & Timing Attacks (ASVS V6)
* **Constant-Time Comparison**: All token/secret comparisons MUST use `crypto.timingSafeEqual` after pre-hashing both operands to equal-length SHA-256 digests to eliminate timing side-channels from string length differences:
  ```typescript
  import { createHash, timingSafeEqual } from 'node:crypto';
  export function safeCompareTokens(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(String(a), 'utf8').digest();
    const hashB = createHash('sha256').update(String(b), 'utf8').digest();
    return timingSafeEqual(hashA, hashB);
  }
  ```
* **Password Hashing**: Enforce Argon2id (preferred) or bcrypt (min cost=12). Never store plaintext or MD5/SHA1-hashed passwords.
* **CSPRNG**: Use `crypto.getRandomValues()` (browser) or `crypto.randomBytes()` (Node) for all tokens, nonces, and session IDs.

### D. SSRF Protection — Dual-Stack IPv4 & IPv6 (ASVS V10)
* **Complete Private CIDR Blocklist** — reject DNS resolutions that map to ANY of:
  * IPv4: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10` (CGNAT), `127.0.0.0/8`, `169.254.169.254`, `0.0.0.0/8`
  * IPv6: `::1/128`, `fc00::/7`, `fe80::/10`, `::ffff:0:0/96` (IPv4-mapped)
* **DNS Socket-Pinning**: Resolve hostname to IP once, verify IP against blocklist, then **pin** the resolved IP to the socket to prevent DNS rebinding / TOCTOU bypasses (`redirect: 'error'` to block open-redirect pivots).

### E. Safe Native & Web APIs (Clipboard & File Reader)
* **Clipboard API & False Feedback**: Never swallow clipboard errors with `.catch(() => {})` while displaying a success notification. Always `await writeText()` inside `try/catch` with `document.execCommand('copy')` fallback.
* **Unbounded File Reader**: Enforce `file.size <= 2MB` before `readAsText()` and `file.size <= 5MB` before `readAsDataURL()` to prevent OOM crashes.

### F. Input Validation & Defensive Parsing (ASVS V5)
* **Schema Allowlisting**: Validate all payloads against strict schemas (Zod, Joi, TypeBox). Strip unknown keys (`strip()` / `strict()`).
* **Prototype Pollution**: Validate all object merge/clone keys against `__proto__`, `constructor`, `prototype`. Use `Object.create(null)` for accumulator objects.
* **Error Information Leakage (CWE-209)**: Sanitize all error payloads before returning them to API clients — strip stack traces, DB schema names, and internal paths. Use a production error sanitization layer.

### G. Rate Limiting & Resource Exhaustion (OWASP API4)
* **Dual-Key Throttling**: Rate limit with combined key (`IP + UserID`) using atomic operations.
* **Distributed Sliding Window**: Use atomic Redis Lua scripts or equivalent to prevent race conditions in distributed deployments.
* **Standard RFC Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (RFC-compliant) plus `Retry-After: <seconds>` on `HTTP 429`.

### H. Injection, Secrets & Security Headers (ASVS V14)
* **Secrets Scan**: Zero hardcoded passwords, API keys, or tokens in source files, `.env.local`, or client-side bundles.
* **Security Headers**: Enforce `HSTS preload`, strict `Content-Security-Policy` (with SPA hash nonces), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
* **Hardcoded IPs**: Never hardcode RFC 1918 LAN IPs in client code; derive them dynamically from `window.location.origin`.

---

## 2. Structured Security Audit Report

```markdown
# 🛡️ Enterprise Security Audit Report

## Overall Status: [ PASS | FAIL ]

### 1. Security Domain Compliance
- **Auth & Access Control (BOLA/BFLA Update Invariant)**: [Pass / Fail]
- **Anti-ReDoS & Regex Resilience**: [Pass / Fail]
- **Cryptographic Standards (timingSafeEqual, Argon2id)**: [Pass / Fail]
- **SSRF Guard (Dual-Stack IPv4/IPv6 + DNS Pinning)**: [Pass / Fail]
- **Native APIs & File Reader Guards**: [Pass / Fail]
- **Input Validation & Prototype Pollution**: [Pass / Fail]
- **Error Sanitization (No Stack Trace Leakage)**: [Pass / Fail]
- **Rate Limiting (Distributed Sliding Window)**: [Pass / Fail]
- **Secrets & Security Headers**: [Pass / Fail]

### 2. Vulnerability Findings (if FAIL)
| Severity | File:Line | Vulnerability | Remediation |
|---|---|---|---|
| [CRITICAL\|HIGH\|MEDIUM\|LOW] | file.js:N | Description | Drop-in fix |
```
