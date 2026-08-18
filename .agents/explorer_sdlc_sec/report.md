# Enterprise Security & Threat Model Completeness Audit Report (Requirement R2)
**Investigator**: `explorer_sdlc_sec` (Enterprise Security & Threat Modeling Investigator)  
**Date**: 2026-08-18  
**Audit Standard**: OWASP ASVS 4.0.3 (Level 3), OWASP API Security Top 10 (2023), NIST SP 800-218 (SSDF), RFC 9110/IETF Drafts  
**Status**: Comprehensive Line-Cited Evaluation & Production Remediation

---

## Executive Summary

An exhaustive security audit was conducted on the Multi-Agent SDLC Framework artifacts, rulebooks, and specialized skills (`owasp-security-and-rate-limiting`, `software-development-standards`, `sdlc_pipeline.md`, `AGENTS.md`, and `subagents.json`).

While the baseline framework demonstrates strong security intentionality (introducing BOLA Firestore update invariants, adjacent quantifier ReDoS flags, and basic security headers), the current implementation contains **significant architectural omissions and blind spots** when measured against **OWASP ASVS Level 3** and **OWASP API Top 10**.

### Key Vulnerability Gaps Identified:
1. **Critical SSRF Omission in Skill Body**: While `owasp-security-and-rate-limiting/SKILL.md` claims SSRF defense in its frontmatter description (Line 3), the skill body contains **zero lines, rules, or checklists for SSRF**. In `sdlc_pipeline.md` (Line 56) and `AGENTS.md` (Line 52), the SSRF CIDR blocklist is dangerously incomplete (omitting RFC 1918 `172.16.0.0/12`, all IPv6 subnets `::1`, `fc00::/7`, `fe80::/10`, and IPv4-mapped IPv6 `::ffff:0:0/96`), and completely lacks DNS rebinding / TOCTOU IP-pinning defenses.
2. **Missing Cryptographic & Anti-Tampering Standards**: Complete absence of timing-safe string comparison (`crypto.timingSafeEqual`), modern password hashing parameters (Argon2id/bcrypt), CSPRNG requirements (`crypto.randomBytes` vs `Math.random()`), and webhook HMAC-SHA256 signature verification standards.
3. **Incomplete Authorization & Session Lifecycle**: BOLA rules only cover Firestore document updates; they omit relational/SQL tenant-scoped queries (`tenant_id = ?`), non-sequential unguessable IDs (UUIDv4/ULID), BFLA/RBAC permission matrices, JWT token expiration policies (<15 min), Refresh Token Rotation (RTR), `jti` nonce replay tracking, and secure cookie prefixes (`__Host-`).
4. **Outdated Rate Limiting Specification**: Recommends deprecated `X-RateLimit-*` headers instead of standard IETF RFC headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`), lacks algorithm specifications (Sliding Window Counter vs Token Bucket), and provides no atomic Redis Lua scripting guidance for distributed concurrency safety.
5. **Permissive Input & Error Sanitization**: Missing prototype pollution stripping in JSON deserialization (`reviver` / `Object.create(null)`), lacks Regex execution timeout / AST parsing mandates for complex input structures, and exposes sensitive error details via un-sanitized `AppError.details`.

---

## 1. Line-Cited Artifact Audit & Gap Matrix

### 1.1 `owasp-security-and-rate-limiting/SKILL.md`

| Location | Existing Text / Claim | Critical Security Gap & ASVS Level 3 Deficiency |
| :--- | :--- | :--- |
| **Lines 1–4** | `description: ... Audits for BOLA/BFLA, Zero-Trust auth, rate limiting (sliding window/token bucket), defensive parsing, Anti-ReDoS, SSRF, security headers, and secret leakage.` | **Phantom Capability / Discrepancy**: The description advertises SSRF and Token Bucket/Sliding Window auditing, but neither SSRF nor rate limiting algorithms appear anywhere in the instructional checklist (Sections 1A–1F). |
| **Lines 14–24** | `### A. Authorization, Multi-Tenancy & BOLA/BFLA (ASVS V4, OWASP API1)`<br>`* Cloud DB & Firestore Update Rule Invariant ... allow update: if request.auth != null && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;` | **No Relational/SQL/API Guidance**: Covers only NoSQL/Firestore. No guidance on SQL tenant isolation (`WHERE tenant_id = $1`), no requirement for unguessable primary keys (UUIDv4/ULID/KSUID) to prevent IDOR enumeration, no BFLA function-level role enforcement, and zero session/token lifecycle standards. |
| **Lines 25–28** | `### B. Anti-ReDoS & Regex Backtracking Auditing (ASVS V5.2)`<br>`* Adjacent Quantifier Traps ... deterministic patterns (?:AWB[:\s]\s*)?` | **Incomplete ReDoS & Execution Traps**: Only flags basic repetitions `(a+)+`. Misses overlapping alternations `(a|a)+`, star-height nesting `([a-zA-Z0-9]+)*`, unanchored wildcards `.*.*`, regex execution timeout guards (`AbortSignal` / worker sandbox), and AST/deterministic string search alternatives. |
| **Lines 29–35** | `### C. Safe Native & Web APIs (Clipboard & File Reader)` | **Client-Side Bias / Missing Backend Resource Limits**: Focuses purely on browser DOM APIs. Fails to define server-side memory limits, streaming multipart file upload constraints, payload decompression bomb limits, or max JSON depth recursion limits. |
| **Lines 36–39** | `### D. Input Validation & Defensive Parsing (ASVS V5)`<br>`* Prototype Pollution: Sanitize object merges/clones; freeze or validate keys against __proto__, constructor, prototype.` | **Incomplete Deserialization Defense**: Lacks guidelines for `JSON.parse` reviver functions, `Object.create(null)` dictionary lookups, `Map` enforcement, and HTTP Parameter Pollution (HPP) handling. |
| **Lines 40–44** | `### E. Rate Limiting & Resource Exhaustion (OWASP API4)`<br>`* Standard Response Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.` | **Deprecated Draft Headers & Missing Algorithmic Core**: Uses deprecated `X-RateLimit-*` prefixes rather than standard IETF `RateLimit-*` headers. No algorithmic specification (Sliding Window Log vs Counter vs Token Bucket) and zero guidance on atomic distributed Redis Lua scripts. |
| **Lines 45–48** | `### F. Injection, Secrets & Security Headers (ASVS V14)`<br>`* Security Headers: Enforce HSTS preload, strict CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin.` | **Missing Cryptography, SSRF & Modern CSP**: Zero mention of SSRF CIDR blocking, DNS rebinding, timing attacks (`crypto.timingSafeEqual`), password hashing (Argon2id), nonce-based CSP (`'strict-dynamic'`), `frame-ancestors 'none'`, and `Permissions-Policy`. |

