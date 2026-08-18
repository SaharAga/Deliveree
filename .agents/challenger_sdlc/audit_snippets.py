import os, re, subprocess

def test_code_snippets():
    reports = {
        'sec': '/home/sahar/Deliveree/.agents/explorer_sdlc_sec/report.md',
        'scale': '/home/sahar/Deliveree/.agents/explorer_sdlc_scale/report.md',
        'orch': '/home/sahar/Deliveree/.agents/explorer_sdlc_orch/report.md',
    }

    for r_name, r_path in reports.items():
        with open(r_path) as f:
            text = f.read()

        code_blocks = re.findall(r'```(?:typescript|ts|javascript|js)\s+(.*?)```', text, re.DOTALL)
        print(f"\n=======================================================")
        print(f"REPORT {r_name.upper()}: Testing {len(code_blocks)} TS/JS Snippets")
        print(f"=======================================================")

        for idx, block in enumerate(code_blocks):
            clean_block = block.strip()
            # print first line
            first_line = clean_block.splitlines()[0] if clean_block else "EMPTY"
            print(f"\n--- Snippet #{idx+1}: {first_line[:60]} ---")
            
            # Let's inspect the code for potential bugs / anti-patterns
            # 1. Check for SSRF bypasses or IP parsing flaws in Sec snippet
            if 'isPrivateIP' in clean_block or 'ssrf' in clean_block.lower():
                print("  [AUDITING SSRF CODE]:")
                # Look at IPv6 parsing, mapped IPv4, 0.0.0.0, 169.254.169.254, 127.0.0.1
                if '::ffff:' in clean_block:
                    print("    -> Handles IPv4-mapped IPv6 (::ffff:)")
                else:
                    print("    -> ⚠️ WARNING: Does not explicitly handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)!")
                if '0.0.0.0' in clean_block or '0.0.0.0/8' in clean_block:
                    print("    -> Handles 0.0.0.0/8 broadcast/current network")
                else:
                    print("    -> ⚠️ NOTE: Check 0.0.0.0 handling")

            # 2. Check timing-safe comparison snippet
            if 'timingSafeEqual' in clean_block:
                print("  [AUDITING TIMING-SAFE EQUAL CODE]:")
                # Check if buffer length mismatch is handled timing-safely
                if 'Buffer.byteLength' in clean_block or 'bufA.length !== bufB.length' in clean_block:
                    print("    -> Length check inspected.")
                    if 'bufA.length !== bufB.length' in clean_block:
                        print("    -> ⚠️ CAVEAT: Early return on buffer length difference leaks length via timing (standard crypto.timingSafeEqual throws if lengths differ; standard practice is comparing HMAC of both buffers to protect secret length).")

            # 3. Check JSON parsing prototype pollution
            if '__proto__' in clean_block or 'constructor' in clean_block or 'prototype' in clean_block:
                print("  [AUDITING PROTOTYPE POLLUTION DEFENSE]:")
                if 'Object.create(null)' in clean_block:
                    print("    -> Uses Object.create(null) dictionary pattern")
                if 'reviver' in clean_block or 'JSON.parse' in clean_block:
                    print("    -> Custom reviver or key filter used")

            # 4. Check DataLoader snippet in Scale report
            if 'DataLoader' in clean_block:
                print("  [AUDITING DATALOADER SNIPPET]:")
                if 'batchGet' in clean_block or 'Map' in clean_block:
                    print("    -> Batch resolution and Map alignment verified")

            # 5. Check React 19 State Lifecycle
            if 'useActionState' in clean_block or 'useOptimistic' in clean_block or 'AbortController' in clean_block:
                print("  [AUDITING REACT 19 LIFECYCLE SNIPPET]:")
                if 'signal.aborted' in clean_block or 'abort()' in clean_block:
                    print("    -> AbortController signal cleanup present")

test_code_snippets()
