import { escapeHtml, compactText } from './utils/text.js';

function parseCommand(text) {
  const value = String(text ?? '').trim();
  if (!value.startsWith('/')) return { command: '', args: '' };
  const firstSpace = value.indexOf(' ');
  const head = (firstSpace === -1 ? value : value.slice(0, firstSpace)).split('@')[0].toLowerCase();
  const args = firstSpace === -1 ? '' : value.slice(firstSpace + 1).trim();
  return { command: head, args };
}

function seriesKeyboard(items) {
  return {
    inline_keyboard: items.map(item => ([{
      text: item.episodeCount ? `${item.title} (${item.episodeCount} eps)` : item.title,
      callback_data: `series:${item.id}`
    }]))
  };
}

function seasonKeyboard(items) {
  return {
    inline_keyboard: items.map(item => ([{
      text: item.seasonNumber ? `T${item.seasonNumber} — ${item.title}` : item.title,
      callback_data: `season:${item.id}`
    }]))
  };
}

export class BotApp {
  constructor({ telegram, catalog, queue }) {
    this.telegram = telegram;
    this.catalog = catalog;
    this.queue = queue;
  }

  async handle(update, { signal } = {}) {
    if (update.callback_query) return this.#handleCallback(update.callback_query, signal);
    if (update.message) return this.#handleMessage(update.message, signal);
  }

  async #handleMessage(message, signal) {
    const chatId = message.chat.id;
    const { command, args } = parseCommand(message.text);

    if (command === '/start' || command === '/ajuda' || command === '/help') {
      return this.telegram.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: '<b>Crunchroll Bot</b>\n\n' +
          '• /buscar &lt;anime&gt; — pesquisar no catálogo\n' +
          '• /fila — ver a fila persistente\n' +
          '• /status — diagnóstico da configuração\n\n' +
          '<i>Credenciais de conta nunca são solicitadas pelo chat.</i>'
      }, { signal });
    }

    if (command === '/status') {
      const jobs = this.queue.list({ limit: 100 });
      const counts = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});
      return this.telegram.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: '<b>Status</b>\n' +
          `Catálogo: ${this.catalog.isConfigured ? '✅ configurado' : '⚠️ sem token'}\n` +
          `Fila: ${counts.queued || 0} aguardando, ${counts.running || 0} ativos, ${counts.completed || 0} concluídos, ${counts.failed || 0} falhas`
      }, { signal });
    }

    if (command === '/fila') {
      const jobs = this.queue.list({ limit: 10 });
      const lines = jobs.length === 0 ? ['Fila vazia.'] : jobs.map(job =>
        `• <code>${escapeHtml(job.id.slice(0, 8))}</code> — ${escapeHtml(job.type)} — <b>${escapeHtml(job.status)}</b> (${job.progress || 0}%)`
      );
      return this.telegram.sendMessage({ chat_id: chatId, parse_mode: 'HTML', text: `<b>Fila</b>\n${lines.join('\n')}` }, { signal });
    }

    if (command === '/buscar') {
      if (!args) {
        return this.telegram.sendMessage({ chat_id: chatId, text: 'Uso: /buscar nome do anime' }, { signal });
      }
      if (!this.catalog.isConfigured) {
        return this.telegram.sendMessage({ chat_id: chatId, text: 'O catálogo ainda não foi configurado no servidor.' }, { signal });
      }
      const results = await this.catalog.searchSeries(args, { signal });
      if (results.length === 0) {
        return this.telegram.sendMessage({ chat_id: chatId, text: 'Nenhum resultado encontrado.' }, { signal });
      }
      return this.telegram.sendMessage({
        chat_id: chatId,
        text: `Resultados para “${args}”:`,
        reply_markup: seriesKeyboard(results)
      }, { signal });
    }
  }

  async #handleCallback(callback, signal) {
    const chatId = callback.message?.chat?.id;
    if (!chatId) return;
    await this.telegram.answerCallbackQuery({ callback_query_id: callback.id }, { signal }).catch(() => {});
    const [kind, id] = String(callback.data ?? '').split(':', 2);

    if (kind === 'series') {
      const [series, seasons] = await Promise.all([
        this.catalog.getSeries(id, { signal }),
        this.catalog.getSeasons(id, { signal })
      ]);
      return this.telegram.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `<b>${escapeHtml(series.title)}</b>\n${escapeHtml(compactText(series.description, 650))}\n\n` +
          `Temporadas: ${series.seasonCount ?? seasons.length} • Episódios: ${series.episodeCount ?? '—'}`,
        reply_markup: seasonKeyboard(seasons)
      }, { signal });
    }

    if (kind === 'season') {
      const episodes = await this.catalog.getEpisodes(id, { signal });
      const rows = episodes.slice(0, 30).map(ep => ([{
        text: `E${ep.episodeNumber ?? '?'} — ${ep.title}`.slice(0, 60),
        callback_data: `episode:${ep.id}`
      }]));
      return this.telegram.sendMessage({
        chat_id: chatId,
        text: episodes.length ? 'Selecione um episódio:' : 'Nenhum episódio encontrado.',
        reply_markup: episodes.length ? { inline_keyboard: rows } : undefined
      }, { signal });
    }

    if (kind === 'episode') {
      const job = this.queue.enqueue('episode-request', { episodeId: id }, { chatId });
      return this.telegram.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `Solicitação adicionada à fila: <code>${escapeHtml(job.id.slice(0, 8))}</code>.\n` +
          '<i>A camada de mídia protegida não é executada por esta base.</i>'
      }, { signal });
    }
  }
}

export { parseCommand };
