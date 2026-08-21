# 🛡️ Adversarial Review & QA Handoff Report (Round 2)

> [!WARNING] **Skepticism Disclaimer**
> High confidence in the state synchronization, unmount safety guards, edge-case error mappings, and 100% pass rate across the full 49-file testbench; real-world embedded webview OAuth behavior remains subject to vendor-specific third-party cookie partitioning policies.

---

## 1. What the prior attempt got wrong & newly uncovered edge cases

1. **Stale / Generic `'User'` Placeholder Overriding Live Google Display Name**:
   - **Input**: User was previously cached or initiated with fallback `name: 'User'` in `deliveree_auth_user_v1`, then completed Google OAuth login where `firebaseUser.displayName = 'Alexander The Great'`.
   - **Expected**: `buildCleanUserProfile` recognizes that `'User'` is a generic fallback and updates the user's profile with their real Google `displayName`.
   - **Actual**: `cached?.name || firebaseUser.displayName` treated `'User'` as truthy, permanently masking the user's authentic Google display name with `'User'`.
   - **Root Cause**: Missing check to differentiate custom user-defined names from default `'User'` placeholders.

2. **Ingestion Email Breakdown on Non-Latin / Hebrew Display Names**:
   - **Input**: User authenticated with Hebrew Google name (e.g., `'דנה כהן'`) and email `'dana.cohen.il@gmail.com'`.
   - **Expected**: Clean custom ingestion box (e.g. `danacohenil.pkg@in.deliveree.app`).
   - **Actual**: `cleanPrefix` sanitized Hebrew letters to `""` and immediately fell back to generic `user.pkg@in.deliveree.app`.
   - **Root Cause**: Missing email-prefix fallback in `cleanPrefix` before falling back to `'user'`.

3. **Memory Leaks and State Updates on Unmounted Auth Components**:
   - **Input**: User navigated away or unmounted `AuthProvider` while an asynchronous OAuth popup, redirect, or email authentication promise was in-flight.
   - **Expected**: In-flight promises abort or safely discard state mutations without throwing unmounted component warnings, and timers are cleared on unmount.
   - **Actual**: `syncTimerRef` was not cleared in an unmount cleanup effect, and `setUser`, `setLoading`, `setAuthError`, `setSyncStatus` were invoked without `isMountedRef` verification.
   - **Root Cause**: Missing `isMountedRef` lifecycle tracking and timer teardown on unmount.

4. **Unhandled Firebase Auth Error Codes in Mobile Safari & Strict Webviews**:
   - **Input**: User in iOS Safari Private Mode, strict enterprise browser, or embedded webview encountered `auth/credential-already-in-use`, `auth/web-storage-unsupported`, `auth/cookies-blocked`, `auth/timeout`, `auth/invalid-api-key`, `auth/app-deleted`, or `auth/invalid-auth-event`.
   - **Expected**: Clear, localized human error explaining storage/cookie requirements or credential conflicts.
   - **Actual**: Generic error code string `Authentication error (auth/web-storage-unsupported)`.
   - **Root Cause**: Incomplete error code mapping switch in `sanitizeAuthError`.

5. **Redirect Result Catch Handler Freezing App in Loading Skeleton**:
   - **Input**: `getRedirectResult(auth)` threw an unexpected runtime or network error on mount.
   - **Expected**: `loading` is set to `false` and error is displayed.
   - **Actual**: `setLoading(false)` was only called inside `.then()` and omitted in `.catch()`, potentially leaving the app frozen in the cold-start skeleton if `onAuthStateChanged` was also delayed.
   - **Root Cause**: Missing `setLoading(false)` in `getRedirectResult.catch()`.

---

## 2. What I changed

- **`src/context/AuthContext.jsx`**:
  - Implemented `isMountedRef` lifecycle guard across all asynchronous state updates (`getRedirectResult`, `onAuthStateChanged`, `executeOAuthSignIn`, `loginWithEmail`, `registerWithEmail`, `resetPassword`, `deleteUserAccountAndData`, `logout`, `triggerCloudSync`).
  - Added dedicated unmount cleanup effect to clear `syncTimerRef`.
  - Refined `buildCleanUserProfile` to prioritize: `customName` → non-placeholder `cached.name` → live `firebaseUser.displayName` → email prefix → `'User'`.
  - Added email-prefix fallback for non-Latin / Hebrew display names in `ingestionEmail` creation.
  - Added comprehensive Hebrew and English error translations in `sanitizeAuthError` for: `auth/credential-already-in-use`, `auth/web-storage-unsupported`, `auth/cookies-blocked`, `auth/timeout`, `auth/invalid-api-key`, `auth/app-deleted`, `auth/internal-error`, `auth/invalid-auth-event`.
  - Added `setLoading(false)` in `getRedirectResult.catch()` to guarantee the app never hangs in loading state.
  - Expanded `executeOAuthSignIn` redirect fallback to trigger on `auth/web-storage-unsupported` and storage-blocking webviews.

- **`src/context/AuthContext.googleAuth.test.jsx`**:
  - Added unit tests for Google displayName prioritization over `'User'` placeholder.
  - Added unit tests for Hebrew display name ingestion email generation.
  - Added tests for `auth/credential-already-in-use`, `auth/web-storage-unsupported`, `auth/cookies-blocked`, `auth/timeout`, `auth/internal-error`.
  - Added unit tests for multi-user storage partition isolation.

- **`src/context/AuthContext.realAuth.test.jsx`**:
  - Added test coverage for miscellaneous auth error codes and raw string regex extraction.

---

## 3. Verification Record

- **Deep Verification (ran actual test suite):**
  - `npm test` (`vitest run`): **49 test files passed (49/49)**, **368 tests passed (368/368)**, 0 failures.
  - `npx oxlint -D warnings --deny-warnings`: **0 errors, 0 warnings**.
  - `grep -rn "expect(true).toBe(true)\|expect(1).toBe(1)" src/`: **Clean** (0 anti-facade matches).
  - `grep -rn "it\.skip\|test\.skip\|xit\|xtest\|xdescribe" src/`: **Clean** (0 skipped tests).
  - `npm run build` (`vite build`): Built production bundle cleanly in 417ms.

- **Shallow Verification (manual only):**
  - Verified visual markup and fallback handling in `Navbar`, `SideNavDrawer`, `AuthModal`, and `AccountModal`.
  - Verified RTL/LTR layout stability for English and Hebrew auth screens.

- **Unverified aspects:**
  - Live OAuth roundtrip to Google production identity servers on real physical iOS Safari hardware (verified via synthetic integration tests and Firebase Auth mocks).

---

## 4. Known Issues

- `Minor Robustness Risk`: Highly restrictive in-app browsers (e.g. TikTok / Instagram webviews) that block both popups and cross-origin redirects require users to open the app in default system browser (Chrome/Safari).

---

## 5. Remaining risk & next step

The Google Authentication lifecycle, session persistence, UI transitions, multi-user storage partition isolation, error resilience, and unmount lifecycle safety have been verified and passed all quality gates. The task is complete.
