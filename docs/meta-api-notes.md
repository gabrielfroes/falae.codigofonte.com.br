# Notas sobre a API da Meta (Instagram Platform)

> Pesquisado em 2026-07-30. A Meta versiona e muda essas APIs com frequência —
> **reconfirme os pontos abaixo na documentação oficial antes de implementar ou
> alterar qualquer integração**, não confie apenas neste arquivo.
>
> Fontes principais:
> - [Instagram Platform — Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks)
> - [Instagram Platform — Private Replies](https://developers.facebook.com/docs/instagram-platform/private-replies/)
> - [Instagram Platform — Overview](https://developers.facebook.com/docs/instagram-platform/overview/)

## Dois caminhos de autenticação

A Meta oferece dois jeitos de conectar uma conta Instagram Business/Creator. Escolhemos
**Instagram Login (Business Login for Instagram)** para o Falae porque não exige que a
conta esteja vinculada a uma Página do Facebook (mais simples para o canal).

| | Instagram Login (escolhido) | Facebook Login for Business |
|---|---|---|
| Exige Página do Facebook vinculada | Não | Sim |
| Permissões | `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`, `instagram_business_content_publish` | `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `pages_read_engagement`, `pages_show_list` |

## Requisitos de conta

- A conta do Instagram precisa ser **profissional** (Business ou Creator) — contas
  pessoais não têm acesso à API.
- A conta precisa ser **pública**. Contas privadas não geram webhook do campo
  `comments` (a Meta simplesmente não entrega o evento).

## OAuth

1. Usuário clica num link de autorização (embed URL) do app.
2. Meta abre janela de autorização, usuário concede as permissões.
3. Callback recebe um **authorization code** (válido por ~1 hora).
4. Trocar o code por um **access token de curta duração** (~1 hora).
5. Trocar o token de curta duração por um **token de longa duração**, válido por
   **60 dias**, renovável antes de expirar.

**Dois detalhes que já nos morderam em produção, confirmados testando de verdade:**

- O endpoint de autorização do fluxo "Instagram Login" é
  `https://api.instagram.com/oauth/authorize` — **não** `www.instagram.com`. Usar
  `www.instagram.com` redireciona pra uma tela de erro genérica "Invalid platform app"
  em vez do consentimento normal.
- `client_id`/`client_secret` nesse fluxo são o **Instagram App ID** / **Instagram App
  Secret**, mostrados na página do produto Instagram → "API setup with Instagram
  login" — **não** o App ID/Secret geral que aparece em Configurações do App → Básico.
  Usar o geral também produz "Invalid platform app". Ver `docs/setup-meta.md` passo 7.

Implicação prática: precisamos de um job periódico que verifique
`token_expires_at` de cada `Account` e renove tokens perto de expirar, alertando no
painel se a renovação falhar (token realmente expirado → conta cai para status
`expirado`, exige reconexão manual).

## Webhooks

- **Verificação (challenge)**: a Meta faz `GET` na URL do webhook com
  `hub.mode=subscribe`, `hub.challenge` (inteiro) e `hub.verify_token`. O endpoint deve
  responder com o valor de `hub.challenge` em texto puro se o `verify_token` bater com
  o configurado.
- **Assinatura de cada entrega**: header `X-Hub-Signature-256: sha256=<hmac>`, HMAC-SHA256
  do corpo bruto da requisição usando o **App Secret**. Toda requisição deve ter a
  assinatura validada antes de qualquer processamento — requisição com assinatura
  inválida é rejeitada (401/403) e logada, nunca processada.
- **Campo `comments`**: dispara em novos comentários em mídia (post/reel) da conta
  conectada. Requer Advanced Access na permissão de comentários correspondente ao
  caminho de auth escolhido.
- Responder **200 rapidamente** e delegar o processamento pesado para a fila — a Meta
  reenvia webhooks que demoram demais ou falham, o que é outra fonte de duplicidade além
  da reentrega natural (reforça a necessidade da idempotência via
  `external_comment_id` único).

## Private Reply (DM em resposta a um comentário)

- Endpoint: `POST /<IG_ID>/messages`
- Corpo: `{ "recipient": { "comment_id": "<id-do-comentario>" }, "message": { "text": "..." } }`
- **Janela de 7 dias**: só é possível enviar dentro de 7 dias a partir do comentário.
  Fora disso, a chamada falha — tratar como "expirado" no log, nunca falhar silenciosamente.
- **Uma única mensagem por comentário**: a própria Meta impede reenvio. Isso é uma
  segunda camada de proteção, não substitui nossa idempotência (que evita processar o
  mesmo comentário duas vezes já antes de chamar a API).
- Para comentários em **Instagram Live**, a resposta só é possível durante a
  transmissão ao vivo (janela bem mais curta) — fora do escopo do MVP, mas relevante se
  o canal automatizar lives no futuro.
- **Rate limit**: 750 chamadas/hora por conta profissional para private replies em
  posts/reels (100/s para Lives). O worker deve respeitar esse limite com throttling +
  backoff exponencial, e registrar `rate_limited` no log de `deliveries` quando bater
  no teto.

## Resposta pública ao comentário

- Endpoint separado: `POST /<ig-comment-id>/replies`
- Não tem a mesma restrição de "uma vez só" da private reply — mas o Falae deve
  registrar no `Event`/`Delivery` que já respondeu publicamente aquele comentário, para
  nunca duplicar em reentregas de webhook.

## App Review

- Sem App Review: o app em modo **Development** funciona normalmente para contas
  adicionadas como **"Instagram tester"** — suficiente para o MVP, já que é a própria
  conta do canal.
- **App Review + Business Verification** só são obrigatórios para **Advanced Access**
  no sentido de gerenciar contas de terceiros que não são do desenvolvedor/testers do
  app. Não é o caso do Falae hoje. Vira relevante na "fase futura" caso o Falae passe a
  atender outros canais.

## Pontos em aberto para reconfirmar antes de implementar (Fase 1)

- Nome exato e formato de erro retornado pela API quando: (a) a janela de 7 dias
  expirou, (b) o usuário já recebeu uma private reply para aquele comentário, (c) o
  rate limit foi excedido. Precisamos desses códigos para popular `motivo_falha` de
  forma legível.
- Confirmar a versão atual da Graph API a ser fixada em `GRAPH_API_VERSION` (exemplos
  encontrados na pesquisa referenciam `v25.0`; a Meta versiona trimestralmente).
- Confirmar se a variação com/sem acentos e emojis do texto do comentário chega
  normalizada do webhook ou precisa de normalização própria (assumindo que não — o
  matching de `keywords` deve normalizar no nosso lado).
