#!/usr/bin/env python3
"""
Deliveree — Automated GitHub Project Board Sync Script
Syncs 25 engineering tasks into GitHub Project Board #2 (https://github.com/users/SaharAga/projects/2).
"""

import os
import sys
import json
import urllib.request
import subprocess

PROJECT_OWNER = "SaharAga"
PROJECT_NUMBER = 2
ENV_LOCAL_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")

TASKS = [
    # --- P0 Tasks ---
    {"title": "[TASK-01-SEC] Revoke Compromised Tokens & Enforce Secret Scanning", "body": "Revoke exposed Telegram token, purge Git history with git-filter-repo, configure Gitleaks pre-commit hook.", "status": "Todo"},
    {"title": "[TASK-02-CI] Fix Failing Vitest & Fast-Check Test Suite", "body": "Diagnose and fix the 4 failing annotations in Vitest run #32270652036. Verify all Zod 4 schemas and fast-check tests.", "status": "Todo"},
    {"title": "[TASK-03-AUTH] Production Firebase Authentication & Strong Password Policy", "body": "Implement Google & Apple SSO, strong password validator with live entropy meter, and email verification.", "status": "Todo"},
    {"title": "[TASK-04-GUEST] Anonymous Guest Mode & Non-Destructive Account Linking", "body": "Enable signInAnonymously and linkWithCredential to migrate guest deliveries to permanent UID with zero data loss.", "status": "Todo"},
    {"title": "[TASK-05-PRIVACY] Anti-Profiling Sanitization & Client-Side Hashing", "body": "Strip store PII from telemetry, hash parcel IDs with local salt, and enforce per-UID Firestore security rules.", "status": "Todo"},
    {"title": "[TASK-06-EXPORT] User-Friendly Data Export (Excel/CSV/PDF) & GDPR Wipe", "body": "Implement Excel (.xlsx) export as default, CSV & PDF, and full account deletion with confirmation.", "status": "Todo"},
    {"title": "[TASK-07-UI-SHELL] Solid Slide-Over Navigation Drawer (Option 1C)", "body": "Build opaque slide-over drawer (bg-slate-900) with profile card, quick links, and resolve mobile opacity bug.", "status": "Todo"},
    {"title": "[TASK-08-UI-DASH] Dashboard with Grid / List Toggle (Option 2)", "body": "Implement top toggle for Rich Cards (2A) vs Compact Feed (2C) with stage filter tabs.", "status": "Todo"},
    {"title": "[TASK-09-UI-PASTE] 1-Click Auto-Detect Bottom Sheet (Option 3A)", "body": "Floating + button opens sheet, ephemerally reads clipboard in memory, detects tracking format and adds parcel.", "status": "Todo"},
    {"title": "[TASK-10-UI-TIMELINE] Vertical Milestone Step-Tracker Sheet (Option 4A)", "body": "Vertical interconnected timeline, unmaskable locker code card, and 1-click external courier links.", "status": "Todo"},

    # --- P1 Tasks ---
    {"title": "[TASK-11-CARRIER] Universal Carrier Normalizer & Idempotence Engine", "body": "Regex & Checksum for Israel Post, DHL, UPS, FedEx, Chita, Cainiao, USPS, Boxit, HFD with fast-check validation.", "status": "Backlog"},
    {"title": "[TASK-12-STORE] Store Identification & Visual Branding", "body": "Store logo detector & badge components for Amazon, AliExpress, iHerb, ASOS, Farfetch, Zara, Nike, Crossrope.", "status": "Backlog"},
    {"title": "[TASK-13-PUSH] Direct Web Push Notifications (FCM / Service Worker)", "body": "Configure FCM Web Push to deliver instant status transition alerts directly to mobile/desktop.", "status": "Backlog"},
    {"title": "[TASK-14-SHORTCUTS] PWA App Shortcuts & Web Share Target", "body": "Manifest app shortcuts (Paste Tracking, Locker Pickups) and SMS share target handler.", "status": "Backlog"},
    {"title": "[TASK-15-STATS] Personal Analytics Dashboard & Multi-Currency", "body": "Delivery duration analytics, active shipment stats, and multi-currency cost tracker (ILS/USD/EUR).", "status": "Backlog"},

    # --- P2 Tasks ---
    {"title": "[TASK-16-CACHE] 4-Tier High-Performance Caching & Delta Sync", "body": "SWR in-memory, IndexedDB snapshot with TTL, and Firestore Delta Sync (query only modified docs).", "status": "Backlog"},
    {"title": "[TASK-17-THROTTLE] Graduated Throttling, Anti-Bot & Firebase App Check", "body": "Progressive backoff on high volume, temporary suspension with appeal link, and App Check integration.", "status": "Backlog"},
    {"title": "[TASK-18-OFFLINE] Offline-First Resilience & Sync Queue", "body": "Firestore offline persistence and atomic background mutation queue upon reconnection.", "status": "Backlog"},
    {"title": "[TASK-19-MAPS] Interactive Locker & Service Point Map (Waze/Google Maps)", "body": "Interactive map for locker location with opening hours, phone, and 1-click Waze/Google Maps routing.", "status": "Backlog"},
    {"title": "[TASK-20-BIST] Client-Side BIST Diagnostics & Telemetry", "body": "Periodic storage I/O, regex benchmark, and memory health checks with scrubbed telemetry alerts.", "status": "Backlog"},

    # --- P3 Tasks ---
    {"title": "[TASK-21-CUSTOMS] $75 Customs Threshold Monitor & Tax Alerts", "body": "Aggregate orders within 72h from same store to alert user before exceeding the $75 tax-free limit.", "status": "Backlog"},
    {"title": "[TASK-22-RETURN] Return Window Countdown & Return Label Vault", "body": "Countdown timer for return eligibility window and return shipping waybill vault.", "status": "Backlog"},
    {"title": "[TASK-23-SCANNER] Camera Barcode & Label OCR Scanner", "body": "Browser native BarcodeDetector API for instant packaging label scanning via phone camera.", "status": "Backlog"},
    {"title": "[TASK-24-EMAIL] Smart Email Ingestion Integration", "body": "Automated tracking number extraction from courier notification emails (Gmail / Outlook).", "status": "Backlog"},
    {"title": "[TASK-25-COURIER] Courier Interaction Hub (WhatsApp Quick Replies & Proxy)", "body": "1-Click WhatsApp replies (safe place, gate code, neighbor), delivery cheat-sheet, and pickup proxy letter.", "status": "Backlog"}
]

