import re
import os
import json
import yaml

TARGET_PATHS = {
    'plugin.json': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/plugin.json',
    'sdlc_pipeline.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/rules/sdlc_pipeline.md',
    'sdlc-orchestrator/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/sdlc-orchestrator/SKILL.md',
    'sdlc-orchestrator': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/sdlc-orchestrator/SKILL.md',
    'software-development-standards/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md',
    'software-development-standards': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md',
    'automated-code-review/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md',
    'automated-code-review': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md',
    'owasp-security-and-rate-limiting/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/owasp-security-and-rate-limiting/SKILL.md',
    'owasp-security-and-rate-limiting': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/owasp-security-and-rate-limiting/SKILL.md',
    'software-verification-and-qa/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-verification-and-qa/SKILL.md',
    'software-verification-and-qa': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-verification-and-qa/SKILL.md',
    'AGENTS.md': '/home/sahar/Deliveree/AGENTS.md',
    'subagents.json': '/home/sahar/Deliveree/.agents/subagents/subagents.json',
    'remote-notifications-and-chat/SKILL.md': '/home/sahar/Deliveree/.agents/skills/remote-notifications-and-chat/SKILL.md',
    'remote-notifications-and-chat': '/home/sahar/Deliveree/.agents/skills/remote-notifications-and-chat/SKILL.md'
}

def resolve_target(fn):
    fn_clean = fn.strip('`()[]')
    if os.path.isabs(fn_clean) and os.path.exists(fn_clean):
        return fn_clean
    basename = os.path.basename(fn_clean)
    for k, v in TARGET_PATHS.items():
        if fn_clean == k or fn_clean.endswith(k) or basename == os.path.basename(v) or fn_clean in v:
            return v
    return None

def verify_file_citations(report_path):
    content = open(report_path).read()
    pattern = r'([`\(]?([a-zA-Z0-9_\-\.\/]+)[:#](\d+)(?:-(\d+))?[`\)]?)'
    matches = re.findall(pattern, content)
    
    results = []
    print(f"\n=======================================================")
    print(f"Auditing citations in: {report_path}")
    print(f"Total raw matches: {len(matches)}")
    
    valid_count = 0
    invalid_count = 0
    skipped_count = 0
    
    for raw_full, fn, start_str, end_str in matches:
        start_line = int(start_str)
        end_line = int(end_str) if end_str else start_line
        
        resolved = resolve_target(fn)
        if not resolved:
            # Check if this looks like a target artifact
            if any(k in fn for k in ['plugin.json', 'sdlc', 'AGENTS', 'subagents', 'SKILL', 'software', 'owasp', 'automated']):
                print(f"  [UNRESOLVED TARGET] {fn}:{start_line}-{end_line} (raw: {raw_full})")
                invalid_count += 1
            else:
                skipped_count += 1
            continue
            
        file_lines = open(resolved).readlines()
        total_lines = len(file_lines)
        
        if 1 <= start_line <= total_lines and 1 <= end_line <= total_lines and start_line <= end_line:
            valid_count += 1
            # print(f"  [VALID] {fn}:{start_line}-{end_line} in {os.path.basename(resolved)} (total {total_lines} lines)")
        else:
            print(f"  [OUT OF BOUNDS] {fn}:{start_line}-{end_line} in {os.path.basename(resolved)} (total {total_lines} lines)")
            invalid_count += 1
            
    print(f"Summary for {os.path.basename(report_path)}: Valid={valid_count}, Invalid={invalid_count}, Skipped non-targets={skipped_count}")
    return valid_count, invalid_count

reports_to_check = [
    '/home/sahar/Deliveree/.agents/orchestrator/SDLC_FRAMEWORK_EVALUATION.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
    '/home/sahar/Deliveree/.agents/challenger_sdlc/report.md',
    '/home/sahar/Deliveree/.agents/auditor_sdlc/report.md'
]

total_valid = 0
total_invalid = 0
for r in reports_to_check:
    if os.path.exists(r):
        v, inv = verify_file_citations(r)
        total_valid += v
        total_invalid += inv

print(f"\n=======================================================")
print(f"GRAND TOTAL CITATIONS: Valid={total_valid}, Invalid={total_invalid}")
