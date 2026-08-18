import os, re, json

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

def audit_report(report_path):
    with open(report_path) as f:
        lines = f.readlines()
    
    print(f"\n=======================================================")
    print(f"AUDITING: {report_path}")
    print(f"=======================================================")
    
    for idx, line in enumerate(lines):
        # find references to lines
        matches = re.finditer(r'(?:(?:Lines?|lines?)\s+(\d+)(?:\s*[-–—]\s*(\d+))?|([A-Za-z0-9_\-\./]+):(\d+)(?:[-–—](\d+))?)', line)
        for m in matches:
            text_match = m.group(0)
            # context of previous/surrounding lines to know which file
            context = "".join(lines[max(0, idx-5):idx+1])
            # print match with line number in report
            # print(f"  Report line {idx+1}: {text_match}  || Context snippet: {line.strip()[:80]}")

for r in [
    '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md'
]:
    audit_report(r)
