#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

const SECRET_PATTERNS = [
  { name: 'Telegram Bot Token', regex: /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/ },
  { name: 'Google API Key / Firebase Token', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'Generic Private Key Header', regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/ },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[0-9A-Za-z]{36,255}/ },
  { name: 'Anthropic API Key', regex: /sk-ant-[a-zA-Z0-9_-]{20,}/ },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ }
];

function checkStagedFiles() {
  let stagedFiles;
  try {
    stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('[PreCommit] Failed to retrieve staged files:', err.message);
    process.exit(1);
  }

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  let violations = 0;

  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue;
    if (file === '.env.example' || file.startsWith('.agent') || file.includes('adversarialP0Audit.test.js') || file === 'scripts/pre_commit_secrets_check.js') {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          console.error(`\x1b[31m[CRITICAL SECRET LEAK BLOCKED]\x1b[0m Potential ${pattern.name} detected in: \x1b[33m${file}\x1b[0m`);
          violations++;
        }
      }
    } catch {
      // Binary files or read errors ignored
    }
  }

  if (violations > 0) {
    console.error(`\n\x1b[31m[PRE-COMMIT BLOCKED]\x1b[0m Aborting commit due to ${violations} suspected secret leak(s).`);
    console.error('Please move credentials to .env or environment variables before committing.\n');
    process.exit(1);
  }

  console.log('\x1b[32m[PreCommit] Secret scan passed (0 leaks detected).\x1b[0m');
  process.exit(0);
}

checkStagedFiles();
