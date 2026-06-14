#!/usr/bin/env node
'use strict';

const USAGE = `Usage: claude-interactive -p <prompt> [options]

Drop-in replacement for "claude -p" using interactive mode (Pool 1 billing).

Options:
  -p, --print <prompt>            Prompt text (required, or pipe via stdin)
  --dangerously-skip-permissions  Pass through to claude
  --model, -m <model>             Claude model to use
  --claude-bin <path>             Path to claude executable
  --startup-wait <ms>             Max ms to wait for Claude ready (default: 10000)
  --settle <ms>                   Ms of silence = response done (default: 2000)
  --timeout <ms>                  Hard timeout in ms (default: 90000)
  --help, -h                      Show this help

Examples:
  claude-interactive -p "What is 2+2?"
  claude-interactive -p "Fix this bug" --dangerously-skip-permissions
  echo "Summarise this" | claude-interactive
`;

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const options = { cwd: process.cwd() };
let prompt = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-p' || a === '--print') {
    prompt = args[++i];
  } else if (a === '--dangerously-skip-permissions') {
    options.dangerouslySkipPermissions = true;
  } else if (a === '--model' || a === '-m') {
    options.model = args[++i];
  } else if (a === '--claude-bin') {
    options.claudeBin = args[++i];
  } else if (a === '--startup-wait') {
    options.maxStartupMs = parseInt(args[++i], 10);
  } else if (a === '--settle') {
    options.settleMs = parseInt(args[++i], 10);
  } else if (a === '--timeout') {
    options.timeoutMs = parseInt(args[++i], 10);
  } else if (!a.startsWith('-') && prompt === null) {
    prompt = a;
  }
}

if (prompt !== null) {
  run(prompt);
} else {
  // Read from stdin
  let stdin = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { stdin += d; });
  process.stdin.on('end', () => {
    if (!stdin.trim()) {
      process.stderr.write('Error: no prompt provided. Use -p or pipe via stdin.\n');
      process.exit(1);
    }
    run(stdin.trim());
  });
}

function run(p) {
  // Lazy require so --help works even without npm install
  const { runInteractive } = require('../src/index');
  runInteractive(p, options)
    .then((response) => {
      process.stdout.write(response + '\n');
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`claude-interactive: ${err.message}\n`);
      process.exit(1);
    });
}
