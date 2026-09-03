# Falae

SaaS interno do Código Fonte TV para automação de comment-to-DM no Instagram
(comentário com palavra-chave → resposta pública opcional + DM privada com link),
substituindo o ManyChat. Arquitetura com adapter por plataforma — Instagram no MVP,
YouTube e Facebook previstos para depois.

Passo a passo de configuração do app na Meta (contas, permissões, webhook):
[`docs/setup-meta.md`](docs/setup-meta.md). Notas sobre a API oficial da Meta usada
(versões, endpoints, limites): [`docs/meta-api-notes.md`](docs/meta-api-notes.md). Como
gerar as credenciais do login com Google: [`docs/setup-google-auth.md`](docs/setup-google-auth.md).
Deploy em produção via Dokploy: [`docs/deploy-dokploy.md`](docs/deploy-dokploy.md).

**Estado atual:** núcleo de automação (webhook, fila, adapter Instagram), painel
(dashboard, conexões, automações, atividade, configurações) e robustez (retry com
backoff exponencial, idempotência entre tentativas, renovação automática de token)
implementados e testados em produção — conectar conta, enviar DM, resposta pública e
listar posts todos funcionando. **Falta um passo não-técnico**: comentários de
seguidores reais só disparam a automação depois que o app da Meta passar por App Review
e for pra modo Live (veja `docs/setup-meta.md`, seção 9) — enquanto isso, dá pra validar
o fluxo inteiro com o botão "Test" do webhook no painel da Meta ou com
`scripts/simulate-webhook.ts`.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- BullMQ + Redis (fila de jobs, throttling e retries)
- Docker Compose (app + worker + Postgres + Redis + Caddy com HTTPS automático)

## Rodando localmente

Pré-requisitos: Node 20+, `pnpm` (`corepack enable pnpm`), Docker.

```bash
cp .env.example .env
# edite .env com valores locais (para Postgres/Redis locais, veja docker-compose.yml)

pnpm install
pnpm db:migrate:dev   # cria o banco a partir de prisma/schema.prisma
pnpm dev              # app em http://localhost:3000
```

Em outro terminal, para rodar o worker (fila de jobs):

```bash
pnpm worker
```

Você vai precisar de um Postgres e um Redis rodando localmente. O jeito mais simples é
subir só essas duas dependências via Docker Compose:

```bash
docker compose up postgres redis
# se a porta 5432 já estiver em uso na sua máquina:
# POSTGRES_HOST_PORT=5433 docker compose up postgres redis
```

## Painel — login

Não existe cadastro nem senha — o login é feito com Google, e só entra quem estiver na
lista `AUTH_ALLOWED_EMAILS` do `.env` (o usuário é criado automaticamente no primeiro
login de um email autorizado). Veja [`docs/setup-google-auth.md`](docs/setup-google-auth.md)
para gerar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.

Para testar o painel com dados de exemplo (uma conta e uma automação fake, sem depender
da Meta):

```bash
pnpm db:seed
```

## Testes automatizados

```bash
pnpm test        # roda uma vez
pnpm test:watch  # modo watch
```

Cobre os caminhos críticos: matching de palavras-chave (acento/emoji/exato/contém),
verificação de assinatura do webhook, allowlist de login, e idempotência do
processamento de comentários (reentrega do mesmo `comment_id` não duplica nem
reenfileira ação).

## Testando webhooks da Meta localmente

Webhooks exigem uma URL HTTPS pública — a Meta não entrega para `localhost`. Para
desenvolver localmente, exponha sua porta 3000 com um túnel e use essa URL temporária
no cadastro do webhook (só durante o desenvolvimento; em produção use
`https://falae.codigofonte.com.br`, fixo). Duas opções:

### ngrok

```bash
ngrok http 3000
```

### Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Copie a URL HTTPS gerada e cadastre `https://<url-do-túnel>/api/webhooks/instagram`
como URL do webhook no app da Meta (veja `docs/setup-meta.md`).

## Deploy (produção)

Duas formas de subir em produção, dependendo de onde:

**VPS próprio, tudo num compose só** (`docker-compose.yml`, com Postgres, Redis e Caddy
inclusos):

```bash
cp .env.example .env
# preencha .env com os valores reais de produção

docker compose up -d --build
```

O Caddy cuida do certificado TLS automaticamente para `falae.codigofonte.com.br` — o
DNS do domínio precisa já apontar para o IP do VPS antes de subir.

**Dokploy** (Build Type Dockerfile, Postgres/Redis como serviços separados no Dokploy,
domínio/HTTPS pelo Traefik embutido dele): veja o passo a passo em
[`docs/deploy-dokploy.md`](docs/deploy-dokploy.md).
