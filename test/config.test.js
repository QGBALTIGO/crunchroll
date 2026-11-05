import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateConfig } from '../src/config.js';

test('loadConfig parses allowlist and bounds numeric values', () => {
  const config = loadConfig({
    rootDir: process.cwd(),
    env: {
      TELEGRAM_BOT_TOKEN: 'abc',
      TELEGRAM_ALLOWED_CHAT_IDS: '123, 456, invalido',
      BOT_MAX_CONCURRENT_JOBS: '99',
      BOT_POLL_TIMEOUT_SECONDS: '0'
    }
  });
  assert.deepEqual(config.telegram.allowedChatIds, [123, 456]);
  assert.equal(config.queue.maxConcurrentJobs, 8);
  assert.equal(config.telegram.pollTimeoutSeconds, 1);
});

test('validateConfig fails without Telegram token but only warns without catalog token', () => {
  const config = loadConfig({ rootDir: process.cwd(), env: {} });
  const result = validateConfig(config);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /TELEGRAM_BOT_TOKEN/);
  assert.match(result.warnings.join(' '), /CRUNCHYROLL_ACCESS_TOKEN/);
});
