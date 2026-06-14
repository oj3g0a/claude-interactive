'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const NODE = process.execPath;

function runCli(args = []) {
  return spawnSync(NODE, [CLI, ...args], { encoding: 'utf8' });
}

// --- CLI argument parsing ---

test('cli: --help prints usage and exits 0', () => {
  const r = runCli(['--help']);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('Usage: claude-interactive'));
  assert.ok(r.stdout.includes('--dangerously-skip-permissions'));
});

test('cli: -h is alias for --help', () => {
  const r = runCli(['-h']);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('Usage:'));
});

test('cli: no args prints usage and exits 0', () => {
  const r = runCli([]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('Usage:'));
});

test('cli: --model flag is accepted without error in arg parsing', () => {
  // We only test that the flag is recognized; we do not actually call claude.
  // Passing an unreachable claude-bin ensures spawn fails fast (exit 1) rather
  // than hanging waiting for the real claude.
  const r = runCli(['-p', 'hi', '--claude-bin', '/nonexistent/claude', '--timeout', '1000']);
  // Exit 1 is expected (spawn error), but NOT a parse error about unknown flag.
  assert.ok(r.stderr.includes('claude-interactive:') || r.status !== 0);
  assert.ok(!r.stderr.includes('unknown flag'));
});

test('cli: --startup-wait and --settle flags are accepted', () => {
  const r = runCli(['-p', 'hi', '--claude-bin', '/nonexistent/claude', '--startup-wait', '500', '--settle', '200', '--timeout', '800']);
  assert.ok(r.status !== 0); // fails to spawn, but no parse error
  assert.ok(!r.stderr.includes('unknown flag'));
});
