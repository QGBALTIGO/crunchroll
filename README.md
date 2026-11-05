# Crunchroll Bot

Base reorganizada para transformar os protótipos enviados em um bot Telegram sustentável, sem carregar segredos, binários ou dependências geradas dentro do Git.

## O que já funciona

- Telegram Bot API via long polling.
- `/start`, `/ajuda`, `/status`, `/buscar` e `/fila`.
- Navegação por série → temporada → episódio quando o catálogo está configurado.
- Fila persistente com concorrência configurável e recuperação após reinício.
- Allowlist opcional de chats.
- Retry/backoff para falhas temporárias.
- Testes unitários com `node --test`.

> A base deliberadamente não inclui rotinas de descriptografia de DRM, chaves privadas, material Widevine ou credenciais de conta. A camada de mídia deve ser conectada apenas a fontes autorizadas.

## Requisitos

- Node.js 20 ou superior.
- Um bot criado no BotFather.
- Opcional: access token de catálogo fornecido ao processo por um fluxo autorizado.

## Configuração

Copie `.env.example` para o mecanismo de variáveis do ambiente onde o bot será executado. Não faça commit de `.env`.

Variáveis principais:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `CRUNCHYROLL_ACCESS_TOKEN`
- `CRUNCHYROLL_LOCALE`
- `BOT_MAX_CONCURRENT_JOBS`
- `BOT_DATA_DIR`

## Executar

```bash
npm test
npm start
```

Não há dependências npm de runtime nesta fase; o projeto usa APIs nativas do Node.js.

## Estrutura

```text
src/
  app.js                        # roteamento dos comandos e callbacks
  config.js                     # configuração e validação
  index.js                      # bootstrap e shutdown
  providers/
    crunchyroll-catalog.js      # somente catálogo; sem DRM
  queue/
    job-queue.js                # fila persistente e concorrência
  telegram/
    bot-api.js                  # cliente HTTP da Bot API
    runner.js                   # long polling e allowlist
  utils/
    retry.js
    text.js

test/                           # testes unitários
docs/                           # análise dos pacotes e roadmap
config/default.json             # defaults não sensíveis
```

## Decisões de segurança

- Token do Telegram nunca é gravado automaticamente em arquivo.
- Senhas não são aceitas por comando de chat.
- Sessões MTProto não são usadas no núcleo.
- `widevine/`, chaves privadas, `.session`, executáveis, downloads e `node_modules` são ignorados pelo Git.
- Dados vindos do catálogo são escapados antes de entrar em mensagens HTML.

Veja [`docs/ANALISE_DOS_PACOTES.md`](docs/ANALISE_DOS_PACOTES.md) para a consolidação dos cinco pacotes e [`docs/ROADMAP.md`](docs/ROADMAP.md) para os próximos passos.
