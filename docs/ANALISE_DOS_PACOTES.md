# Análise e consolidação dos cinco pacotes

Esta base foi criada a partir da comparação dos cinco arquivos recebidos em 05/11/2026.

## 1. `MundoAnimesDownloader.zip`

Pacote executável Windows já empacotado. Útil para confirmar a estrutura final e as dependências de runtime, mas inadequado como fonte do repositório por conter binários grandes, duplicações internas e artefatos gerados pelo empacotador.

## 2. `crunchyroll codigo bruto(2).zip`

Contém uma reconstrução em C# com separação de autenticação, catálogo, fila, legendas, webhooks e interface Avalonia. Foi usado como referência arquitetural, não como dependência direta, para evitar manter duas implementações concorrentes do mesmo núcleo.

## 3. `widevine e lib.zip`

Contém ferramentas binárias e material privado de dispositivo. Esses arquivos não pertencem ao controle de versão e foram explicitamente excluídos por `.gitignore`. Nenhuma chave privada foi copiada para este repositório.

## 4. `codigo fonte bot de downloader.zip`

Tinha a implementação de bot mais próxima do objetivo final, porém misturava C#, Node.js e Python, incluía `node_modules`, executáveis, sessão MTProto, configuração inválida e dados que não devem ser versionados. A nova base preserva o fluxo de bot, catálogo e fila, mas divide cada responsabilidade em módulo próprio.

## 5. `codigo fonte do executavel para download(1).zip`

Contém o código Python da interface desktop e ajudou a identificar problemas de estado, persistência e exposição de APIs internas. A nova base não incorpora a interface desktop; ela foi usada como referência para corrigir decisões de arquitetura no bot.

## Correções aplicadas nesta consolidação

- Remoção de segredos e credenciais do código-fonte.
- Remoção de `node_modules`, executáveis e arquivos de sessão do Git.
- Configuração por variáveis de ambiente, com `.env.example` sem valores reais.
- Allowlist opcional de chats do Telegram.
- Nenhuma senha de conta é solicitada ou enviada pelo Telegram.
- Cliente Telegram reduzido à Bot API HTTP, eliminando a necessidade de sessão MTProto no núcleo.
- Fila persistente em JSON com gravação atômica e recuperação após reinício.
- Concorrência de fila limitada e configurável.
- Retry com backoff para Telegram e catálogo.
- Escape de HTML antes de exibir dados externos no Telegram.
- Separação entre `telegram`, `providers`, `queue` e `utils`.
- Testes unitários sem dependências externas.

## Limite intencional

O repositório não inclui nem executa rotinas de obtenção de chaves, descriptografia de DRM ou material Widevine. A camada de mídia deve ser implementada somente para fontes e arquivos em que o operador tenha autorização de processamento.
