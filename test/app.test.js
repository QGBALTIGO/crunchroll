import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../src/app.js';

test('parseCommand strips bot suffix and keeps arguments', () => {
  assert.deepEqual(parseCommand('/buscar@MeuBot One Piece'), { command: '/buscar', args: 'One Piece' });
});

test('parseCommand ignores plain text', () => {
  assert.deepEqual(parseCommand('oi'), { command: '', args: '' });
});
