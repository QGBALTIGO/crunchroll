export async function withRetry(fn, {
  attempts = 3,
  baseDelayMs = 300,
  shouldRetry = () => true,
  signal
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal?.aborted) throw signal.reason ?? new Error('Operação cancelada.');
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) break;
      const delay = baseDelayMs * (2 ** (attempt - 1));
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            reject(signal.reason ?? new Error('Operação cancelada.'));
          };
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }
  }
  throw lastError;
}
