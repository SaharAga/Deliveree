import os
import re
import json
import yaml

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

files = {k: load_file(v) for k, v in paths.items()}

reports = {
    'arch': '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    'sec': '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    'scale': '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    'orch': '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
}

for r_name, r_path in reports.items():
    print(f"\n=======================================================")
    print(f"=== CHECKING REPORT: {r_name} ({r_path}) ===")
    print(f"=======================================================")
    content = "".join(load_file(r_path))
    
    # Check all code blocks with json/yaml/markdown
    # Extract json blocks
    json_blocks = re.findall(r'```json\s+(.*?)```', content, re.DOTALL)
    print(f"Total JSON blocks found: {len(json_blocks)}")
    for idx, jb in enumerate(json_blocks):
        try:
            # handle possible placeholder line comments or ellipses if any
            parsed = json.loads(jb)
            # print(f"  JSON block #{idx+1}: VALID")
        except Exception as e:
            print(f"  JSON block #{idx+1}: INVALID -> {e}")
            # print preview of jb
            lines = jb.strip().splitlines()
            for l in lines[:5]:
                print(f"    {l}")

    # Extract yaml frontmatters
    yaml_blocks = re.findall(r'```ya?ml\s+(.*?)```', content, re.DOTALL)
    print(f"Total YAML blocks found: {len(yaml_blocks)}")
    for idx, yb in enumerate(yaml_blocks):
        try:
            parsed = yaml.safe_load(yb)
            # print(f"  YAML block #{idx+1}: VALID")
        except Exception as e:
            print(f"  YAML block #{idx+1}: INVALID -> {e}")

    # Extract frontmatter in drop-in markdown blocks
    md_blocks = re.findall(r'```markdown\s+(---.*?---)', content, re.DOTALL)
    print(f"Total Markdown Frontmatter blocks found: {len(md_blocks)}")
    for idx, mb in enumerate(md_blocks):
        try:
            # strip ---
            clean = mb.strip().strip('-').strip()
            parsed = yaml.safe_load(clean)
            # print(f"  MD Frontmatter #{idx+1}: VALID")
        except Exception as e:
            print(f"  MD Frontmatter #{idx+1}: INVALID -> {e}")
            print(mb[:100])
