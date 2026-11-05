# Roadmap do bot

## Fase 1 — base segura (concluída nesta revisão)

- Estrutura modular.
- Telegram Bot API.
- Busca e navegação de catálogo quando há token configurado.
- Fila persistente.
- Configuração somente por ambiente para segredos.
- Testes unitários.

## Fase 2 — experiência do bot

- Paginação de resultados e episódios.
- Cache de catálogo com TTL.
- Limites por usuário/chat.
- Comandos administrativos.
- Cancelamento e reprocessamento de jobs.
- Histórico com retenção configurável.
- Métricas e logs estruturados.

## Fase 3 — processamento de mídia autorizado

Criar uma interface `MediaProcessor` desacoplada do provedor de catálogo. Ela deve aceitar apenas fontes em que haja autorização de download/processamento, validar host, tamanho e MIME, usar diretórios temporários isolados e nunca persistir credenciais de conta.

## Fase 4 — produção

- Dockerfile enxuto.
- Healthcheck.
- Deploy em Railway/VPS.
- Banco persistente em vez de JSON quando houver volume.
- Alertas e observabilidade.
- Testes de carga e recuperação após reinício.
