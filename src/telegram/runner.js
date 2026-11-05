export class TelegramLongPollingRunner {
  constructor({ api, app, allowedChatIds = [], pollTimeoutSeconds = 25, logger = console }) {
    this.api = api;
    this.app = app;
    this.allowed = new Set(allowedChatIds.map(Number));
    this.pollTimeoutSeconds = pollTimeoutSeconds;
    this.logger = logger;
    this.offset = 0;
  }

  #isAllowed(chatId) {
    return this.allowed.size === 0 || this.allowed.has(Number(chatId));
  }

  async start(signal) {
    while (!signal.aborted) {
      try {
        const updates = await this.api.getUpdates({
          offset: this.offset,
          timeout: this.pollTimeoutSeconds,
          allowed_updates: ['message', 'callback_query']
        }, { signal });

        for (const update of updates) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
          if (!chatId) continue;
          if (!this.#isAllowed(chatId)) {
            this.logger.warn(`[security] chat ${chatId} bloqueado pela allowlist`);
            continue;
          }
          await this.app.handle(update, { signal });
        }
      } catch (error) {
        if (signal.aborted) return;
        this.logger.error('[telegram] erro no polling:', error?.message ?? error);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }
  }
}
