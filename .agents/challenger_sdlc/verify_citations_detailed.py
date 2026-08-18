import os, re, json

# Load all files
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

reports = {
    'arch': '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    'sec': '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    'scale': '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    'orch': '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
}

print("=== DETAILED CITATION AUDIT ===")

# For each report, extract section 1/line-cited section and check all claims
for r_name, r_path in reports.items():
    print(f"\n=======================================================")
    print(f"REPORT: {r_name.upper()}")
    print(f"=======================================================")
    with open(r_path) as f:
        text = f.read()
        lines = text.splitlines()

    # Find citations in text
    for i, line in enumerate(lines):
        # Look for patterns like `Artifact X`, `Lines X-Y`, `file.md:line`
        m = re.findall(r'(\b[a-zA-Z0-9_\-\./]+\.(?:md|json|ts|js|py)?(?::\d+(?:[-–]\d+)?)?|\b[Ll]ines?\s+\d+(?:\s*[-–]\s*\d+)?)', line)
        if m and any(k in line for k in ['Critique', 'Line', 'Artifact', 'SKILL', 'AGENTS', 'subagents', 'plugin']):
            print(f"Line {i+1:4d}: {line.strip()[:110]}")
