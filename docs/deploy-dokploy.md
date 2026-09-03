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
só com o **Start Command** diferente.

Migration não precisa de uma terceira Application nem de Start Command especial: o
`ENTRYPOINT` da imagem roda `prisma migrate deploy` automaticamente antes de qualquer
comando (`pnpm start`, `pnpm worker` ou qualquer outro), então acontece sozinho nas duas
Applications, sempre que o container sobe. `prisma migrate deploy` é seguro de rodar em
paralelo (usa lock no banco e só aplica o que estiver pendente).

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
4. **Start Command**: deixe em branco (usa o `CMD` padrão do Dockerfile, `pnpm start`)
   — não precisa configurar nada aqui.
5. **Port**: `3000` (a porta que o Next.js expõe dentro do container).
6. **Environment**: cole o `.env` de produção (baseado em `.env.example`), com:
   - `DATABASE_URL` e `REDIS_URL` apontando pros serviços dos passos 1 e 2;
   - `APP_URL=https://falae.codigofonte.com.br` — **exatamente** essa URL, com HTTPS e
     sem barra no final, porque é a partir dela que o app monta o redirect URI do
     OAuth do Google e do Instagram; se não bater com o que está cadastrado no Google
     Cloud Console / Meta, o login/conexão falha com "Bad Request";
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
3. **Start Command**: `pnpm worker`
4. **Port**: nenhuma — o worker não serve HTTP, não precisa de domínio.
5. **Environment**: exatamente as mesmas variáveis da Application do app (`DATABASE_URL`,
   `REDIS_URL`, `TOKEN_ENCRYPTION_KEY`, etc. — o worker precisa delas pra decifrar
   tokens e falar com a Graph API).
6. Deploy — **e confirme que ficou rodando** (status "running"/verde na UI, não só
   "criada"). É comum criar a Application e esquecer de dar o primeiro deploy/start
   nela — nesse caso o app funciona normal (webhook responde 200, enfileira o job), mas
   ninguém processa a fila: comentário recebido não vira DM, sem erro nenhum aparecer em
   lugar nenhum (o log de erro estaria no worker, que nunca chegou a rodar).

## Se o login com Google falhar com "Bad Request"

Normalmente é um dos dois:

- `APP_URL` não está exatamente igual ao domínio configurado no Dokploy (com `https://`,
  sem barra no final) — o redirect URI enviado ao Google não bate com o que foi
  cadastrado.
- A redirect URI `https://falae.codigofonte.com.br/api/auth/google/callback` não está
  cadastrada nas **URIs de redirecionamento autorizados** do Client ID OAuth no Google
  Cloud Console (ver `docs/setup-google-auth.md`, passo 3).

Os logs da Application do app (`console.error` no `[auth/google/callback]`) mostram o
status HTTP e o corpo da resposta do Google — use isso pra confirmar qual dos dois é.

## Se uma automação não dispara nada (sem erro visível em lugar nenhum)

O sintoma "criei a automação, comentei, e nada aconteceu — sem erro no log do app"
normalmente é a Application do **worker** não estar rodando (criada mas nunca
deployada/iniciada, ou caiu e não reiniciou). O app sozinho só recebe o webhook e
enfileira o job no Redis; quem faz o match de palavra-chave e manda a DM é o worker.
Confira:

1. Na UI do Dokploy, o status da Application "falae-worker" está "running"?
2. No log dela, tem a linha `[worker] rodando, aguardando jobs em comment-events,
   actions e token-refresh`? Se o log estiver vazio ou não existir, a Application nunca
   rodou de verdade.
3. Depois de confirmar que o worker está rodando, teste de novo — comentários antigos
   não reprocessam sozinhos, comente de novo ou use o botão "Testar" na automação.

## Checklist rápido

- [ ] Postgres e Redis criados como serviços separados no Dokploy
- [ ] Application "falae-app": Build Type Dockerfile, Start Command em branco (usa `pnpm start` do Dockerfile), porta 3000, domínio configurado, **rodando**
- [ ] Application "falae-worker": Build Type Dockerfile, Start Command `pnpm worker`, sem domínio, **rodando** (confira o log, não só que foi criada)
- [ ] `APP_URL` exatamente igual ao domínio configurado (`https://falae.codigofonte.com.br`, sem barra no final)
- [ ] Redirect URI cadastrada no Google Cloud Console e no app da Meta
- [ ] As duas Applications com o mesmo `.env`