---

### 1.2 `software-development-standards/SKILL.md`

| Location | Existing Text / Claim | Critical Security Gap & Threat Model Deficiency |
| :--- | :--- | :--- |
| **Lines 31–45** | `## 2. Defensive Programming & Error Handling`<br>`interface AppError { code: string; message: string; status?: number; details?: unknown; }` | **CWE-209 / ASVS V7.4 Information Leakage**: `details?: unknown` in `AppError` easily leaks database error stacks, SQL syntax details, internal microservice URLs, or filesystem paths to client consumers. Requires explicit production sanitization layer. |
| **Lines 48–53** | `## 3. State Management & Lifecycle Safety` | **CWE-312 / ASVS V8 Insecure Client Storage**: Lacks rules regarding sensitive data in frontend state. Must explicitly prohibit storing plaintext JWTs, session tokens, passwords, or PII in `localStorage` or `sessionStorage` (vulnerable to XSS extraction). |
| **Lines 56–64** | `## 4. Automated Testing Requirements` | **Missing Security Regression Testbenches**: Only specifies happy path, boundaries, and generic error paths. Does not mandate negative authorization tests (BOLA ID swapping), malicious payload fuzzing, or rate limit threshold breach test cases. |

---

### 1.3 `sdlc_pipeline.md` & `AGENTS.md`

| Location | Existing Text / Claim | Critical Security Gap |
| :--- | :--- | :--- |
| **`sdlc_pipeline.md` Line 56** / **`AGENTS.md` Line 52** | `* **SSRF Protection**: Block private CIDRs (10.0.0.0/8, 192.168.0.0/16, 127.0.0.0/8, 169.254.169.254).` | **Critical Incomplete CIDR & DNS Rebinding Vulnerability**:<br>1. **Missing IPv4 CIDRs**: `172.16.0.0/12` (major RFC 1918 range), `0.0.0.0/8`, `100.64.0.0/10` (CGNAT), `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`.<br>2. **Missing All IPv6 CIDRs**: `::1/128`, `::/128`, `fc00::/7` (ULA), `fe80::/10` (Link-Local), `::ffff:0:0/96` (IPv4-mapped IPv6).<br>3. **DNS Rebinding / TOCTOU**: Checking host string alone fails when DNS responds with public IP on check and private IP on fetch. Must resolve and pin socket IP.<br>4. **Protocol Whitelisting**: Does not enforce `http:` / `https:` only, leaving `file://`, `gopher://`, `ftp://` unprotected. |
| **`sdlc_pipeline.md` Lines 51–60** / **`AGENTS.md` Lines 47–56** | `### Stage 4: Enterprise Security & Rate Limiting Audit (Security Auditor)` | **Missing Cryptography & Token Security**: Completely omits constant-time comparison, Argon2id hashing, CSPRNG requirements, JWT lifetime limits (<15m), and Refresh Token Rotation. |

---

### 1.4 `subagents/subagents.json`