def load_env_local():
    """Load environment variables from .env.local if present."""
    if os.path.exists(ENV_LOCAL_FILE):
        with open(ENV_LOCAL_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

def run_query(token, query, variables=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Deliveree-Project-Sync/1.0"
    }
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": query, "variables": variables or {}}).encode("utf-8"),
        headers=headers
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        if "errors" in res:
            raise Exception(res["errors"])
        return res["data"]

def main():
    load_env_local()
    
    token = None
    try:
        token = subprocess.run(["gh", "auth", "token"], stdout=subprocess.PIPE, text=True, check=True).stdout.strip()
    except Exception:
        pass
    
    if not token:
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    
    if not token:
        print("Error: No GitHub token found via `gh auth token` or GITHUB_TOKEN environment variable.")
        sys.exit(1)

    print(f"🚀 Fetching metadata for @{PROJECT_OWNER} Project #{PROJECT_NUMBER}...")
    project_data = run_query(token, """
    query($login: String!, $num: Int!) {
      user(login: $login) {
        projectV2(number: $num) {
          id
          title
          fields(first: 30) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
          items(first: 100) {
            nodes {
              id
              content {
                ... on DraftIssue {
                  title
                }
                ... on Issue {
                  title
                }
              }
            }
          }
        }
      }
    }""", {"login": PROJECT_OWNER, "num": PROJECT_NUMBER})

    project = project_data.get("user", {}).get("projectV2")
    if not project:
        print("[-] Error: Project not found.")
        sys.exit(1)

    project_id = project["id"]
    project_title = project.get("title", f"Project #{PROJECT_NUMBER}")
    print(f"✅ Found Board: '{project_title}' (ID: {project_id})")

    # Find Status field & options
    status_field = next((f for f in project["fields"]["nodes"] if f.get("name") and f.get("name").lower() == "status"), None)
    status_map = {}
    if status_field and "options" in status_field:
        for opt in status_field["options"]:
            status_map[opt["name"].lower()] = opt["id"]
            status_map[opt["name"].lower().replace(" ", "")] = opt["id"]
            status_map[opt["name"].lower().replace(" ", "_")] = opt["id"]

    # Deduplicate against existing board items
    existing_titles = set()
    for item in project.get("items", {}).get("nodes", []):
        content = item.get("content")
        if content and "title" in content:
            existing_titles.add(content["title"].strip())

    print(f"📋 Found {len(existing_titles)} existing items on board.")
    print(f"Syncing {len(TASKS)} tasks into GitHub Project #{PROJECT_NUMBER}...\n")

    synced = 0
    skipped = 0

    for idx, t in enumerate(TASKS, 1):
        if t["title"] in existing_titles:
            print(f"  [{idx:02d}/{len(TASKS):02d}] ⏭️  Skipping existing: {t['title']}")
            skipped += 1
            continue

        try:
            # addProjectV2DraftIssue returns projectItem
            add_res = run_query(token, """
            mutation($input: AddProjectV2DraftIssueInput!) {
              addProjectV2DraftIssue(input: $input) {
                projectItem {
                  id
                }
              }
            }""", {"input": {"projectId": project_id, "title": t["title"], "body": t["body"]}})

            item_id = add_res["addProjectV2DraftIssue"]["projectItem"]["id"]

            # Update status field if available
            target_status = t["status"].lower()
            target_opt = (
                status_map.get(target_status)
                or status_map.get("todo")
                or status_map.get("backlog")
                or (list(status_map.values())[0] if status_map else None)
            )

            if status_field and target_opt and item_id:
                try:
                    run_query(token, """
                    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
                      updateProjectV2ItemFieldValue(input: $input) {
                        projectV2Item {
                          id
                        }
                      }
                    }""", {"input": {"projectId": project_id, "itemId": item_id, "fieldId": status_field["id"], "value": {"singleSelectOptionId": target_opt}}})
                except Exception as update_err:
                    print(f"    ⚠️ Warning: status field update skipped for {t['title']} ({update_err})")

            print(f"  [{idx:02d}/{len(TASKS):02d}] ➕ Added: {t['title']} ({t['status']})")
            synced += 1
        except Exception as e:
            print(f"  [{idx:02d}/{len(TASKS):02d}] ❌ Failed: {t['title']} -> {e}")

    print(f"\n🎉 Done! {synced} tasks added, {skipped} up-to-date.")
    print(f"🔗 View Board: https://github.com/users/{PROJECT_OWNER}/projects/{PROJECT_NUMBER}")

if __name__ == "__main__":
    main()
