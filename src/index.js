import { loadConfig, validateConfig } from './config.js';
import { CrunchyrollCatalogClient } from './providers/crunchyroll-catalog.js';
import { PersistentJobQueue } from './queue/job-queue.js';
import { TelegramBotApi } from './telegram/bot-api.js';
import { TelegramLongPollingRunner } from './telegram/runner.js';
import { BotApp } from './app.js';

const config = loadConfig();
const validation = validateConfig(config);
for (const warning of validation.warnings) console.warn(`[config] ${warning}`);
if (!validation.ok) {
  for (const error of validation.errors) console.error(`[config] ${error}`);
  process.exitCode = 1;
} else {
  const telegram = new TelegramBotApi(config.telegram.botToken);
  const catalog = new CrunchyrollCatalogClient(config.crunchyroll);
  const queue = new PersistentJobQueue({
    ...config.queue,
    worker: async job => {
      // Ponto de extensão intencional. Não acoplar DRM/credenciais ao núcleo do bot.
      job.reportProgress(100);
    }
  });
  const app = new BotApp({ telegram, catalog, queue });
  const runner = new TelegramLongPollingRunner({
    api: telegram,
    app,
    allowedChatIds: config.telegram.allowedChatIds,
    pollTimeoutSeconds: config.telegram.pollTimeoutSeconds
  });

  const controller = new AbortController();
  const stop = () => controller.abort(new Error('Encerrando.'));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const me = await telegram.getMe().catch(error => {
    console.error('[telegram] falha ao validar token:', error.message);
    return null;
  });
  if (!me) process.exitCode = 1;
  else {
    console.log(`[telegram] @${me.username} conectado.`);
    await runner.start(controller.signal);
  }
}
