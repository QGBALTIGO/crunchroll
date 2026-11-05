import { withRetry } from '../utils/retry.js';

export class TelegramBotApi {
  constructor(token, { fetchImpl = fetch } = {}) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.fetch = fetchImpl;
  }

  async call(method, payload = {}, { signal } = {}) {
    return withRetry(async () => {
      const response = await this.fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        const error = new Error(body?.description || `Telegram HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return body.result;
    }, {
      attempts: 3,
      signal,
      shouldRetry: error => !error?.status || error.status === 429 || error.status >= 500
    });
  }

  getUpdates(payload, options) { return this.call('getUpdates', payload, options); }
  sendMessage(payload, options) { return this.call('sendMessage', payload, options); }
  editMessageText(payload, options) { return this.call('editMessageText', payload, options); }
  answerCallbackQuery(payload, options) { return this.call('answerCallbackQuery', payload, options); }
  getMe(options) { return this.call('getMe', {}, options); }
}
