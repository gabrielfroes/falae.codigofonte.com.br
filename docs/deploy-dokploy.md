# Deploy no Dokploy

Este guia cobre o deploy do Falae no [Dokploy](https://dokploy.com) com Postgres e
Redis como serviços separados (não gerenciados pelo compose desta aplicação) e o
Traefik embutido do Dokploy cuidando de domínio/HTTPS.

Para rodar localmente, nada muda — continue usando `docker-compose.yml` e o
[`README.md`](../README.md) normalmente. Este arquivo é só sobre o `docker-compose.dokploy.yml`.

## 1. Criar o Postgres no Dokploy

1. No projeto do Dokploy, **Create Service** → **Database** → **PostgreSQL**.
2. Defina usuário, senha e nome do banco (ex: `falae`).
3. Depois de criado, copie a **connection string interna** que o Dokploy mostra (algo
   como `postgresql://falae:<senha>@<nome-do-serviço>:5432/falae`) — é esse valor que
   vai em `DATABASE_URL`.

## 2. Criar o Redis no Dokploy

1. **Create Service** → **Database** → **Redis**.
2. Copie a connection string interna (`redis://<nome-do-serviço>:6379`) — vai em
   `REDIS_URL`.

Serviços de banco do Dokploy no mesmo projeto ficam na mesma rede Docker interna, então
a aplicação do Falae consegue alcançá-los pelo nome do serviço sem expor porta nenhuma
para fora.

## 3. Criar a aplicação do Falae

1. **Create Service** → **Compose** (ou **Application** com tipo Docker Compose,
   dependendo da versão do Dokploy).
2. Aponte para este repositório e selecione **`docker-compose.dokploy.yml`** como
   arquivo de compose (não o `docker-compose.yml` — esse é só para desenvolvimento
   local e inclui Postgres/Redis/Caddy próprios, que aqui não usamos).
3. Em **Environment**, cole o conteúdo do seu `.env` de produção (veja
   `.env.example`), com:
   - `DATABASE_URL` e `REDIS_URL` apontando para os serviços criados nos passos 1 e 2;
   - `APP_URL=https://falae.codigofonte.com.br`;
   - as demais variáveis (`TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`,
     `AUTH_ALLOWED_EMAILS`, `META_APP_ID`/`SECRET`, `META_WEBHOOK_VERIFY_TOKEN`,
     `GRAPH_API_VERSION`) — ver `docs/setup-meta.md` e `docs/setup-google-auth.md`.
4. Faça o deploy. O Dokploy vai buildar a imagem (Dockerfile na raiz do repo) e subir
   os três serviços do compose: `migrate` (roda as migrations e sai), `app` e `worker`.

## 4. Configurar o domínio

1. Na aba **Domains** do serviço de compose, adicione `falae.codigofonte.com.br`
   apontando para o serviço `app`, porta **3000** (a porta que o Next.js expõe dentro
   do container — ver `Dockerfile`).
2. Ative HTTPS/Let's Encrypt automático pela própria UI do Dokploy — não precisa
   configurar nada relacionado a certificado no compose desta aplicação, o Traefik do
   Dokploy cuida disso.
3. Confirme que o DNS de `falae.codigofonte.com.br` já aponta para o servidor do
   Dokploy antes de ativar o certificado.

## Diferenças em relação ao `docker-compose.yml` (local)

| | `docker-compose.yml` (local) | `docker-compose.dokploy.yml` (produção) |
|---|---|---|
| Postgres | serviço próprio no compose | serviço separado no Dokploy |
| Redis | serviço próprio no compose | serviço separado no Dokploy |
| Reverse proxy / HTTPS | Caddy, no próprio compose | Traefik embutido do Dokploy, via UI |
| `migrate`, `app`, `worker` | iguais | iguais |
