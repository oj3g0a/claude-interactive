'use strict';

const pty = require('node-pty');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// Cross-platform claude executable resolution
function findClaude(customPath) {
  if (customPath) return customPath;

  const cmd = os.platform() === 'win32' ? 'where claude' : 'which claude';
  try {
    const result = execSync(cmd, { encoding: 'utf8', env: process.env }).trim();
    return result.split(/\r?\n/)[0].trim();
  } catch (_) {}

  // Known fallback locations
  const candidates = os.platform() === 'win32'
    ? [
        path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe'),
        path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'AnthropicClaude', 'claude.exe'),
        'claude.exe',
      ]
    : [
        path.join(process.env.HOME || '', '.local', 'bin', 'claude'),
        '/usr/local/bin/claude',
        'claude',
      ];

  for (const c of candidates) {
    try { require('fs').accessSync(c); return c; } catch (_) {}
  }
  return 'claude';
}

// Strip ANSI escape codes and terminal control characters
function stripAnsi(str) {
  return str
    .replace(/\x1B\[[\d;]*[mGKHFJA-Za-z]/g, '')
    .replace(/\x1B\][^\x07]*(\x07|\x1B\\)/g, '')
    .replace(/\x1B[()][AB012]/g, '')
    .replace(/\x1B[@-Z\\-_]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// Patterns that indicate Claude Code is ready for user input
const READY_PATTERNS = [
  />\s*$/m,
  /❯\s*$/m,
  /\?\s*\[/m,
];

function isClaudeReady(text) {
  return READY_PATTERNS.some(p => p.test(stripAnsi(text)));
}

/**
 * Run a prompt through Claude Code in interactive mode.
 *
 * Acts as a drop-in replacement for `claude -p "prompt"` but uses interactive
 * mode so usage counts against Pool 1 (subscription) rather than Pool 2
 * (per-call API credits) after Anthropic's June 2026 billing change.
 *
 * @param {string} prompt - The prompt to send to Claude
 * @param {object} [options]
 * @param {boolean} [options.dangerouslySkipPermissions=false] - Pass --dangerously-skip-permissions
 * @param {string}  [options.model]           - Claude model to use
 * @param {string}  [options.claudeBin]       - Override path to claude executable
 * @param {number}  [options.maxStartupMs=10000] - Max ms to wait for Claude ready prompt
 * @param {number}  [options.settleMs=2000]   - Ms of output silence = response complete
 * @param {number}  [options.timeoutMs=90000] - Hard timeout; resolves with partial output
 * @param {string}  [options.cwd]             - Working directory for claude process
 * @returns {Promise<string>} Claude's response text (ANSI stripped)
 */
function runInteractive(prompt, options = {}) {
  const {
    dangerouslySkipPermissions = false,
    model = null,
    claudeBin = null,
    maxStartupMs = 10000,
    settleMs = 2000,
    timeoutMs = 90000,
    cwd = process.cwd(),
  } = options;

  const bin = findClaude(claudeBin);

  return new Promise((resolve, reject) => {
    const args = [];
    if (dangerouslySkipPermissions) args.push('--dangerously-skip-permissions');
    if (model) args.push('--model', model);

    let proc;
    try {
      proc = pty.spawn(bin, args, {
        name: 'xterm-color',
        cols: 220,
        rows: 50,
        cwd,
        env: { ...process.env },
      });
    } catch (err) {
      return reject(new Error(`Failed to spawn claude (${bin}): ${err.message}`));
    }

    let startupBuffer = '';
    let responseBuffer = '';
    let promptSent = false;
    let resolved = false;
    let settleTimer = null;
    let startupTimer = null;
    let hardTimer = null;

    function finish(raw) {
      if (resolved) return;
      resolved = true;
      clearTimeout(settleTimer);
      clearTimeout(startupTimer);
      clearTimeout(hardTimer);
      try { proc.kill(); } catch (_) {}
      resolve(stripAnsi(raw).trim());
    }

    function sendPrompt() {
      if (promptSent) return;
      promptSent = true;
      clearTimeout(startupTimer);
      responseBuffer = '';
      proc.write(prompt + '\r');
    }

    proc.onData((data) => {
      if (!promptSent) {
        startupBuffer += data;
        if (isClaudeReady(startupBuffer)) sendPrompt();
      } else {
        responseBuffer += data;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => finish(responseBuffer), settleMs);
      }
    });

    proc.onExit(() => { finish(responseBuffer); });

    startupTimer = setTimeout(sendPrompt, maxStartupMs);
    hardTimer = setTimeout(() => { if (!resolved) finish(responseBuffer); }, timeoutMs);
  });
}

module.exports = { runInteractive, findClaude, stripAnsi };
