import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PersistentJobQueue } from '../src/queue/job-queue.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('queue persists jobs and restores running jobs as queued', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crunchroll-queue-'));
  try {
    const queue = new PersistentJobQueue({ dataDir: dir, maxConcurrentJobs: 1, worker: async job => {
      job.reportProgress(50);
      await sleep(20);
    }});
    const job = queue.enqueue('test', { value: 1 });
    await sleep(80);
    assert.equal(queue.get(job.id).status, 'completed');

    const restored = new PersistentJobQueue({ dataDir: dir, maxConcurrentJobs: 1, worker: async () => {} });
    assert.equal(restored.get(job.id).status, 'completed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
