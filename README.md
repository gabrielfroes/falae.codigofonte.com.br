# Falae

SaaS interno do Código Fonte TV para automação de comment-to-DM no Instagram
(comentário com palavra-chave → resposta pública opcional + DM privada com link),
substituindo o ManyChat. Arquitetura com adapter por plataforma — Instagram no MVP,
YouTube e Facebook previstos para depois.

Passo a passo de configuração do app na Meta (contas, permissões, webhook):
[`docs/setup-meta.md`](docs/setup-meta.md). Notas sobre a API oficial da Meta usada
(versões, endpoints, limites): [`docs/meta-api-notes.md`](docs/meta-api-notes.md). Como
gerar as credenciais do login com Google: [`docs/setup-google-auth.md`](docs/setup-google-auth.md).

**Estado atual:** núcleo de automação (webhook, fila, adapter Instagram) e painel
(conexões, automações, atividade, configurações) implementados. Fluxo de conexão real
com o Instagram ainda depende de credenciais reais do app na Meta (veja
`docs/setup-meta.md`) — sem elas, a automação roda ponta a ponta localmente, mas o envio
de mensagens de verdade falha (esperado, ver `scripts/simulate-webhook.ts`).

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

```bash
cp .env.example .env
# preencha .env com os valores reais de produção

docker compose up -d --build
```

O Caddy cuida do certificado TLS automaticamente para `falae.codigofonte.com.br` — o
DNS do domínio precisa já apontar para o IP do VPS antes de subir.
