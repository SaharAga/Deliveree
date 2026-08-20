# Deliveree Engineering Roadmap & Architecture

## 1. Product Vision & Architecture Overview
Deliveree is a modern, privacy-conscious, multi-carrier package tracking Progressive Web App (PWA) designed for Israeli and global e-commerce consumers. It unifies order updates across Israeli couriers (Israel Post, Cheetah Delivery, HFD, BoxIt) and global shipping networks (AliExpress Cainiao, YunExpress, 4PX, DHL, FedEx, UPS, USPS, Royal Mail, Aramex, Yanwen) into an intuitive, bilingual (Hebrew RTL / English LTR), cloud-synchronized experience.

### Multi-Agent Governance & SDLC Structure
The codebase is developed and maintained using an autonomous **3-Squad Topology** and **7-Stage Quality Gate Pipeline** (defined in AGENTS.md):
- **Squad A: Feature Development Squad** (ui_ux_specialist, auth_cloud_specialist, delivery_pipeline_specialist, pwa_offline_specialist, feedback_telemetry_specialist)
- **Squad B: High-Assurance Verification Squad** (property_test_eng, formal_invariant_eng, testability_bist_eng, qa_build_verifier)
- **Squad C: Adversarial & Red Team Squad** (adversarial_pentester, chaos_resilience_eng, compliance_auditor)

---

## 2. Sprint Roadmap



---

## 3. Sprint Breakdown & Milestones

### Sprint 1: Architecture & Security Hardening (Completed — v0.2.1)
- [x] **TASK-101: Data Integrity & Schema Validation Layer**
- [x] **TASK-102: Multi-Tier Authentication & Firestore Adapter**

### Sprint 2: Multi-Carrier Auto-Tracking & State Transitions (Completed — v0.2.2)
- [x] **TASK-201: Multi-Carrier Resolution Engine & Rate-Limiting Cache**
- [x] **TASK-202: Israeli & Global Couriers Direct Parsers**
- [x] **TASK-203: State Machine Transition Pipeline & UI Controls**

### Sprint 3: Smart Notifications, Offline & Export (Active — v0.4.1 -> v0.5.0)
- [x] **TASK-301: Dedicated Export Center & Extended Courier Support** (Completed — v0.4.0)
- [x] **TASK-302: Navbar & Triage Ergonomics Cleanup** (Completed — v0.4.1)
- [ ] **TASK-303: Web Push Notifications via Service Worker** (Active)
- [ ] **TASK-304: Telegram User Notification Bridge** (Active)
- [ ] **TASK-305: Advanced PWA Offline Storage (IndexedDB Migration)** (Planned)
- [ ] **TASK-306: Service Worker Background Sync API** (Planned)

### Sprint 4: AI Smart Ingestion & Omnichannel Ecosystem (Planned — v0.6.0)
- [ ] **TASK-401: Gemini AI Smart Ingestion Engine** (Planned)
- [ ] **TASK-402: Gmail OAuth Integration** (Planned)
- [ ] **TASK-403: Inbound Email Delivery Webhook Parser** (Planned)
- [ ] **TASK-404: Multilingual Checkpoint Translation Engine** (Planned)

---

## 4. Quality Gates & Definition of Done (DoD)
All features must strictly pass the 7-Stage SDLC Pipeline before merging.
