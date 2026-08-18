---
name: performance-and-chaos-stress
description: Comprehensive Performance, Web Vitals, Load Capacity, and Chaos Engineering protocol. Activate when auditing Core Web Vitals (LCP, INP, CLS), high-throughput client state updates, large dataset rendering (1,000+ items), offline PWA service worker resilience, or storage quota failure recovery.
inputs:
  - Component architecture, service workers, state stores, and rendering pipelines
outputs:
  - Performance & Chaos Stress Report with CWV metrics, load capacity benchmarks, and network resilience findings
---

# Performance, Web Vitals & Chaos Stress Protocol

This skill guides agents in subjecting applications to extreme synthetic stress, memory profiling, and adversarial network/storage chaos conditions.

---

## 1. Core Web Vitals (CWV) Targets & Budgets

Every page, modal, and route transition must meet strict real-user performance budgets:

| Metric | Target | Warning Threshold | Critical Failure | Audit Method |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | $< 800\text{ms}$ | $> 1200\text{ms}$ | $> 2500\text{ms}$ | DevTools Performance / Lighthouse |
| **INP** (Interaction to Next Paint) | $< 50\text{ms}$ | $> 100\text{ms}$ | $> 200\text{ms}$ | Event Timing / Long Tasks |
| **CLS** (Cumulative Layout Shift) | $= 0.00$ | $> 0.05$ | $> 0.10$ | Layout Shift API |
| **FID / TBT** (Total Blocking Time) | $< 50\text{ms}$ | $> 150\text{ms}$ | $> 300\text{ms}$ | CPU Profiler |
| **JS Bundle Size (Gzip)** | $< 180\text{KB}$ | $> 250\text{KB}$ | $> 500\text{KB}$ | Vite/Rollup Build Analyzer |

---

## 2. High-Load Capacity & Rendering Benchmarks

* **Dataset Stress Test**:
  * Synthetic injection of $1,000+$ active packages into the state management store.
  * Rapid multi-filter toggling (Status, Carrier, Free-Text Search) must maintain steady $60\text{fps}$ rendering without UI thread freeze.
* **Virtualization & Chunking**:
  * For lists $> 100$ items, verify windowing/virtualization or infinite lazy chunking (`content-visibility: auto`).
* **Garbage Collection & Allocation Profiling**:
  * Run 50 rapid modal open/close cycles and verify baseline heap returns to within $\pm 2\text{MB}$ of initial heap without linear drift.

---

## 3. Chaos Engineering & Offline Resilience

* **Spotty 3G & Packet Loss Simulation**:
  * Throttle network to Slow 3G ($500\text{Kbps}$ down, $400\text{ms}$ RTT, $5\%$ dropped packets).
  * Verify PWA Service Worker serves shell assets instantly and queues background operations gracefully.
* **Abrupt Disconnects**:
  * Kill network during an active Cloud Sync or package modification.
  * Verify state is committed to LocalStorage and marked as "Pending Sync", automatically reconciling upon network reconnection.
* **Storage Quota Depletion (Chaos Injection)**:
  * Fill LocalStorage to quota capacity (`DOMException: QuotaExceededError`).
  * Verify application alerts the user cleanly with export/backup options and does NOT throw uncaught promise rejections or white-screen crashes.

---

## 4. Performance & Chaos Review Template

```markdown
# ⚡ Performance, Web Vitals & Chaos Stress Report

## Overall Verdict: [ APPROVED | CHANGES REQUESTED ]

### 1. Core Web Vitals & Bundle Budgets
- **LCP Target (< 800ms)**: [Pass: Xms | Warning/Fail: Xms]
- **INP Target (< 50ms)**: [Pass: Xms | Long task at: component]
- **CLS Target (0.00)**: [Pass: 0.00 | Shift detected at: component]
- **Gzip Bundle Footprint**: [Pass: X KB | Exceeded: X KB]

### 2. High-Load Capacity (1,000+ Items)
- **Multi-Filter & Search Latency**: [Pass: < 16ms per frame | Lag detected]
- **Memory Heap Growth (50 cycles)**: [Pass: Stable | Memory leak detected at: file]

### 3. Chaos & Offline Resilience
- **Offline PWA Shell Load**: [Pass | White screen on offline reload]
- **QuotaExceeded Recovery**: [Pass | Unhandled error at: file]
```
