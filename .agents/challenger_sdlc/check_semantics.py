import os, re

paths = {
    'plugin.json': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/plugin.json',
    'sdlc_pipeline.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/rules/sdlc_pipeline.md',
    'plugin/sdlc-orchestrator': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/sdlc-orchestrator/SKILL.md',
    'plugin/software-development-standards': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md',
    'plugin/automated-code-review': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md',
    'plugin/owasp-security-and-rate-limiting': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/owasp-security-and-rate-limiting/SKILL.md',
    'plugin/software-verification-and-qa': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-verification-and-qa/SKILL.md',
    'AGENTS.md': '/home/sahar/Deliveree/AGENTS.md',
    'subagents.json': '/home/sahar/Deliveree/.agents/subagents/subagents.json',
    'workspace/sdlc-orchestrator': '/home/sahar/Deliveree/.agents/skills/sdlc-orchestrator/SKILL.md',
    'workspace/software-development-standards': '/home/sahar/Deliveree/.agents/skills/software-development-standards/SKILL.md',
    'workspace/automated-code-review': '/home/sahar/Deliveree/.agents/skills/automated-code-review/SKILL.md',
    'workspace/owasp-security-and-rate-limiting': '/home/sahar/Deliveree/.agents/skills/owasp-security-and-rate-limiting/SKILL.md',
    'workspace/software-verification-and-qa': '/home/sahar/Deliveree/.agents/skills/software-verification-and-qa/SKILL.md',
    'workspace/remote-notifications-and-chat': '/home/sahar/Deliveree/.agents/skills/remote-notifications-and-chat/SKILL.md',
}

files = {k: open(v).readlines() for k, v in paths.items()}

# Let's inspect semantic claims
# 1. Arch report:
# "sdlc-orchestrator/SKILL.md (Plugin lines 32, 47, 61, 75) instructs the Orchestrator to prompt subagents with `Activate the <skill-name> skill`."
p_orch = files['plugin/sdlc-orchestrator']
print("Plugin sdlc-orchestrator lines 32, 47, 61, 75:")
for lno in [32, 47, 61, 75]:
    print(f"  Line {lno}: {p_orch[lno-1].strip() if lno <= len(p_orch) else 'EOF'}")

# 2. Arch report:
# "remote-notifications-and-chat registered in AGENTS.md:84"
agents_md = files['AGENTS.md']
print(f"AGENTS.md Line 84: {agents_md[83].strip() if len(agents_md) >= 84 else 'EOF'}")

# 3. Security report:
# "owasp-security-and-rate-limiting Lines 18-23: Focuses specifically on Firestore update security rules"
owasp = files['plugin/owasp-security-and-rate-limiting']
print("OWASP Lines 18-23:")
for idx, l in enumerate(owasp[17:23], start=18):
    print(f"  Line {idx}: {l.strip()}")

# 4. Scale report:
# "automated-code-review L3: Frontmatter mentions N+1 queries"
acr = files['plugin/automated-code-review']
print(f"ACR Line 3: {acr[2].strip()}")

# "automated-code-review L16-23: Only mentions basic nested .map() + .find()"
print("ACR Lines 16-23:")
for idx, l in enumerate(acr[15:23], start=16):
    print(f"  Line {idx}: {l.strip()}")

# 5. Orch report:
# "sdlc-orchestrator Lines 28-29, 45-46, 61-62, 77-78: TypeName: developer / code_reviewer / security_auditor / qa_verifier"
w_orch = files['workspace/sdlc-orchestrator']
print("Workspace sdlc-orchestrator lines 28-29, 45-46, 61-62, 77-78:")
for lno in [28, 29, 45, 46, 61, 62, 77, 78]:
    print(f"  Line {lno}: {w_orch[lno-1].strip() if lno <= len(w_orch) else 'EOF'}")