| Location | Existing Text / Claim | Critical Security Gap |
| :--- | :--- | :--- |
| **Lines 15–18** | `"name": "security_auditor", "description": "Enterprise Security Auditor subagent auditing against OWASP ASVS Level 3, OWASP API Top 10, Zero Trust, Rate Limiting, BOLA/BFLA, Anti-ReDoS, and Security Headers."` | **Incomplete Scope in Subagent Prompt**: The description fails to explicitly instruct the auditor to verify SSRF DNS-pinning, cryptographic constant-time comparison, token lifecycle/rotation, and secure error sanitization. |

---

## 2. In-Depth Technical Security Audits

### 2.1 Zero-Trust, Authorization & Token Lifecycle (ASVS V3, V4 & OWASP API1/API5)

#### A. BOLA / IDOR Defenses
- **Deficiency**: The current rule only checks Firestore update rules (`resource.data.userId == request.auth.uid`). Modern applications utilize PostgreSQL, MySQL, Prisma, Drizzle, or REST/GraphQL endpoints where BOLA is prevalent.
- **ASVS L3 Requirement**:
  1. **Tenant-Scoped Database Queries**: All database lookups, updates, and deletes must append the tenant/owner ID directly to the query predicate (e.g., `WHERE id = :id AND tenant_id = :tenantId`).
  2. **Non-Sequential IDs**: Sequential integer auto-increment primary keys (`/api/orders/1024`) enable trivial enumeration and scraping attacks. All public-facing identifiers must use **UUIDv4**, **ULID**, or **KSUID** generated via CSPRNG.
  3. **Object Ownership Assertion**: Domain layer services must verify resource ownership prior to executing business mutations.

#### B. Broken Function Level Authorization (BFLA)
- **Deficiency**: No function-level role enforcement guidelines exist in the framework.
- **ASVS L3 Requirement**:
  1. **Strict Permission Matrix & RBAC/ABAC**: Every administrative or privileged endpoint must be protected by explicit function-level authorization decorators/guards (e.g. `@RequirePermissions('order:refund')` or `authorize(Roles.ADMIN)`).
  2. **Vertical Privilege Escalation Checks**: Role assignment endpoints must prevent users from elevating their own roles via request body tampering (`role: 'admin'`).

#### C. Session & Token Hardening
- **Deficiency**: Total absence of JWT/session security standards in skills and rules.
- **ASVS L3 Requirement**:
  1. **Short-Lived Access Tokens**: JWT access tokens must have an expiration of $\le 15\text{ minutes}$.
  2. **Refresh Token Rotation (RTR)**: Refresh tokens must be single-use. Upon exchange, the previous refresh token is invalidated, a new pair is issued, and if an invalidated token is reused, the entire token family is immediately revoked (compromise detection).
  3. **Replay Attack Prevention**: Use cryptographically random `jti` (JWT ID) claims tracked in a centralized cache (Redis) for instant token revocation before natural expiration.
  4. **Cookie Security Attributes**: Auth cookies must be set with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and prefixed with `__Host-` to prevent subdomain and path injection attacks.

---

### 2.2 Cryptography & Anti-Tampering (ASVS V6)

#### A. Timing Attack Mitigation
- **Deficiency**: Comparing authentication tokens, HMAC signatures, API keys, or reset codes with `===` or `==` leaks timing information through early byte termination, allowing attackers to reconstruct valid signatures byte-by-byte.
- **ASVS L3 Requirement**: All secret/token/signature comparisons must use constant-time comparison algorithms via `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` with length equality safeguards.

#### B. Password & Secret Hashing
- **Deficiency**: Framework lacks password hashing mandates, risking use of deprecated algorithms (MD5, SHA1, plain SHA256) or insufficient work factors.
- **ASVS L3 Requirement**:
  1. Use **Argon2id** (memory cost $\ge 64\text{MB}$, time cost $\ge 3$, parallelism $\ge 4$) as the primary standard, or **bcrypt** (cost factor $\ge 12$) / **PBKDF2-SHA512** ($\ge 600,000$ iterations).
  2. Webhook payload signatures must use **HMAC-SHA256** with constant-time verification.

#### C. Cryptographically Secure Random Number Generation (CSPRNG)
- **Deficiency**: No prohibition against `Math.random()` for security-sensitive tokens (CSRF tokens, session IDs, verification codes, password reset nonces).
- **ASVS L3 Requirement**: Mandate `crypto.randomBytes(n)` (Node.js) or `crypto.getRandomValues(new Uint8Array(n))` (Web Crypto API). `Math.random()` is strictly prohibited for security contexts.

---

### 2.3 Input Parsing, Anti-ReDoS & Prototype Pollution (ASVS V5)

#### A. Strict Schema Parsing & Mass Assignment Defense
- **Deficiency**: Current guideline says "Strip unknown or extra properties (`strip()` / `strict()`)", but lacks concrete enforcement against nested object pollution and type coercion vulnerabilities.
- **ASVS L3 Requirement**:
  1. Enforce `z.object({...}).strict()` or `.strip()` on every external input vector (body, params, query, headers).
  2. Prohibit direct binding of request bodies to database ORM models (`User.create(req.body)`).

