'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripAnsi, findClaude } = require('../src/index');

// --- stripAnsi ---

test('stripAnsi: removes color codes', () => {
  assert.equal(stripAnsi('\x1B[31mred\x1B[0m'), 'red');
});

test('stripAnsi: removes cursor movement', () => {
  assert.equal(stripAnsi('\x1B[2Jhello\x1B[H'), 'hello');
});

test('stripAnsi: removes OSC sequences (window title)', () => {
  assert.equal(stripAnsi('\x1B]0;My Terminal\x07text'), 'text');
});

test('stripAnsi: normalises CRLF to LF', () => {
  assert.equal(stripAnsi('a\r\nb'), 'a\nb');
});

test('stripAnsi: strips control characters but keeps newlines', () => {
  const input = 'line1\nline2';
  assert.equal(stripAnsi(input), 'line1\nline2');
});

test('stripAnsi: passes plain text through unchanged', () => {
  assert.equal(stripAnsi('hello world'), 'hello world');
});

test('stripAnsi: handles empty string', () => {
  assert.equal(stripAnsi(''), '');
});

// --- findClaude ---

test('findClaude: returns a non-empty string', () => {
  const bin = findClaude(null);
  assert.equal(typeof bin, 'string');
  assert.ok(bin.length > 0);
});

test('findClaude: respects custom path override', () => {
  assert.equal(findClaude('/custom/path/claude'), '/custom/path/claude');
});
