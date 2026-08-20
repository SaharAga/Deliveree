#!/usr/bin/env python3
"""
Deliveree — GitHub Project Board Alignment & Priority Script
Organizes items on Board #2 by target Statuses and Priorities.
"""

import os
import sys
import json
import urllib.request
import subprocess

PROJECT_OWNER = "SaharAga"
PROJECT_NUMBER = 2
ENV_LOCAL_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")

TASK_RULES = {
    # P0 Tasks -> Target Status: Done, Priority: P0 (All 12 P0 tasks completed and verified)
    "TASK-101": {"priority": "P0", "status": "Done"},
    "TASK-102": {"priority": "P0", "status": "Done"},
    "TASK-01": {"priority": "P0", "status": "Done"},
    "TASK-02": {"priority": "P0", "status": "Done"},
    "TASK-03": {"priority": "P0", "status": "Done"},
    "TASK-04": {"priority": "P0", "status": "Done"},
    "TASK-05": {"priority": "P0", "status": "Done"},
    "TASK-06": {"priority": "P0", "status": "Done"},
    "TASK-07": {"priority": "P0", "status": "Done"},
    "TASK-08": {"priority": "P0", "status": "Done"},
    "TASK-09": {"priority": "P0", "status": "Done"},
    "TASK-10": {"priority": "P0", "status": "Done"},

    # P1 Tasks -> Target Status: Backlog, Priority: P1
    "TASK-11": {"priority": "P1", "status": "Backlog"},
    "TASK-12": {"priority": "P1", "status": "Backlog"},
    "TASK-13": {"priority": "P1", "status": "Backlog"},
    "TASK-14": {"priority": "P1", "status": "Backlog"},
    "TASK-15": {"priority": "P1", "status": "Backlog"},

    # P2 Tasks -> Target Status: Backlog, Priority: P2
    "TASK-16": {"priority": "P2", "status": "Backlog"},
    "TASK-17": {"priority": "P2", "status": "Backlog"},
    "TASK-18": {"priority": "P2", "status": "Backlog"},
    "TASK-19": {"priority": "P2", "status": "Backlog"},
    "TASK-20": {"priority": "P2", "status": "Backlog"},

    # P3 Tasks -> Target Status: Backlog, Priority: P3
    "TASK-21": {"priority": "P3", "status": "Backlog"},
    "TASK-22": {"priority": "P3", "status": "Backlog"},
    "TASK-23": {"priority": "P3", "status": "Backlog"},
    "TASK-24": {"priority": "P3", "status": "Backlog"},
    "TASK-25": {"priority": "P3", "status": "Backlog"},
}

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
        "User-Agent": "Deliveree-Aligner"
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

def update_field(token, project_id, item_id, field_id, option_id):
    mutation = """
    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item {
          id
        }
      }
    }"""
    return run_query(token, mutation, {
        "input": {
            "projectId": project_id,
            "itemId": item_id,
            "fieldId": field_id,
            "value": {"singleSelectOptionId": option_id}
        }
    })

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
        print("Error: No GitHub token found.")
        sys.exit(1)

    print(f"🔍 Querying @{PROJECT_OWNER} Project #{PROJECT_NUMBER}...")
    data = run_query(token, """
    query($login: String!,$num: Int!) {
      user(login: $login) {
        projectV2(number: $num) {
          id
          title
          fields(first: 30) {
            nodes {
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
          items(first: 100) {
            nodes {
              id
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
              content {
                ... on DraftIssue { title }
                ... on Issue { title }
              }
            }
          }
        }
      }
    }""", {"login": PROJECT_OWNER, "num": PROJECT_NUMBER})

    project = data["user"]["projectV2"]
    project_id = project["id"]
    fields = project["fields"]["nodes"]
    items = project["items"]["nodes"]

    status_field = next((f for f in fields if f.get("name") and f.get("name").lower() == "status"), None)
    priority_field = next((f for f in fields if f.get("name") and f.get("name").lower() == "priority"), None)

    status_opts = {}
    if status_field:
        for opt in status_field.get("options", []):
            status_opts[opt["name"].lower()] = opt["id"]
            status_opts[opt["name"].lower().replace(" ", "")] = opt["id"]
            status_opts[opt["name"].lower().replace(" ", "_")] = opt["id"]

    priority_opts = {}
    if priority_field:
        for opt in priority_field.get("options", []):
            priority_opts[opt["name"].lower()] = opt["id"]
            priority_opts[opt["name"].lower().replace(" ", "")] = opt["id"]

    print(f"📋 Aligning {len(items)} items on Board '{project['title']}'...")

    for item in items:
        title = (item.get("content") or {}).get("title", "")
        if not title:
            continue
        
        # Check current status
        current_status = None
        for fv in item.get("fieldValues", {}).get("nodes", []):
            if fv.get("field", {}).get("name") == "Status":
                current_status = fv.get("name")

        # Match task rules
        matched = next((v for k, v in TASK_RULES.items() if k in title), None)
        target_p = matched["priority"] if matched else ("P0" if "P0" in title else "P1" if "P1" in title else "P2")
        target_st = matched["status"] if matched else "Backlog"

        # Update Status (if target is Done, or if not already in progress/done)
        if current_status and current_status.lower() == target_st.lower():
            print(f"  [ALREADY {current_status}] {title}")
        elif current_status and current_status.lower() in ["in progress"] and target_st.lower() != "done":
            print(f"  [PRESERVED STATUS: {current_status}] {title}")
        else:
            opt_id = (
                status_opts.get(target_st.lower())
                or status_opts.get("done")
                or status_opts.get("ready")
                or status_opts.get("todo")
                or status_opts.get("backlog")
            )
            if status_field and opt_id:
                try:
                    update_field(token, project_id, item["id"], status_field["id"], opt_id)
                    print(f"  [STATUS -> {target_st}] {title}")
                except Exception as e:
                    print(f"  [-] Status update failed for '{title}': {e}")

        # Update Priority Field if available
        if priority_field:
            p_opt = (
                priority_opts.get(target_p.lower())
                or priority_opts.get(f"p{target_p[-1]}")
                or priority_opts.get("high" if target_p == "P0" else "medium" if target_p == "P1" else "low")
            )
            if p_opt:
                try:
                    update_field(token, project_id, item["id"], priority_field["id"], p_opt)
                    print(f"  [PRIORITY -> {target_p}] {title}")
                except Exception as e:
                    print(f"  [-] Priority update failed for '{title}': {e}")

    print(f"\n🎉 Alignment finished! Check https://github.com/users/{PROJECT_OWNER}/projects/{PROJECT_NUMBER}")

if __name__ == "__main__":
    main()
