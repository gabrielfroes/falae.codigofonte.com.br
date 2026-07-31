# Deploy no Dokploy

Este guia cobre o deploy do Falae no [Dokploy](https://dokploy.com) usando **Build Type:
Dockerfile** (não Docker Compose), com Postgres e Redis como serviços separados e o
Traefik embutido do Dokploy cuidando de domínio/HTTPS.

Para rodar localmente, nada muda — continue usando `docker-compose.yml` e o
[`README.md`](../README.md) normalmente.

## Por que duas Applications

Com Build Type Dockerfile, cada Application do Dokploy roda **um container** a partir
da imagem gerada pelo `Dockerfile` deste repo. O Falae precisa de dois processos de
longa duração — o servidor web (`pnpm start`) e o worker da fila (`pnpm worker`) — então
são **duas Applications separadas**, ambas apontando pro mesmo repositório/Dockerfile,
só com o **Start Command** diferente. Não existe uma terceira Application só pra
migration: cada uma roda `pnpm db:migrate` antes do processo principal, no próprio Start
Command (`prisma migrate deploy` é seguro de rodar mais de uma vez / em paralelo — ele
usa um lock no banco e só aplica o que estiver pendente).

## 1. Criar o Postgres no Dokploy

1. No projeto do Dokploy, **Create Service** → **Database** → **PostgreSQL**.
2. Defina usuário, senha e nome do banco (ex: `falae`).
3. Copie a **connection string interna** (algo como
   `postgresql://falae:<senha>@<nome-do-serviço>:5432/falae`) — vai em `DATABASE_URL`.

## 2. Criar o Redis no Dokploy

1. **Create Service** → **Database** → **Redis**.
2. Copie a connection string interna (`redis://<nome-do-serviço>:6379`) — vai em
   `REDIS_URL`.

## 3. Criar a Application do app web

1. **Create Service** → **Application**.
2. **Source**: aponte pro repositório e branch (`main`).
3. **Build Type**: `Dockerfile` (o Dokploy detecta o `Dockerfile` na raiz do repo
   automaticamente).
4. **Start Command** (em Advanced/General, sobrescreve o `CMD` do Dockerfile):
   `sh -c "pnpm db:migrate && pnpm start"`
5. **Port**: `3000` (a porta que o Next.js expõe dentro do container).
6. **Environment**: cole o `.env` de produção (baseado em `.env.example`), com:
   - `DATABASE_URL` e `REDIS_URL` apontando pros serviços dos passos 1 e 2;
   - `APP_URL=https://falae.codigofonte.com.br`;
   - as demais variáveis (`TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`,
     `AUTH_ALLOWED_EMAILS`, `META_APP_ID`/`SECRET`, `META_WEBHOOK_VERIFY_TOKEN`,
     `GRAPH_API_VERSION`) — ver `docs/setup-meta.md` e `docs/setup-google-auth.md`.
7. **Domains**: adicione `falae.codigofonte.com.br` apontando pra essa Application na
   porta 3000, e ative HTTPS/Let's Encrypt automático pela própria UI — o Traefik do
   Dokploy cuida do certificado, nada a configurar aqui. Confirme que o DNS do domínio
   já aponta pro servidor do Dokploy antes de ativar o certificado.
8. Deploy.

## 4. Criar a Application do worker

1. **Create Service** → **Application**, apontando pro **mesmo repositório**.
2. **Build Type**: `Dockerfile`.
3. **Start Command**: `sh -c "pnpm db:migrate && pnpm worker"`
4. **Port**: nenhuma — o worker não serve HTTP, não precisa de domínio.
5. **Environment**: exatamente as mesmas variáveis da Application do app (`DATABASE_URL`,
   `REDIS_URL`, `TOKEN_ENCRYPTION_KEY`, etc. — o worker precisa delas pra decifrar
   tokens e falar com a Graph API).
6. Deploy.

## Checklist rápido

- [ ] Postgres e Redis criados como serviços separados no Dokploy
- [ ] Application "falae-app": Build Type Dockerfile, Start Command com `db:migrate && start`, porta 3000, domínio configurado
- [ ] Application "falae-worker": Build Type Dockerfile, Start Command com `db:migrate && worker`, sem domínio
- [ ] As duas Applications com o mesmo `.env` (exceto se você quiser nomes diferentes de serviço, mas os valores são os mesmos)