#### B. Anti-ReDoS Engineering
- **Deficiency**: Simple regex checks do not prevent polynomial/exponential backtracking.
- **ASVS L3 Requirement**:
  1. **Pattern Rules**: Flag and reject:
     - Nested quantifiers: `(a+)+`, `([a-zA-Z]+)*`
     - Overlapping alternations with repetition: `(a|a)+`, `(a|ab)+`
     - Unanchored wildcards with optional separators: `^.*:\s*.*$`
  2. **Execution Sandboxing**: For dynamic or complex matching, enforce regex evaluation timeout guards (e.g. using `re2`, `safe-regex`, or worker threads with `AbortSignal` timeout $\le 50\text{ms}$).
  3. **Deterministic Parsing**: Mandate AST parsers, streaming lexical tokenizers, or native string primitives (`indexOf`, `startsWith`, `split`) for structured syntax.

#### C. Prototype Pollution Defense
- **Deficiency**: General advice to "freeze or validate keys" lacks concrete deserialization defenses.
- **ASVS L3 Requirement**:
  1. Safe `JSON.parse` reviver stripping `__proto__`, `constructor`, and `prototype` keys.
  2. Use `Object.create(null)` or native `Map` for arbitrary key-value stores to prevent prototype chain traversal.

---

### 2.4 SSRF & Network Hardening (OWASP API7)

#### A. Comprehensive IPv4 / IPv6 CIDR Blocklist
- **Deficiency**: Existing `sdlc_pipeline.md` (Line 56) and `AGENTS.md` (Line 52) list only `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254`. This misses critical ranges that permit cloud metadata extraction, container internal network access, and IPv6 bypasses.
- **Complete Enterprise Reserved/Private CIDR Specification**:
  - **IPv4**:
    - `0.0.0.0/8` (Current network / "this" host)
    - `10.0.0.0/8` (Private network - RFC 1918)
    - `100.64.0.0/10` (Carrier-Grade NAT - RFC 6598)
    - `127.0.0.0/8` (Loopback)
    - `169.254.0.0/16` (Link-Local & Cloud Metadata - includes `169.254.169.254`)
    - `172.16.0.0/12` (Private network - RFC 1918)
    - `192.0.0.0/24` (IETF Protocol Assignments)
    - `192.0.2.0/24` (TEST-NET-1)
    - `192.168.0.0/16` (Private network - RFC 1918)
    - `198.18.0.0/15` (Network Benchmark Tests)
    - `198.51.100.0/24` (TEST-NET-2)
    - `203.0.113.0/24` (TEST-NET-3)
    - `224.0.0.0/4` (Multicast)
    - `240.0.0.0/4` (Reserved / Future Use)
    - `255.255.255.255/32` (Broadcast)
  - **IPv6**:
    - `::/128` (Unspecified)
    - `::1/128` (Loopback)
    - `::ffff:0:0/96` (IPv4-mapped IPv6 addresses — used to bypass IPv4 filters)
    - `64:ff9b::/96` (IPv4/IPv6 translation)
    - `100::/64` (Discard-only)
    - `2001:db8::/32` (Documentation)
    - `fc00::/7` (Unique Local Addresses - ULA)
    - `fe80::/10` (Link-Local Unicast)
    - `ff00::/8` (Multicast)

#### B. DNS Rebinding & Time-of-Check to Time-of-Use (TOCTOU) Mitigation
- **Vulnerability**: Resolving a domain via `dns.lookup()`, validating its IP, and then calling `fetch(url)` leaves a race window where the attacker's authoritative DNS server returns a public IP on the first lookup and `169.254.169.254` on the second lookup.
- **Remediation**: Custom HTTP/HTTPS agent that resolves DNS, validates the IP against the CIDR blocklist, and connects directly to the validated IP address (pinning the socket), while maintaining the original `Host` header for TLS SNI and virtual hosting.

#### C. Protocol Whitelisting & Redirect Restraints
- Strictly enforce `http:` and `https:` protocols only. Block `file:`, `gopher:`, `ftp:`, `data:`, `dict:`, `ldap:`.
- Disable automatic HTTP redirects or re-execute the full IP validation loop on every redirect target.

---

### 2.5 Rate Limiting & DoS Hardening (OWASP API4)

#### A. Standard Response Headers
- **Deficiency**: `X-RateLimit-*` headers are non-standard and deprecated.
- **IETF RFC Standard Specification**:
  - `RateLimit-Limit`: Maximum allowed requests in the sliding window.
  - `RateLimit-Remaining`: Remaining request quota in the current window.
  - `RateLimit-Reset`: Number of seconds until the quota window resets.
  - `RateLimit-Policy`: Window configuration (e.g. `100;w=60`).
  - `Retry-After`: Seconds to wait when `429 Too Many Requests` is returned.

#### B. Multi-Tier Dual-Key Throttling
- Unauthenticated endpoints (Login, Register, Password Reset): Strict tier (`IP`, e.g. 5 requests/minute).
- Authenticated endpoints (API actions): Dual-key (`IP + UserID`, e.g. 120 requests/minute).
- Resource-intensive endpoints (Reports, PDF generation, Heavy Search): Strict dual-key (`IP + UserID`, e.g. 10 requests/minute).

