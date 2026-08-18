import os
import re
import json
import yaml
import traceback

def load_file(path):
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return f.readlines()

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

files_lines = {k: load_file(v) for k, v in paths.items()}

reports = {
    'arch': '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    'sec': '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    'scale': '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    'orch': '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
}

print("=== VERIFYING EXPLORER REPORTS ===")
for r_name, r_path in reports.items():
    print(f"\n=======================================================")
    print(f"=== REPORT: {r_name.upper()} ({r_path}) ===")
    print(f"=======================================================")
    with open(r_path, 'r', encoding='utf-8') as f:
        full_text = f.read()
    
    # 1. Check all code fences and syntax
    code_blocks = re.findall(r'```([a-zA-Z0-9_\-]+)?\n(.*?)```', full_text, re.DOTALL)
    print(f"Total code blocks: {len(code_blocks)}")
    
    for idx, (lang, block) in enumerate(code_blocks):
        lang = lang.lower() if lang else ""
        # test json
        if lang == 'json':
            try:
                # If block has line numbers e.g. "1: {" we check if it's display code
                clean_block = re.sub(r'^\s*\d+:\s?', '', block, flags=re.MULTILINE)
                # also if it has ellipses ...
                clean_block_no_dots = re.sub(r'\.\.\.', '', clean_block)
                json.loads(clean_block_no_dots)
                # print(f"  [Code Block #{idx+1} (json)]: VALID JSON")
            except Exception as e:
                print(f"  [Code Block #{idx+1} (json)]: SYNTAX ERROR: {e}")
                print("    Preview:", block[:100].replace('\n', ' '))
        elif lang in ['yaml', 'yml']:
            try:
                clean_block = re.sub(r'^\s*\d+:\s?', '', block, flags=re.MULTILINE)
                yaml.safe_load(clean_block)
                # print(f"  [Code Block #{idx+1} (yaml)]: VALID YAML")
            except Exception as e:
                print(f"  [Code Block #{idx+1} (yaml)]: SYNTAX ERROR: {e}")
                print("    Preview:", block[:100].replace('\n', ' '))
        elif lang == 'markdown':
            # Check if there is YAML frontmatter inside
            fm_match = re.match(r'^\s*---\n(.*?)\n---', block, re.DOTALL)
            if fm_match:
                fm_content = fm_match.group(1)
                try:
                    yaml.safe_load(fm_content)
                    # print(f"  [Code Block #{idx+1} (markdown frontmatter)]: VALID YAML")
                except Exception as e:
                    print(f"  [Code Block #{idx+1} (markdown frontmatter)]: INVALID YAML: {e}")
                    print("    Preview:", fm_content[:100].replace('\n', ' '))
