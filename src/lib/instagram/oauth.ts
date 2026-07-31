// Fluxo OAuth "Instagram Login" (Business Login for Instagram) — ver
// docs/meta-api-notes.md. Não foi testado contra a API real ainda (precisa
// de META_APP_ID/META_APP_SECRET reais); reconfirme os endpoints abaixo
// contra a documentação atual antes de usar em produção.

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

function getRedirectUri(): string {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/auth/instagram/callback`;
}

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForShortLivedToken(
  code: string,
): Promise<{ accessToken: string; igUserId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_message ?? "Falha ao trocar o code pelo token de curta duração");
  }
  return { accessToken: payload.access_token, igUserId: String(payload.user_id) };
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.META_APP_SECRET ?? "",
    access_token: shortLivedToken,
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao gerar o token de longa duração");
  }
  return { accessToken: payload.access_token, expiresInSeconds: payload.expires_in };
}

/**
 * Renova um token de longa duração antes que expire (janela de 60 dias).
 * Precisa ser chamado com um token ainda válido — não funciona depois que
 * já expirou (nesse caso a única saída é o usuário reconectar a conta).
 */
export async function refreshLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao renovar o token de acesso");
  }
  return { accessToken: payload.access_token, expiresInSeconds: payload.expires_in };
}

export async function fetchAccountProfile(accessToken: string): Promise<{ id: string; username: string }> {
  const params = new URLSearchParams({ fields: "id,username", access_token: accessToken });
  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao buscar o perfil da conta");
  }
  return { id: String(payload.id), username: payload.username };
}