#### C. Distributed State & Concurrency Safety
- Memory-based rate limiters fail across load-balanced clusters and serverless functions.
- In-memory counter increments suffer from TOCTOU race conditions.
- **Solution**: Atomic Sliding Window Counter via **Redis Sorted Sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`, `EXPIRE`) executed inside an atomic Lua script**.

---

### 2.6 Security Headers & Content Security Policy (ASVS V14)

#### A. Enterprise Security Header Suite
1. **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload` (2 years, all subdomains, HSTS preload list eligibility).
2. **Content-Security-Policy (CSP)**:
   - Nonce-based execution: `script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';`
   - Framing protection: `frame-ancestors 'none';` (modern ASVS replacement for `X-Frame-Options: DENY`)
   - Restrict base URI & form actions: `base-uri 'none'; form-action 'self';`
   - Object restriction: `object-src 'none';`
3. **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing).
4. **Referrer-Policy**: `strict-origin-when-cross-origin`.
5. **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()`.
6. **Cross-Origin Protections**:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`
   - `Cross-Origin-Resource-Policy: same-origin`

---

## 3. Production-Grade Remediation Code Examples

### 3.1 Distributed Sliding Window Rate Limiter (Atomic Redis Lua)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Atomic Redis Lua Script for Sliding Window Counter
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

-- Remove timestamps older than the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- Count current requests in the sliding window
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
  -- Add current request timestamp with microsecond nonce
  redis.call('ZADD', key, now, ARGV[4])
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
  return {1, limit - currentRequests - 1, math.ceil(window / 1000)}
else
  -- Rate limit exceeded; determine retry-after from oldest entry
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = 1
  if oldest[2] then
    retryAfter = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
    if retryAfter < 1 then retryAfter = 1 end
  end
  return {0, 0, retryAfter}
end
`;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const now = Date.now();
  const nonce = `${now}-${Math.random().toString(36).substring(2, 9)}`;
  const key = `ratelimit:${identifier}`;

  const [allowed, remaining, resetTime] = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    now,
    windowMs,
    limit,
    nonce
  )) as [number, number, number];

  if (allowed === 1) {
    return {
      allowed: true,
      limit,
      remaining,
      resetSeconds: resetTime,
    };
  }

  return {
    allowed: false,
    limit,
    remaining: 0,
    resetSeconds: resetTime,
    retryAfterSeconds: resetTime,
  };
}
```

---

### 3.2 Hardened SSRF & DNS-Pinning HTTP Client

