import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class PersistentJobQueue {
  constructor({ dataDir, maxConcurrentJobs = 2, worker = async () => {} }) {
    this.dataDir = dataDir;
    this.maxConcurrentJobs = Math.max(1, Number(maxConcurrentJobs) || 1);
    this.worker = worker;
    this.jobs = new Map();
    this.running = 0;
    this.file = path.join(dataDir, 'queue.json');
    fs.mkdirSync(dataDir, { recursive: true });
    this.#load();
  }

  #load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const job of raw.jobs ?? []) {
        if (!job?.id) continue;
        const status = job.status === 'running' ? 'queued' : job.status;
        this.jobs.set(job.id, { ...job, status });
      }
    } catch {}
  }

  #save() {
    const tmp = `${this.file}.tmp`;
    const payload = JSON.stringify({ version: 1, jobs: [...this.jobs.values()] }, null, 2);
    fs.writeFileSync(tmp, payload, { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  enqueue(type, payload, meta = {}) {
    const now = new Date().toISOString();
    const job = {
      id: crypto.randomUUID(),
      type,
      payload,
      meta,
      status: 'queued',
      progress: 0,
      error: null,
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(job.id, job);
    this.#save();
    queueMicrotask(() => this.#drain());
    return { ...job };
  }

  list({ limit = 25 } = {}) {
    return [...this.jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(job => ({ ...job }));
  }

  get(id) {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async #drain() {
    while (this.running < this.maxConcurrentJobs) {
      const next = [...this.jobs.values()].find(job => job.status === 'queued');
      if (!next) return;
      this.running += 1;
      next.status = 'running';
      next.updatedAt = new Date().toISOString();
      this.#save();

      Promise.resolve(this.worker({
        ...next,
        reportProgress: progress => {
          const current = this.jobs.get(next.id);
          if (!current || current.status !== 'running') return;
          current.progress = Math.max(0, Math.min(100, Number(progress) || 0));
          current.updatedAt = new Date().toISOString();
          this.#save();
        }
      }))
        .then(() => {
          const current = this.jobs.get(next.id);
          if (current) {
            current.status = 'completed';
            current.progress = 100;
            current.updatedAt = new Date().toISOString();
          }
        })
        .catch(error => {
          const current = this.jobs.get(next.id);
          if (current) {
            current.status = 'failed';
            current.error = String(error?.message ?? error);
            current.updatedAt = new Date().toISOString();
          }
        })
        .finally(() => {
          this.running -= 1;
          this.#save();
          queueMicrotask(() => this.#drain());
        });
    }
  }
}
