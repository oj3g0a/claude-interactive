[![npm version](https://img.shields.io/npm/v/claude-interactive)](https://www.npmjs.com/package/claude-interactive)
[![CI](https://github.com/oj3g0a/claude-interactive/actions/workflows/ci.yml/badge.svg)](https://github.com/oj3g0a/claude-interactive/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# claude-interactive

> **Run `claude -p` within your subscription. No extra billing. No code changes.**

Anthropic's June 2026 billing change moves `claude -p` (headless mode) out of your subscription into a per-call credit pool. `claude-interactive` brings it back — by running Claude in real interactive mode under the hood, your calls stay in Pool 1 (subscription) exactly as before.

**One line change. Everything else stays the same.**

---

## Why you need this

| | `claude -p` (before June 15) | `claude -p` (after June 15) | `claude-interactive` |
|---|---|---|---|
| Billing | Subscription (Pool 1) ✅ | API credits (Pool 2) 💸 | Subscription (Pool 1) ✅ |
| Interface | `claude -p "..."` | `claude -p "..."` | `claude-interactive -p "..."` |
| Code changes | — | None | **One line** |
| Output format | Plain text | Plain text | Plain text |

---

## Install

```bash
npm install -g claude-interactive
```

Requires Node.js >= 18 and [Claude Code](https://claude.ai/code) already installed.

---

## Migrate in 30 seconds

```diff
- claude -p "Your prompt"
+ claude-interactive -p "Your prompt"
```

That's it. Same flags. Same stdout. Same exit codes.

---

## CLI

```bash
# Exact same interface as claude -p
claude-interactive -p "Fix this bug" --dangerously-skip-permissions

# Choose model
claude-interactive -p "Explain this" --model claude-opus-4-8

# Pipe via stdin — works too
echo "Summarise this" | claude-interactive

# Tune timing if Claude starts slow on your machine
claude-interactive -p "..." --startup-wait 15000 --settle 3000
```

### All options

| Flag | Default | Description |
|---|---|---|
| `-p, --print <prompt>` | — | Prompt text (or pipe via stdin) |
| `--dangerously-skip-permissions` | false | Passed through to claude |
| `--model, -m <model>` | — | Claude model ID |
| `--claude-bin <path>` | auto | Override path to claude executable |
| `--startup-wait <ms>` | 10000 | Max wait for Claude ready prompt |
| `--settle <ms>` | 2000 | Silence duration = response complete |
| `--timeout <ms>` | 90000 | Hard timeout |
| `--help, -h` | — | Show help |

---

## Library

```js
const { runInteractive } = require('claude-interactive');

// Drop-in for: execSync(`claude -p "${prompt}"`)
const response = await runInteractive(prompt, {
  dangerouslySkipPermissions: true,
});
console.log(response);
```

### `runInteractive(prompt, options)` → `Promise<string>`

| Option | Type | Default | Description |
|---|---|---|---|
| `dangerouslySkipPermissions` | boolean | `false` | `--dangerously-skip-permissions` |
| `model` | string | — | Claude model ID |
| `claudeBin` | string | auto | Path to claude executable |
| `maxStartupMs` | number | 10000 | Max ms to wait for ready prompt |
| `settleMs` | number | 2000 | Ms of output silence = done |
| `timeoutMs` | number | 90000 | Hard timeout |
| `cwd` | string | `cwd()` | Working directory |

Returns the response with ANSI codes stripped.

### Utilities

```js
const { findClaude, stripAnsi } = require('claude-interactive');

findClaude(null);                    // auto-detect claude path
stripAnsi('\x1B[31mred\x1B[0m');    // "red"
```

---

## How it works

Under the hood, `claude-interactive` uses [node-pty](https://github.com/microsoft/node-pty) — the same library powering VS Code's integrated terminal — to spawn Claude Code in a real ConPTY pseudo-terminal. Because there's no `-p` / `--print` flag, Anthropic's billing system sees an interactive session and keeps it in Pool 1.

1. Spawns `claude` in a ConPTY/Unix PTY
2. Waits for Claude's input prompt (`>` / `❯` pattern, with timeout fallback)
3. Writes your prompt and watches the output stream
4. Resolves when output is silent for `settleMs` ms
5. Strips ANSI codes and returns clean text

### Timing

| Phase | Typical duration |
|---|---|
| Claude startup | 2–10 s |
| Response generation | varies |
| Settle detection | 2 s (configurable) |
| **Total** | **~10–20 s per call** |

> Comparable to `claude -p` which also pays the startup cost on every invocation.

---

## Running tests

```bash
npm test
```

Uses Node.js built-in test runner (`node:test`) — no extra dependencies.

---

## License

MIT