```typescript
import http from 'http';
import https from 'https';
import dns from 'dns/promises';
import { isIP, BlockList } from 'net';
import { URL } from 'url';

// Comprehensive RFC CIDR Blocklist (IPv4 & IPv6)
const blocklist = new BlockList();

// IPv4 Private & Reserved Ranges
blocklist.addSubnet('0.0.0.0', 8, 'ipv4');        // Current network
blocklist.addSubnet('10.0.0.0', 8, 'ipv4');       // RFC 1918 Private
blocklist.addSubnet('100.64.0.0', 10, 'ipv4');    // RFC 6598 CGNAT
blocklist.addSubnet('127.0.0.0', 8, 'ipv4');      // Loopback
blocklist.addSubnet('169.254.0.0', 16, 'ipv4');   // Link-Local / Cloud Metadata
blocklist.addSubnet('172.16.0.0', 12, 'ipv4');    // RFC 1918 Private
blocklist.addSubnet('192.0.0.0', 24, 'ipv4');     // IETF Protocol Assignments
blocklist.addSubnet('192.0.2.0', 24, 'ipv4');     // TEST-NET-1
blocklist.addSubnet('192.168.0.0', 16, 'ipv4');   // RFC 1918 Private
blocklist.addSubnet('198.18.0.0', 15, 'ipv4');    // Benchmark Tests
blocklist.addSubnet('198.51.100.0', 24, 'ipv4');  // TEST-NET-2
blocklist.addSubnet('203.0.113.0', 24, 'ipv4');   // TEST-NET-3
blocklist.addSubnet('224.0.0.0', 4, 'ipv4');      // Multicast
blocklist.addSubnet('240.0.0.0', 4, 'ipv4');      // Reserved
blocklist.addAddress('255.255.255.255', 'ipv4');  // Broadcast

// IPv6 Private, Loopback, ULA & IPv4-Mapped Ranges
blocklist.addAddress('::', 'ipv6');               // Unspecified
blocklist.addAddress('::1', 'ipv6');              // Loopback
blocklist.addSubnet('::ffff:0:0', 96, 'ipv6');    // IPv4-mapped IPv6
blocklist.addSubnet('64:ff9b::', 96, 'ipv6');     // Translation
blocklist.addSubnet('100::', 64, 'ipv6');         // Discard
blocklist.addSubnet('2001:db8::', 32, 'ipv6');    // Documentation
blocklist.addSubnet('fc00::', 7, 'ipv6');         // Unique Local Address (ULA)
blocklist.addSubnet('fe80::', 10, 'ipv6');        // Link-Local
blocklist.addSubnet('ff00::', 8, 'ipv6');         // Multicast

export async function safeFetch(
  targetUrl: string,
  options: { method?: string; headers?: Record<string, string>; timeoutMs?: number; maxRedirects?: number } = {},
  redirectCount = 0
): Promise<{ status: number; body: string }> {
  if (redirectCount > (options.maxRedirects ?? 3)) {
    throw new Error('SSRF Guard: Max redirect limit reached.');
  }

  const parsedUrl = new URL(targetUrl);

  // 1. Strict Protocol Whitelist
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`SSRF Guard: Disallowed protocol '${parsedUrl.protocol}'. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsedUrl.hostname;

  // 2. Resolve DNS & Mitigate DNS Rebinding
  const ipType = isIP(hostname);
  let resolvedIp = hostname;

  if (ipType === 0) {
    const addresses = await dns.resolve(hostname);
    if (!addresses || addresses.length === 0) {
      throw new Error(`SSRF Guard: Unable to resolve hostname '${hostname}'.`);
    }
    resolvedIp = addresses[0];
  }

  const resolvedType = isIP(resolvedIp);
  const typeStr = resolvedType === 6 ? 'ipv6' : 'ipv4';

  // 3. Verify against Full Private/Reserved CIDR Blocklist
  if (blocklist.check(resolvedIp, typeStr)) {
    throw new Error(`SSRF Guard: Access to private/reserved IP '${resolvedIp}' (${hostname}) is strictly blocked.`);
  }

  // 4. Pin Socket Connection to Validated IP
  return new Promise((resolve, reject) => {
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const requestOptions = {
      host: resolvedIp, // Connect directly to validated IP (prevents TOCTOU DNS rebinding)
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        Host: hostname, // Maintain original hostname for Virtual Hosts & TLS SNI
      },
      servername: hostname, // For HTTPS SNI validation
      timeout: options.timeoutMs || 5000,
    };

    const req = requestModule.request(requestOptions, (res) => {
      // 5. Handle Redirects Safely (re-verify every hop)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const nextUrl = new URL(res.headers.location, targetUrl).toString();
        resolve(safeFetch(nextUrl, options, redirectCount + 1));
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 200, body: data }));
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('SSRF Guard: Request timed out.')); });
    req.end();
  });
}
```

---

### 3.3 Cryptographic Timing-Safe Comparison & Webhook Verification

```typescript
import crypto from 'crypto';

/**
 * Constant-time comparison for authentication tokens, HMAC signatures, and secrets.
 * Prevents side-channel timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // Prevent length-leakage attacks by comparing fixed-size hashes if lengths differ
  if (bufA.length !== bufB.length) {
    const dummyA = crypto.createHash('sha256').update(bufA).digest();
    const dummyB = crypto.createHash('sha256').update(bufB).digest();
    crypto.timingSafeEqual(dummyA, dummyB);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * HMAC-SHA256 signature verification for webhooks.
 */
export function verifyWebhookSignature(
  rawPayload: string | Buffer,
  signatureHeader: string,
  secretKey: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawPayload)
    .digest('hex');

  return timingSafeEqual(signatureHeader, expectedSignature);
}
```

---

### 3.4 Safe Prototype-Free JSON Parser & Sanitizer

```typescript
/**
 * Safe JSON Deserializer stripping prototype pollution vectors (__proto__, constructor, prototype).
 */
export function safeJsonParse<T = unknown>(jsonString: string): T {
  return JSON.parse(jsonString, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined; // Strips malicious prototype keys
    }
    return value;
  }) as T;
}

/**
 * Create a prototype-free dictionary object.
 */
export function createSafeMap<V = unknown>(): Record<string, V> {
  return Object.create(null);
}
```

---

### 3.5 Production Error Sanitization Layer (Zero Information Leakage)

```typescript
export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode?: number;
  internalDetails?: unknown; // Logged server-side, NEVER exposed to client
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly internalDetails?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.internalDetails = options.internalDetails;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializes error for client response, strictly stripping sensitive details in production.
   */
  public toClientResponse(isProduction = process.env.NODE_ENV === 'production') {
    return {
      error: {
        code: this.code,
        message: isProduction && this.statusCode === 500 ? 'Internal Server Error' : this.message,
        status: this.statusCode,
        ...((!isProduction && this.internalDetails) ? { details: this.internalDetails } : {}),
      },
    };
  }
}
```

---

## 4. Drop-In Text Enhancements

### 4.1 Drop-In Replacement for `owasp-security-and-rate-limiting/SKILL.md`

```markdown
---
name: owasp-security-and-rate-limiting
description: Strictest enterprise security auditing protocol based on OWASP ASVS Level 3, OWASP API Top 10 (2023), and NIST SSDF. Audits for Zero-Trust auth, BOLA/BFLA, token replay prevention, cryptography standards, defensive parsing, Anti-ReDoS, comprehensive SSRF CIDR blocking, rate limiting algorithms, security headers, and secret leakage.
---

