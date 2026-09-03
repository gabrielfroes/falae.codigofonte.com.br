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

1. No menu lateral, expanda **Instagram** e clique em **"API setup with Instagram
   login"** (Configuração da API com login do Instagram) — é uma página separada das
   Configurações gerais do App, específica do produto Instagram.
2. Procure o campo de **Redirect URI** / **URI de redirecionamento OAuth** nessa página
   e cadastre exatamente: `https://falae.codigofonte.com.br/api/auth/instagram/callback`
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

## 7. Anotar o Instagram App ID e o Instagram App Secret

**Atenção — é o valor errado que mais gera erro nesse passo.** Não use o "ID do
aplicativo" geral que aparece em **Configurações do App → Básico** — esse é o App ID da
Meta, não o do Instagram, e usá-lo aqui faz o app cair numa tela de erro "Invalid
platform app" na hora de conectar.

1. Na mesma página do passo anterior (**Instagram → API setup with Instagram login**),
   procure os campos **Instagram app ID** e **Instagram app secret** (pode pedir para
   confirmar sua senha do Facebook para revelar o secret).
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

## 9. App Review — necessário mesmo só automatizando a própria conta

**Correção importante**: diferente do que este guia dizia antes, o App Review **é
necessário**, mesmo o Falae operando só na própria conta do canal. Confirmado testando
em produção: com o app em modo Development, o botão "Test" do webhook no painel da Meta
funciona normalmente, mas um **comentário real de um seguidor não dispara nada** — a
Meta só entrega webhook de interações feitas por contas que são testadoras/admins/
desenvolvedoras do próprio app. Como o público do canal não tem (nem deveria ter) papel
nenhum no app da Meta, o Falae não funciona de verdade em produção até o app estar em
modo **Live**, o que exige passar pelo App Review.

O que isso envolve (o processo pode mudar — confirme na documentação atual antes de
começar):

1. **Verificação Empresarial** (Business Verification) — documentos legais da empresa/MEI
   dona do canal.
2. Uma **Política de Privacidade** publicada (URL pública) e uma **URL de exclusão de
   dados** (Data Deletion) funcionando.
3. Um **vídeo de tela** mostrando o fluxo completo: conectar a conta pelo painel do
   Falae, um comentário disparando a resposta pública + DM.
4. Submeter pra revisão pedindo as permissões `instagram_business_manage_comments` e
   `instagram_business_manage_messages`. A Meta leva de 2 a 4 semanas pra revisar.

Enquanto isso não acontece, dá pra continuar testando o fluxo inteiro usando o botão
"Test" do webhook no painel da Meta (simula um comentário) ou o
`scripts/simulate-webhook.ts` do repositório — só não vai funcionar com comentários
reais de seguidores até o app estar Live.

## Checklist rápido

- [ ] Conta do Instagram é profissional e pública
- [ ] App criado em developers.facebook.com (tipo Business)
- [ ] Produto Instagram adicionado (fluxo "Instagram Login")
- [ ] Conta do canal adicionada e aceita como testadora
- [ ] Redirect URI do OAuth cadastrado: `https://falae.codigofonte.com.br/api/auth/instagram/callback`
- [ ] Webhook cadastrado: `https://falae.codigofonte.com.br/api/webhooks/instagram`, campo `comments` marcado
- [ ] **Instagram** App ID, Instagram App Secret (não o App ID/Secret geral da Meta) e Verify Token salvos no `.env` do servidor (nunca no código)
- [ ] App submetido para App Review e aprovado (modo Live) — sem isso, comentários reais de seguidores não disparam nada, só o botão "Test" do webhook funciona
