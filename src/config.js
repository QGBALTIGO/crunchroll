import fs from 'node:fs';
import path from 'node:path';

function parseInteger(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseIdList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => Number(item))
    .filter(Number.isSafeInteger);
}

function readDefaultConfig(rootDir) {
  const file = path.join(rootDir, 'config', 'default.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

export function loadConfig({ env = process.env, rootDir = process.cwd() } = {}) {
  const defaults = readDefaultConfig(rootDir);
  const botToken = String(env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const allowedChatIds = parseIdList(env.TELEGRAM_ALLOWED_CHAT_IDS);
  const accessToken = String(env.CRUNCHYROLL_ACCESS_TOKEN ?? '').trim();
  const apiBase = String(env.CRUNCHYROLL_API_BASE ?? 'https://beta-api.crunchyroll.com').replace(/\/$/, '');
  const locale = String(env.CRUNCHYROLL_LOCALE ?? defaults.locale ?? 'pt-BR').trim() || 'pt-BR';
  const userAgent = String(env.CRUNCHYROLL_USER_AGENT ?? 'CrunchrollBot/0.2').trim() || 'CrunchrollBot/0.2';
  const pollTimeoutSeconds = parseInteger(env.BOT_POLL_TIMEOUT_SECONDS, defaults.pollTimeoutSeconds ?? 25, { min: 1, max: 50 });
  const maxConcurrentJobs = parseInteger(env.BOT_MAX_CONCURRENT_JOBS, defaults.maxConcurrentJobs ?? 2, { min: 1, max: 8 });
  const dataDir = path.resolve(rootDir, String(env.BOT_DATA_DIR ?? '.data'));

  return {
    telegram: { botToken, allowedChatIds, pollTimeoutSeconds },
    crunchyroll: { accessToken, apiBase, locale, userAgent },
    queue: { maxConcurrentJobs, dataDir }
  };
}

export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.telegram.botToken) errors.push('TELEGRAM_BOT_TOKEN não configurado.');
  if (config.telegram.allowedChatIds.length === 0) {
    warnings.push('TELEGRAM_ALLOWED_CHAT_IDS vazio: o bot aceitará qualquer chat. Para produção, configure uma allowlist.');
  }
  if (!config.crunchyroll.accessToken) {
    warnings.push('CRUNCHYROLL_ACCESS_TOKEN não configurado: comandos de catálogo ficarão indisponíveis.');
  }

  return { errors, warnings, ok: errors.length === 0 };
}