# Enterprise Security & Rate Limiting Audit Protocol

This skill guides any agent or security auditor in performing strict, enterprise-grade security evaluations conforming to **OWASP ASVS Level 3**, **OWASP API Security Top 10 (2023)**, **NIST SP 800-218 (SSDF)**, and **Zero-Trust principles**.

---

## 1. The Strictest Security Checklist

### A. Authorization, Multi-Tenancy & BOLA/BFLA (ASVS V4, OWASP API1, API5)
* **Tenant-Scoped Queries**: All database queries must enforce tenant and user boundaries in the query predicate (e.g. `WHERE id = :id AND tenant_id = :tenantId`). Never query by object ID alone.
* **Unguessable Object IDs**: Prohibit sequential integer primary keys (`/orders/123`). Enforce cryptographically unguessable IDs (UUIDv4, ULID, KSUID).
* **Cloud DB & Firestore Update Invariant**:
  * For update operations on user-scoped collections, **BOTH** the existing document owner **AND** the incoming modified document owner must be validated:
    ```firestore
    allow update: if request.auth != null 
                  && resource.data.userId == request.auth.uid 
                  && request.resource.data.userId == request.auth.uid;
    ```
* **Broken Function Level Authorization (BFLA)**: Verify explicit role/permission checks on all privileged routes (`@RequirePermissions('admin:write')`). Block vertical privilege escalation via request body manipulation (`role: 'admin'`).
* **Session & Token Hardening (ASVS V3)**:
  * JWT access token expiration $\le 15\text{ minutes}$.
  * Single-use Refresh Token Rotation (RTR) with automatic family revocation on token reuse.
  * Unique `jti` nonce tracking in Redis to allow instant token revocation and prevent replay attacks.
  * Auth cookies must enforce `HttpOnly; Secure; SameSite=Strict; Path=/; __Host-` prefix.

### B. Cryptography & Anti-Tampering (ASVS V6, OWASP API2)
* **Timing-Safe Comparison**: Always use `crypto.timingSafeEqual()` with length-check padding for signatures, tokens, API keys, and HMAC verification.
* **Password Hashing**: Enforce **Argon2id** (memory $\ge 64\text{MB}$, time $\ge 3$, parallelism $\ge 4$), **bcrypt** (cost $\ge 12$), or **PBKDF2-SHA512** ($\ge 600,000$ iterations).
* **Webhook Signatures**: Validate external webhooks using **HMAC-SHA256** and timing-safe comparison.
* **CSPRNG**: Strictly mandate `crypto.randomBytes()` / `crypto.getRandomValues()`. Ban `Math.random()` for security contexts.

### C. Anti-ReDoS & Defensive Parsing (ASVS V5, OWASP API3)
* **Regex Catastrophic Backtracking**: Flag adjacent quantifiers `(a+)+`, nested groupings `([a-zA-Z]+)*`, overlapping alternations `(a|a)+`, and unanchored wildcards `.*.*`.
* **Execution Guards**: Use regex timeout guards ($\le 50\text{ms}$) or AST/deterministic parsers (`indexOf`, `startsWith`, Aho-Corasick) for structured text.
* **Schema Allowlisting**: Validate all incoming payloads with strict schemas (`z.object().strict()` / `strip()`). Reject untyped mass-assignment.
* **Prototype Pollution**: Use safe JSON revivers stripping `__proto__`, `constructor`, `prototype`. Use `Object.create(null)` or `Map` for dictionaries.

### D. SSRF & Network Hardening (OWASP API7)
* **Full CIDR Blocklist**: Block all IPv4 & IPv6 private/reserved ranges:
  * IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`.
  * IPv6: `::/128`, `::1/128`, `::ffff:0:0/96`, `64:ff9b::/96`, `100::/64`, `2001:db8::/32`, `fc00::/7`, `fe80::/10`, `ff00::/8`.
* **DNS Rebinding & TOCTOU Prevention**: Resolve DNS, validate IP against blocklist, and pin socket connection directly to validated IP with custom HTTP Agent.
* **Protocol Whitelist**: Restrict strictly to `http:` and `https:`. Reject `file:`, `gopher:`, `ftp:`, `data:`.

### E. Rate Limiting & Resource Exhaustion (OWASP API4)
* **Sliding Window Counter**: Enforce sliding window counter or token bucket via atomic Redis Lua scripts for distributed concurrency safety.
* **Multi-Tier Dual-Key Throttling**:
  * Unauthenticated: Strict IP-based throttling (e.g. 5 req/min on `/login`).
  * Authenticated: Combined `IP + UserID` throttling (e.g. 100 req/min).
* **Standard IETF Headers**: Return `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `RateLimit-Policy`, and `Retry-After` on `429 Too Many Requests`.

