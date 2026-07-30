// Login do painel via Google OAuth (OpenID Connect). Ver
// docs/setup-google-auth.md para como gerar o Client ID/Secret no Google
// Cloud Console e cadastrar a redirect URI abaixo.

const SCOPES = "openid email profile";

function getRedirectUri(): string {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/auth/google/callback`;
}

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description ?? "Falha ao trocar o code pelo access token do Google");
  }
  return payload.access_token;
}

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<{ email: string; emailVerified: boolean; nome: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao buscar informações da conta Google");
  }
  return { email: payload.email, emailVerified: payload.email_verified === true, nome: payload.name };
}
