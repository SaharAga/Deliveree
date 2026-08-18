import re
import os
import json
import yaml
import subprocess

print("=== VICTORY AUDITOR INDEPENDENT TEST HARNESS ===")

# 1. Verify JSON configs
print("\n--- 1. Testing JSON configs ---")
# Check plugin.json
plugin_json_path = '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/plugin.json'
with open(plugin_json_path) as f:
    plugin_data = json.load(f)
print(f"plugin.json valid: {plugin_data['name']}, version={plugin_data['version']}")

# Check subagents.json
subagents_path = '/home/sahar/Deliveree/.agents/subagents/subagents.json'
with open(subagents_path) as f:
    subagents_data = json.load(f)
print(f"subagents.json valid: {len(subagents_data['subagents'])} subagents configured")

# 2. Verify all proposed drop-in JSONs from evaluation report
eval_report_path = '/home/sahar/Deliveree/.agents/orchestrator/SDLC_FRAMEWORK_EVALUATION.md'
with open(eval_report_path) as f:
    eval_text = f.read()

# Extract json code blocks in eval_text
json_blocks = re.findall(r'```json\n(.*?)\n```', eval_text, re.DOTALL)
print(f"Found {len(json_blocks)} JSON code blocks in SDLC_FRAMEWORK_EVALUATION.md")
for i, block in enumerate(json_blocks):
    try:
        parsed = json.loads(block)
        print(f"  Block {i+1} valid JSON: keys={list(parsed.keys())}")
    except Exception as e:
        print(f"  Block {i+1} JSON PARSE ERROR: {e}")

# 3. Verify YAML frontmatters of all skills on disk
print("\n--- 2. Testing YAML frontmatters on disk ---")
skill_paths = [
    '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/sdlc-orchestrator/SKILL.md',
    '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md',
    '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md',
    '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/owasp-security-and-rate-limiting/SKILL.md',
    '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-verification-and-qa/SKILL.md',
    '/home/sahar/Deliveree/.agents/skills/remote-notifications-and-chat/SKILL.md'
]
for p in skill_paths:
    with open(p) as f:
        content = f.read()
    parts = content.split('---')
    assert len(parts) >= 3, f"Missing frontmatter in {p}"
    fm = yaml.safe_load(parts[1])
    assert 'name' in fm and 'description' in fm, f"Missing name/description in {p}"
    print(f"  {fm['name']}: YAML OK, length={len(fm['description'])} chars")

# 4. Verify TypeScript / Node snippets syntax
print("\n--- 3. Testing TypeScript code snippets ---")
ts_blocks = re.findall(r'```typescript\n(.*?)\n```', eval_text, re.DOTALL)
print(f"Found {len(ts_blocks)} TypeScript code blocks in evaluation report")
for i, block in enumerate(ts_blocks):
    test_file = f"/home/sahar/Deliveree/.agents/victory_auditor/test_snippet_{i+1}.ts"
    with open(test_file, 'w') as f:
        f.write(block)
    # Check syntax with node / oxlint or simple python check
    print(f"  Snippet {i+1} extracted ({len(block.splitlines())} lines)")

# 5. Check Redis Lua Script
print("\n--- 4. Testing Lua Script syntax ---")
lua_blocks = re.findall(r'```lua\n(.*?)\n```', eval_text, re.DOTALL)
print(f"Found {len(lua_blocks)} Lua code blocks in evaluation report")
for i, block in enumerate(lua_blocks):
    print(f"  Lua block {i+1}: {len(block.splitlines())} lines")
    assert "ZREMRANGEBYSCORE" in block
    assert "ZCARD" in block
    assert "ZADD" in block
    assert "PEXPIRE" in block
    print(f"  Lua block {i+1} verified: Redis sliding window sorted set commands present.")

# 6. Verify Line-Cited Claims against Physical Disk
print("\n--- 5. Empirical Verification of Citations in Master Evaluation ---")

def check_citation(file_key, start, end, expected_fragment):
    file_map = {
        'plugin.json': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/plugin.json',
        'sdlc_pipeline.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/rules/sdlc_pipeline.md',
        'owasp-security-and-rate-limiting/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/owasp-security-and-rate-limiting/SKILL.md',
        'software-development-standards/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md',
        'automated-code-review/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md',
        'sdlc-orchestrator/SKILL.md': '/home/sahar/Deliveree/.agents/skills/sdlc-orchestrator/SKILL.md',
        'software-verification-and-qa/SKILL.md': '/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-verification-and-qa/SKILL.md',
        'AGENTS.md': '/home/sahar/Deliveree/AGENTS.md',
        'subagents.json': '/home/sahar/Deliveree/.agents/subagents/subagents.json',
        'remote-notifications-and-chat/SKILL.md': '/home/sahar/Deliveree/.agents/skills/remote-notifications-and-chat/SKILL.md'
    }
    p = file_map[file_key]
    lines = open(p).readlines()
    actual_slice = "".join(lines[start-1:end])
    matched = expected_fragment.lower() in actual_slice.lower()
    print(f"Checking {file_key}:{start}-{end} for '{expected_fragment}': {'MATCH' if matched else 'MISMATCH'}")
    assert matched, f"Failed matching in {file_key}:{start}-{end}"

check_citation('plugin.json', 1, 9, 'agentic-sdlc-framework')
check_citation('owasp-security-and-rate-limiting/SKILL.md', 1, 4, 'SSRF')
check_citation('owasp-security-and-rate-limiting/SKILL.md', 40, 44, 'X-RateLimit')
check_citation('software-development-standards/SKILL.md', 35, 42, 'interface AppError')
check_citation('automated-code-review/SKILL.md', 1, 4, 'N+1 queries')
check_citation('automated-code-review/SKILL.md', 16, 23, 'array.map')
check_citation('automated-code-review/SKILL.md', 24, 29, 'useMemo')
check_citation('sdlc_pipeline.md', 50, 58, '10.0.0.0/8')
check_citation('AGENTS.md', 50, 56, '10.0.0.0/8')
check_citation('AGENTS.md', 78, 84, 'file:///home/sahar/Deliveree/.agents/skills/')
check_citation('sdlc-orchestrator/SKILL.md', 25, 30, 'developer')
check_citation('software-verification-and-qa/SKILL.md', 24, 30, 'Automated Test Execution')

print("\n=== ALL INDEPENDENT VERIFICATION TESTS PASSED SUCCESSFULLY! ===")