### F. Security Headers & Information Leakage (ASVS V7, V14)
* **Security Headers**:
  * `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  * `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none';`
  * `X-Content-Type-Options: nosniff`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  * `Cross-Origin-Opener-Policy: same-origin`
* **Zero Secret & Stack Leakage**: Ensure zero hardcoded credentials and sanitize error responses in production (`NODE_ENV === 'production'`) to eliminate stack trace or DB schema leakage.

---

## 2. Structured Security Audit Report

```markdown
# 🛡️ Enterprise Security Audit Report

## Overall Status: [ PASS | FAIL ]

### 1. Security Domain Compliance
- **Zero-Trust Auth & BOLA/BFLA Immunity**: [Pass / Fail]
- **Session, Token Hardening & RTR**: [Pass / Fail]
- **Cryptography & Constant-Time Operations**: [Pass / Fail]
- **Anti-ReDoS & Prototype Pollution**: [Pass / Fail]
- **SSRF CIDR Blocking & DNS Pinning**: [Pass / Fail]
- **Sliding Window Rate Limiting & Headers**: [Pass / Fail]
- **Security Headers & Error Sanitization**: [Pass / Fail]

### 2. Vulnerability Findings (if FAIL)
- **Severity**: [ CRITICAL | HIGH | MEDIUM | LOW ]
- **CWE / ASVS ID**: [e.g. CWE-918 / ASVS V12.6.1]
- **Vulnerability**: [Detailed description with File:Line]
- **Remediation**: [Exact drop-in code fix]
```
```

---

### 4.2 Drop-In Text Update for `sdlc_pipeline.md` (Gate 4) & `AGENTS.md` (Stage 4)

```markdown
### Stage 4: Enterprise Security & Rate Limiting Audit (Security Auditor Subagent)
* **OWASP ASVS Level 3 & OWASP API Top 10 (2023)**:
  * **Zero Trust & Authorization**: Enforce tenant-scoped queries (`WHERE tenant_id = :tenantId`), unguessable UUIDv4/ULID identifiers, BOLA/BFLA immunity, and Firestore dual-owner update invariants.
  * **Session & Token Hardening**: Enforce short-lived JWTs (<15m), Refresh Token Rotation (RTR), `jti` nonce replay tracking, and `__Host-` prefixed `HttpOnly; Secure; SameSite=Strict` cookies.
  * **Cryptography & Anti-Tampering**: Mandate constant-time comparison (`crypto.timingSafeEqual`), Argon2id/bcrypt password hashing, HMAC-SHA256 webhook signatures, and CSPRNG (`crypto.randomBytes`). Ban `Math.random()`.
  * **Input Parsing & Anti-ReDoS**: Strictly parse inputs with `.strict()` schemas; strip `__proto__`/`constructor` prototype pollution; audit regexes for catastrophic backtracking and enforce execution timeout guards.
  * **SSRF & Network Hardening**: Block all IPv4 (`0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`) and IPv6 (`::1`, `fc00::/7`, `fe80::/10`, `::ffff:0:0/96`) CIDR ranges. Enforce DNS pre-resolution and socket IP-pinning to defeat DNS rebinding.
  * **Rate Limiting & DoS Hardening**: Enforce Sliding Window Counter rate limiting via atomic Redis Lua scripts with dual-key (`IP + UserID`) throttling and standard IETF `RateLimit-*` / `Retry-After` headers.
  * **Security Headers & Information Leakage**: Enforce `HSTS preload`, nonce-based `CSP`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and zero error detail leakage in production.
  * **Secrets Check**: Zero hardcoded credentials, API keys, or private certificates.
```

---

### 4.3 Drop-In Text Update for `subagents/subagents.json` (`security_auditor`)

```json
{
  "name": "security_auditor",
  "description": "Enterprise Security Auditor subagent performing exhaustive audits against OWASP ASVS Level 3, OWASP API Top 10 (2023), Zero Trust (BOLA/BFLA), Token Lifecycle (RTR/jti), Cryptography (timingSafeEqual/Argon2id), Anti-ReDoS, Full-Range SSRF (IPv4/IPv6 DNS pinning), Distributed Sliding Window Rate Limiting, and Security Headers.",
  "role": "Enterprise Security Auditor"
}
```

---

## 5. Conclusion & Actionable Next Steps

1. **Immediate Skills Upgrade**: Deploy the drop-in enhancement to `owasp-security-and-rate-limiting/SKILL.md` (both plugin and workspace mirrors) to eliminate blind spots in SSRF, Cryptography, Token Rotation, and Rate Limiting.
2. **Rulebook Synchronization**: Update `sdlc_pipeline.md` and `AGENTS.md` Stage 4 definitions with the full IPv4/IPv6 CIDR blocklist, DNS-pinning mandate, and cryptographic requirements.
3. **Subagent Prompt Alignment**: Update `subagents.json` to equip the `security_auditor` subagent with comprehensive ASVS Level 3 verification scope.
