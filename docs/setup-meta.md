# Configurando o app na Meta para o Falae

Este passo a passo é para quem **não é dev** — Gabriel ou Vanessa podem seguir sozinhos.
São configurações feitas no site da Meta (não no código). Faça nessa ordem.

Antes de começar, confirme: o domínio `falae.codigofonte.com.br` precisa estar com o
DNS apontando para o servidor onde o Falae vai rodar, e o Docker Compose do projeto
precisa estar no ar (o Caddy só consegue emitir o certificado HTTPS com o DNS já
resolvendo). Sem isso, os passos de webhook abaixo não vão funcionar.

## 1. Transformar a conta do Instagram em conta profissional

1. Abra o Instagram do canal → **Configurações** → **Conta**.
2. Toque em **"Mudar para conta profissional"** e escolha **Criador** ou **Empresa**
   (qualquer um dos dois funciona para a API).
3. Confirme que a conta está **pública** (não privada) — em **Configurações de
   privacidade**, "Conta privada" deve estar desligado. Sem isso, a Meta não entrega os
   webhooks de comentário.

## 2. Criar o app na Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com) e faça login com a
   conta do Facebook que vai administrar o app.
2. **Meus Apps** → **Criar App**.
3. Escolha o tipo **"Business"**.
4. Dê o nome **Falae** (ou "Falae — Código Fonte TV") e conclua a criação.

## 3. Adicionar o produto Instagram

1. Dentro do app criado, no menu lateral, clique em **Adicionar Produto**.
2. Procure **"Instagram"** e adicione.
3. Escolha o fluxo **"Instagram Login"** (também chamado de "Business Login for
   Instagram") — é o que usamos, não exige vincular a uma Página do Facebook.
4. Siga o assistente para conectar a conta profissional do canal ao app.

## 4. Adicionar a conta do canal como testadora ("Instagram tester")

Isso permite que o app funcione em modo Development (sem esperar aprovação da Meta),
já que vamos usar só a própria conta do canal.

1. No app, vá em **Funções do app** (App Roles) → **Testadores** (ou equivalente na
   seção do produto Instagram).
2. Adicione a conta do Instagram do canal como testadora.
3. **A conta precisa aceitar o convite** — normalmente chega uma notificação no próprio
   app do Instagram, ou em developers.facebook.com em "Convites".

## 5. Configurar a URL de redirecionamento do OAuth

1. Nas configurações do produto Instagram (ou em **Configurações do App** → **Básico**),
   procure o campo de **Redirect URI** / **URI de redirecionamento OAuth**.
2. Cadastre exatamente: `https://falae.codigofonte.com.br/api/auth/instagram/callback`
3. Salvar.

## 6. Configurar o webhook

1. Na seção **Webhooks** do app, assine o objeto **Instagram**.
2. **URL de callback**: `https://falae.codigofonte.com.br/api/webhooks/instagram`
3. **Verify token**: qualquer texto que você escolher (ex: gere um valor aleatório).
   Esse mesmo valor precisa ser colocado na variável de ambiente
   `META_WEBHOOK_VERIFY_TOKEN` do servidor (peça para o dev configurar, ou configure
   você mesmo no arquivo `.env` do servidor — veja `.env.example`).
4. Clique em **Verificar e salvar**. Se a URL já estiver no ar, a Meta faz uma checagem
   automática (o "desafio" do webhook) — se aparecer erro aqui, o mais comum é o site
   ainda não estar no ar com HTTPS válido, ou o verify token não bater com o do `.env`.
5. Na lista de campos do webhook, marque **`comments`** para receber notificações de
   novos comentários.

## 7. Anotar App ID e App Secret

1. Em **Configurações do App** → **Básico**, copie o **ID do aplicativo** e o **Chave
   secreta do aplicativo** (App Secret — pode pedir para confirmar sua senha do
   Facebook para revelar).
2. **Nunca** cole esses valores em nenhum arquivo do repositório de código. Eles vão
   direto nas variáveis de ambiente do servidor (`META_APP_ID`, `META_APP_SECRET` no
   `.env` — veja `.env.example`), que não é versionado no Git.

## 8. Permissões que o app vai pedir

Ao conectar a conta pelo painel do Falae, a tela de autorização da Meta vai pedir estas
permissões — é esperado, faz parte do fluxo "Instagram Login":

- `instagram_business_basic`
- `instagram_business_manage_messages` (necessária para enviar a DM)
- `instagram_business_manage_comments` (necessária para ler comentários e responder
  publicamente)

## 9. (Só no futuro, se o Falae passar a atender outros canais)

Enquanto o Falae só automatiza a própria conta do canal (via "Instagram tester"), **não
é necessário** submeter o app para App Review nem para Verificação Empresarial da Meta.
Isso só passa a ser obrigatório se um dia o Falae precisar operar em contas de terceiros
("Advanced Access"). Quando chegar essa hora, revise `docs/meta-api-notes.md` antes de
iniciar o processo, porque os requisitos da Meta mudam com frequência.

## Checklist rápido

- [ ] Conta do Instagram é profissional e pública
- [ ] App criado em developers.facebook.com (tipo Business)
- [ ] Produto Instagram adicionado (fluxo "Instagram Login")
- [ ] Conta do canal adicionada e aceita como testadora
- [ ] Redirect URI do OAuth cadastrado: `https://falae.codigofonte.com.br/api/auth/instagram/callback`
- [ ] Webhook cadastrado: `https://falae.codigofonte.com.br/api/webhooks/instagram`, campo `comments` marcado
- [ ] App ID, App Secret e Verify Token salvos no `.env` do servidor (nunca no código)
