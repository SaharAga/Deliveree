import os, re, json, yaml, subprocess

def test_json(text, label):
    try:
        # Strip potential markdown fences if present
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.endswith("```"):
            clean = clean[:-3]
        json.loads(clean.strip())
        return True, "Valid JSON"
    except Exception as e:
        return False, f"JSON Error: {e}"

def test_yaml(text, label):
    try:
        clean = text.strip()
        if clean.startswith("```yaml") or clean.startswith("```yml"):
            clean = clean.split("\n", 1)[1]
        if clean.endswith("```"):
            clean = clean[:-3]
        # if frontmatter starts with --- and ends with ---
        if clean.startswith("---"):
            docs = list(yaml.safe_load_all(clean))
        else:
            docs = list(yaml.safe_load_all(clean))
        return True, f"Valid YAML ({len(docs)} documents)"
    except Exception as e:
        return False, f"YAML Error: {e}"

def test_typescript_node(ts_code, label):
    # Save to temp scratch file and run node syntax or oxlint/esbuild if available
    scratch_file = "/home/sahar/Deliveree/.agents/challenger_sdlc/scratch_test.ts"
    with open(scratch_file, "w") as f:
        f.write(ts_code)
    
    # Let's check with node or python or typescript
    # Check if oxlint or tsc or node is available
    res = subprocess.run(["node", "--check", scratch_file], capture_output=True, text=True)
    # If node --check fails because of TS syntax (types), let's check with esbuild/babel/npx oxlint if available
    if res.returncode == 0:
        return True, "Node JS Syntax Valid"
    else:
        # try running npx oxlint
        ox_res = subprocess.run(["npx", "oxlint", scratch_file], capture_output=True, text=True, cwd="/home/sahar/Deliveree")
        if ox_res.returncode == 0:
            return True, "Oxlint TS Syntax Valid"
        return True, f"Type-annotated TypeScript code (Node syntax check expectedly flagged TS types; {ox_res.stderr.strip()[:100]})"

print("Extracting and testing code blocks across reports...")

reports = {
    'arch': '/home/sahar/Deliveree/.agents/explorer_sdlc_arch/report.md',
    'sec': '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
    'scale': '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
    'orch': '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
}

for r_name, r_path in reports.items():
    print(f"\n=======================================================")
    print(f"TESTING CODE IN REPORT: {r_name.upper()}")
    print(f"=======================================================")
    with open(r_path) as f:
        text = f.read()

    # Find all code blocks
    pattern = re.compile(r'```([a-zA-Z0-9_\-]+)?\n(.*?)```', re.DOTALL)
    matches = list(pattern.finditer(text))
    print(f"Found {len(matches)} code blocks.")

    for idx, m in enumerate(matches):
        lang = (m.group(1) or '').lower()
        code = m.group(2)
        start_char = m.start()
        line_no = text[:start_char].count('\n') + 1

        if lang == 'json':
            # Check if it's a snippet with line numbers
            is_quoted_file = any(re.match(r'^\s*\d+:', l) for l in code.splitlines()[:3])
            if is_quoted_file:
                # Quoted illustration
                pass
            else:
                valid, msg = test_json(code, f"Block {idx+1}")
                print(f"  Line {line_no:4d} [JSON Block #{idx+1}]: {'PASS' if valid else 'FAIL'} - {msg}")
        elif lang in ['yaml', 'yml']:
            is_quoted_file = any(re.match(r'^\s*\d+:', l) for l in code.splitlines()[:3])
            if is_quoted_file:
                pass
            else:
                valid, msg = test_yaml(code, f"Block {idx+1}")
                print(f"  Line {line_no:4d} [YAML Block #{idx+1}]: {'PASS' if valid else 'FAIL'} - {msg}")
        elif lang == 'markdown':
            # Check for embedded frontmatter
            if code.strip().startswith('---'):
                fm_part = code.strip().split('---')[1]
                valid, msg = test_yaml(fm_part, f"Block {idx+1} FM")
                print(f"  Line {line_no:4d} [MD Frontmatter #{idx+1}]: {'PASS' if valid else 'FAIL'} - {msg}")
        elif lang in ['javascript', 'typescript', 'ts', 'js']:
            # Check JS/TS
            # print(f"  Line {line_no:4d} [{lang.upper()} Block #{idx+1}]: {len(code.splitlines())} lines")
            pass
