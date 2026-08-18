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

# Let's inspect citations in each report
citations_to_check = [
    # Report 1 (Arch)
    ('arch', 'plugin.json', 'Lines 1-9', 1, 9, 'plugin.json'),
    ('arch', 'sdlc_pipeline.md', 'Lines 1-4', 1, 4, 'sdlc_pipeline.md'),
    ('arch', 'sdlc_pipeline.md', 'Lines 22-29', 22, 29, 'sdlc_pipeline.md'),
    ('arch', 'sdlc_pipeline.md', 'Lines 31-66', 31, 66, 'sdlc_pipeline.md'),
    ('arch', 'sdlc_pipeline.md', 'Lines 69-78', 69, 78, 'sdlc_pipeline.md'),
    ('arch', 'plugin/sdlc-orchestrator', 'Lines 1-4', 1, 4, 'plugin/sdlc-orchestrator'),
    ('arch', 'plugin/sdlc-orchestrator', 'Lines 12-21', 12, 21, 'plugin/sdlc-orchestrator'),
    ('arch', 'plugin/sdlc-orchestrator', 'Lines 28-82', 28, 82, 'plugin/sdlc-orchestrator'),
    ('arch', 'plugin/sdlc-orchestrator', 'Lines 86-92', 86, 92, 'plugin/sdlc-orchestrator'),
    ('arch', 'plugin/sdlc-orchestrator', 'Lines 32, 47, 61, 75', 32, 75, 'plugin/sdlc-orchestrator'),
    ('arch', 'workspace/sdlc-orchestrator', 'Lines 26-82', 26, 82, 'workspace/sdlc-orchestrator'),
    ('arch', 'plugin/software-development-standards', 'Lines 1-4', 1, 4, 'plugin/software-development-standards'),
    ('arch', 'plugin/software-development-standards', 'Lines 14-28', 14, 28, 'plugin/software-development-standards'),
    ('arch', 'plugin/software-development-standards', 'Lines 31-46', 31, 46, 'plugin/software-development-standards'),
    ('arch', 'plugin/software-development-standards', 'Lines 56-64', 56, 64, 'plugin/software-development-standards'),
    ('arch', 'plugin/automated-code-review', 'Lines 1-4', 1, 4, 'plugin/automated-code-review'),
    ('arch', 'plugin/automated-code-review', 'Lines 16-23', 16, 23, 'plugin/automated-code-review'),
    ('arch', 'plugin/automated-code-review', 'Lines 24-34', 24, 34, 'plugin/automated-code-review'),
    ('arch', 'plugin/automated-code-review', 'Lines 37-45', 37, 45, 'plugin/automated-code-review'),
    ('arch', 'plugin/automated-code-review', 'Lines 48-68', 48, 68, 'plugin/automated-code-review'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 1-4', 1, 4, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 14-24', 14, 24, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 25-28', 25, 28, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 29-35', 29, 35, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 40-44', 40, 44, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/owasp-security-and-rate-limiting', 'Lines 51-70', 51, 70, 'plugin/owasp-security-and-rate-limiting'),
    ('arch', 'plugin/software-verification-and-qa', 'Lines 1-4', 1, 4, 'plugin/software-verification-and-qa'),
    ('arch', 'plugin/software-verification-and-qa', 'Lines 12-36', 12, 36, 'plugin/software-verification-and-qa'),
    ('arch', 'plugin/software-verification-and-qa', 'Lines 39-63', 39, 63, 'plugin/software-verification-and-qa'),
    ('arch', 'AGENTS.md', 'Lines 76-85', 76, 85, 'AGENTS.md'),
    ('arch', 'subagents.json', 'Lines 1-25', 1, 25, 'subagents.json'),
    ('arch', 'workspace/remote-notifications-and-chat', 'Lines 1-4', 1, 4, 'workspace/remote-notifications-and-chat'),
    ('arch', 'workspace/remote-notifications-and-chat', 'Lines 26-29', 26, 29, 'workspace/remote-notifications-and-chat'),
    ('arch', 'workspace/remote-notifications-and-chat', 'Line 61', 61, 61, 'workspace/remote-notifications-and-chat'),

    # Report 2 (Sec)
    ('sec', 'workspace/owasp-security-and-rate-limiting', 'Lines 18-23', 18, 23, 'workspace/owasp-security-and-rate-limiting'),
    ('sec', 'workspace/owasp-security-and-rate-limiting', 'Lines 25-28', 25, 28, 'workspace/owasp-security-and-rate-limiting'),
    ('sec', 'workspace/owasp-security-and-rate-limiting', 'Lines 29-35', 29, 35, 'workspace/owasp-security-and-rate-limiting'),
    ('sec', 'workspace/owasp-security-and-rate-limiting', 'Lines 40-44', 40, 44, 'workspace/owasp-security-and-rate-limiting'),
    ('sec', 'workspace/owasp-security-and-rate-limiting', 'Lines 45-50', 45, 50, 'workspace/owasp-security-and-rate-limiting'),
    ('sec', 'workspace/software-development-standards', 'Lines 36-42', 36, 42, 'workspace/software-development-standards'),
    ('sec', 'workspace/software-development-standards', 'Lines 43-45', 43, 45, 'workspace/software-development-standards'),
    ('sec', 'sdlc_pipeline.md', 'Lines 48-59', 48, 59, 'sdlc_pipeline.md'),
    ('sec', 'AGENTS.md', 'Lines 47-58', 47, 58, 'AGENTS.md'),
    ('sec', 'subagents.json', 'Lines 14-18', 14, 18, 'subagents.json'),

    # Report 3 (Scale)
    ('scale', 'plugin/automated-code-review', 'L3', 3, 3, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L16-23', 16, 23, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L24-29', 24, 29, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L27-28', 27, 28, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L30-35', 30, 35, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L37-46', 37, 46, 'plugin/automated-code-review'),
    ('scale', 'plugin/automated-code-review', 'L50-68', 50, 68, 'plugin/automated-code-review'),
    ('scale', 'plugin/software-development-standards', 'L48-54', 48, 54, 'plugin/software-development-standards'),
    ('scale', 'AGENTS.md', 'L41-45', 41, 45, 'AGENTS.md'),

    # Report 4 (Orch)
    ('orch', 'workspace/sdlc-orchestrator', 'Lines 28-29, 45-46, 61-62, 77-78', 28, 78, 'workspace/sdlc-orchestrator'),
    ('orch', 'workspace/sdlc-orchestrator', 'Lines 16-19', 16, 19, 'workspace/sdlc-orchestrator'),
    ('orch', 'workspace/sdlc-orchestrator', 'Lines 92-98', 92, 98, 'workspace/sdlc-orchestrator'),
    ('orch', 'workspace/sdlc-orchestrator', 'Lines 30-88', 30, 88, 'workspace/sdlc-orchestrator'),
    ('orch', 'workspace/sdlc-orchestrator', 'Lines 1-98', 1, 98, 'workspace/sdlc-orchestrator'),
    ('orch', 'workspace/software-verification-and-qa', 'Lines 16-19', 16, 19, 'workspace/software-verification-and-qa'),
    ('orch', 'workspace/software-verification-and-qa', 'Lines 20-23', 20, 23, 'workspace/software-verification-and-qa'),
    ('orch', 'workspace/software-verification-and-qa', 'Lines 24-30', 24, 30, 'workspace/software-verification-and-qa'),
    ('orch', 'workspace/software-verification-and-qa', 'Lines 1-63', 1, 63, 'workspace/software-verification-and-qa'),
    ('orch', 'workspace/software-verification-and-qa', 'Lines 31-36', 31, 36, 'workspace/software-verification-and-qa'),
    ('orch', 'sdlc_pipeline.md', 'Lines 20-30', 20, 30, 'sdlc_pipeline.md'),
    ('orch', 'sdlc_pipeline.md', 'Lines 31-66', 31, 66, 'sdlc_pipeline.md'),
    ('orch', 'sdlc_pipeline.md', 'Lines 69-78', 69, 78, 'sdlc_pipeline.md'),
    ('orch', 'AGENTS.md', 'Lines 7-15', 7, 15, 'AGENTS.md'),
    ('orch', 'AGENTS.md', 'Lines 44-60', 44, 60, 'AGENTS.md'),
    ('orch', 'AGENTS.md', 'Lines 70-78', 70, 78, 'AGENTS.md'),
    ('orch', 'subagents.json', 'Lines 4-8', 4, 8, 'subagents.json'),
    ('orch', 'subagents.json', 'Lines 9-13', 9, 13, 'subagents.json'),
    ('orch', 'subagents.json', 'Lines 14-18', 14, 18, 'subagents.json'),
    ('orch', 'subagents.json', 'Lines 19-23', 19, 23, 'subagents.json'),
    ('orch', 'subagents.json', 'Lines 1-26', 1, 26, 'subagents.json'),
]

print(f"Total citations to test: {len(citations_to_check)}")

discrepancies = []
for report_name, file_key, cite_str, start, end, actual_file_key in citations_to_check:
    file_lines = files[actual_file_key]
    total_lines = len(file_lines)
    
    # Check boundary
    if end > total_lines:
        discrepancies.append({
            'report': report_name,
            'file': actual_file_key,
            'cite': cite_str,
            'error': f'Out of bounds! File has {total_lines} lines, citation requests up to line {end}',
            'start': start,
            'end': end,
            'total_lines': total_lines
        })
    elif start < 1:
        discrepancies.append({
            'report': report_name,
            'file': actual_file_key,
            'cite': cite_str,
            'error': f'Invalid start line {start}',
            'start': start,
            'end': end,
            'total_lines': total_lines
        })
    else:
        # Check if contents look reasonable
        actual_slice = file_lines[start-1:end]

print(f"\n--- BOUNDARY DISCREPANCIES ({len(discrepancies)}) ---")
for d in discrepancies:
    print(f"[{d['report'].upper()}] {d['file']} : {d['cite']} -> {d['error']}")
