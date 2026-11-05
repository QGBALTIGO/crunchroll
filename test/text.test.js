import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeFileName, compactText } from '../src/utils/text.js';

test('escapeHtml protects Telegram HTML output', () => {
  assert.equal(escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
});

test('sanitizeFileName removes Windows reserved characters', () => {
  assert.equal(sanitizeFileName('A:B/C*? '), 'A_B_C__');
});

test('compactText trims and limits length', () => {
  assert.equal(compactText('  a   b  ', 20), 'a b');
  assert.equal(compactText('abcdefghij', 5), 'abcd…');
});
