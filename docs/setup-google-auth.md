# Configurando o login do painel com Google

O painel do Falae não tem cadastro nem senha — quem entra usa a própria conta Google, e
o acesso é controlado por uma lista de emails autorizados (`AUTH_ALLOWED_EMAILS` no
`.env`). Este passo a passo é para gerar o Client ID e o Client Secret no Google Cloud
Console.

## 1. Criar (ou reaproveitar) um projeto no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com).
2. Crie um projeto novo (ou use um existente do canal) em **Selecionar projeto** →
   **Novo projeto**.

## 2. Configurar a tela de consentimento OAuth

1. Menu lateral → **APIs e serviços** → **Tela de permissão OAuth**.
2. Tipo de usuário: **Externo** (não precisa de Google Workspace para isso — o controle
   de quem entra é feito pelo Falae via `AUTH_ALLOWED_EMAILS`, não pelo Google).
3. Preencha nome do app ("Falae"), email de suporte e email de contato do
   desenvolvedor.
4. Nos escopos, os padrões (`openid`, `email`, `profile`) já são suficientes — não
   precisa adicionar nenhum escopo sensível.
5. Em **Usuários de teste** (se o app ficar em modo "Testing"), adicione as contas do
   Gabriel e da Vanessa — sem isso, o Google bloqueia o login delas com "app não
   verificado". Alternativamente, publique o app (não exige verificação do Google para
   escopos básicos como esses).

## 3. Criar as credenciais (Client ID OAuth)

1. **APIs e serviços** → **Credenciais** → **Criar credenciais** → **ID do cliente
   OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Em **Origens JavaScript autorizadas**, adicione:
   ```
   https://falae.codigofonte.com.br
   ```
4. Em **URIs de redirecionamento autorizados**, adicione:
   ```
   https://falae.codigofonte.com.br/api/auth/google/callback
   ```
   Para testar localmente antes de ir pro ar, adicione também
   `http://localhost:3000/api/auth/google/callback`.
5. Salve e copie o **Client ID** e o **Client Secret**.

## 4. Configurar o `.env` do servidor

```bash
GOOGLE_CLIENT_ID=<o client id copiado acima>
GOOGLE_CLIENT_SECRET=<o client secret copiado acima>
AUTH_ALLOWED_EMAILS=gabriel.froes@gmail.com,vweberfroes@gmail.com
```

Para adicionar ou remover alguém do time, basta editar `AUTH_ALLOWED_EMAILS` e reiniciar
a aplicação — não precisa mexer no banco.

## Checklist rápido

- [ ] Tela de consentimento OAuth configurada (tipo Externo)
- [ ] Client ID OAuth criado (tipo Aplicativo da Web)
- [ ] Redirect URI cadastrado: `https://falae.codigofonte.com.br/api/auth/google/callback`
- [ ] `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` do servidor
- [ ] `AUTH_ALLOWED_EMAILS` com os emails do time
