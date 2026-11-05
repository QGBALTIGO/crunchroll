import { withRetry } from '../utils/retry.js';

export class CrunchyrollCatalogClient {
  constructor({ apiBase, accessToken, locale = 'pt-BR', userAgent = 'CrunchrollBot/0.2', fetchImpl = fetch }) {
    this.apiBase = String(apiBase).replace(/\/$/, '');
    this.accessToken = accessToken;
    this.locale = locale;
    this.userAgent = userAgent;
    this.fetch = fetchImpl;
  }

  get isConfigured() {
    return Boolean(this.accessToken);
  }

  async #get(relativePath, { signal } = {}) {
    if (!this.accessToken) {
      throw new Error('Catálogo não configurado. Defina CRUNCHYROLL_ACCESS_TOKEN.');
    }

    const url = relativePath.startsWith('http') ? relativePath : `${this.apiBase}${relativePath}`;
    return withRetry(async () => {
      const response = await this.fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent,
          Accept: 'application/json'
        },
        signal
      });
      const body = await response.text();
      if (!response.ok) {
        const error = new Error(`Catálogo respondeu HTTP ${response.status}.`);
        error.status = response.status;
        error.responseBody = body.slice(0, 500);
        throw error;
      }
      try {
        return JSON.parse(body);
      } catch {
        throw new Error('Resposta inválida do catálogo.');
      }
    }, {
      attempts: 3,
      signal,
      shouldRetry: error => !error?.status || error.status === 429 || error.status >= 500
    });
  }

  async searchSeries(query, { limit = 6, signal } = {}) {
    const clean = String(query ?? '').trim();
    if (!clean) return [];
    const q = encodeURIComponent(clean);
    const locale = encodeURIComponent(this.locale);
    const json = await this.#get(`/content/v2/discover/search?q=${q}&n=${Math.min(Math.max(limit, 1), 12)}&type=series&locale=${locale}`, { signal });
    const results = [];
    for (const category of json.data ?? []) {
      for (const item of category.items ?? []) {
        if (!item?.id) continue;
        results.push({
          id: item.id,
          title: item.title || 'Sem título',
          description: item.description || '',
          episodeCount: item.series_metadata?.episode_count ?? null
        });
      }
    }
    return results;
  }

  async getSeries(seriesId, { signal } = {}) {
    const id = encodeURIComponent(seriesId);
    const locale = encodeURIComponent(this.locale);
    const json = await this.#get(`/content/v2/cms/series/${id}?locale=${locale}`, { signal });
    const item = json.data?.[0] ?? {};
    return {
      id: item.id || seriesId,
      title: item.title || 'Sem título',
      description: item.description || '',
      seasonCount: item.series_metadata?.season_count ?? item.season_count ?? null,
      episodeCount: item.series_metadata?.episode_count ?? item.episode_count ?? null,
      audioLocales: item.series_metadata?.audio_locales ?? item.audio_locales ?? [],
      subtitleLocales: item.series_metadata?.subtitle_locales ?? item.subtitle_locales ?? []
    };
  }

  async getSeasons(seriesId, { signal } = {}) {
    const id = encodeURIComponent(seriesId);
    const locale = encodeURIComponent(this.locale);
    const json = await this.#get(`/content/v2/cms/series/${id}/seasons?locale=${locale}`, { signal });
    return (json.data ?? []).filter(item => item?.id).map(item => ({
      id: item.id,
      title: item.title || 'Temporada',
      seasonNumber: item.season_number ?? null
    }));
  }

  async getEpisodes(seasonId, { signal } = {}) {
    const id = encodeURIComponent(seasonId);
    const locale = encodeURIComponent(this.locale);
    const json = await this.#get(`/content/v2/cms/seasons/${id}/episodes?locale=${locale}`, { signal });
    return (json.data ?? []).filter(item => item?.id).map(item => ({
      id: item.id,
      title: item.title || 'Episódio',
      episodeNumber: item.episode ?? item.episode_number ?? null,
      seasonNumber: item.season_number ?? null,
      durationMs: item.duration_ms ?? null
    }));
  }
}
