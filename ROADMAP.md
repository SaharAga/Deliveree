# Deliveree Engineering & Monetization Roadmap

## Overview
Deliveree is an AI-powered Personal Inbound Package & Online Order Management Assistant for consumers.

---

## 🎯 Epics & Engineering Backlog

### [EPIC 1] Architecture, Security & Agent Hardening (Priority: P0)
- [ ] **TASK-101: Restrict Firestore Rules (RBAC & User UID Scoping)**
  - *Goal:* Lock down `firestore.rules` so authenticated users can only read/write their own orders (`request.auth.uid == resource.data.userId`).
- [ ] **TASK-102: Runtime Schema Validation with Zod**
  - *Goal:* Replace blind type assertions (`doc.data() as T`) with strict Zod schemas on all package/order ingress.
- [ ] **TASK-103: Agent Concurrency & File Locking**
  - *Goal:* Add file locking (`fcntl`) to `.agents/inbox.jsonl` and enforce a hard circuit breaker of max 2 turns on multi-agent debate loops.
- [ ] **TASK-104: PII Sanitization Pipeline**
  - *Goal:* Strip full addresses, phone numbers, and payment details before saving package metadata; retain abstracted category attributes only.

### [EPIC 2] Inbound Package Ingress & Tracking Engine (Phase 1 Core)
- [ ] **TASK-201: Universal Carrier Tracking Aggregator**
  - *Goal:* Integrate multi-carrier tracking endpoints (Israel Post, DHL, FedEx, UPS, 17Track).
- [ ] **TASK-202: Email Order Receipt Parser**
  - *Goal:* Implement an AI/regex parser for incoming order receipts (Amazon, AliExpress, ASOS, Shein) extracting tracking IDs and product names.
- [ ] **TASK-203: Interactive Package Timeline & Live ETA Visualizer**
  - *Goal:* Build a clean, responsive UI component showing shipment milestones, carrier status, and predicted arrival dates.

### [EPIC 3] Contextual Commerce & Affiliate Engine (Phase 1 Monetization)
- [ ] **TASK-301: Product Category Classifier**
  - *Goal:* Build an NLP classifier that maps package items to commercial consumer categories (e.g., "espresso machine", "running shoes").
- [ ] **TASK-302: Affiliate API Integration (Amazon Associates / Networks)**
  - *Goal:* Fetch complementary accessories and discount codes based on classified product categories.
- [ ] **TASK-303: Sensitive Category Blacklist**
  - *Goal:* Automatically suppress recommendations for medical, pharmaceutical, and private items.
- [ ] **TASK-304: Native Accessory Recommendation UI Card**
  - *Goal:* Embed contextual product recommendation cards inside the active package view with click/conversion tracking.

### [EPIC 4] Automated Claims & Late Delivery Compensation (Phase 2 Monetization)
- [ ] **TASK-401: Delivery SLA Breach Detector**
  - *Goal:* Monitor carrier promised arrival dates vs. actual deliveries to detect compensable delays.
- [ ] **TASK-402: Automated Dispute & Refund Draft Generator**
  - *Goal:* Generate structured refund request drafts for late Amazon/carrier deliveries with 1-click user confirmation (HITL).
