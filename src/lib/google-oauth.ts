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

/**
 * Lê a resposta como texto primeiro — se não for JSON válido (ex: o Google
 * devolveu uma página de erro genérica), ainda conseguimos logar o corpo
 * bruto em vez de mascarar tudo atrás de "Unexpected token".
 */
async function readJsonSafely(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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
  const payload = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(
      `Falha ao trocar o code pelo access token do Google (status ${response.status}, redirect_uri=${getRedirectUri()}): ${payload.error_description ?? payload.error ?? payload.raw ?? "erro desconhecido"}`,
    );
  }
  if (typeof payload.access_token !== "string") {
    throw new Error(`Google não retornou access_token (status ${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload.access_token;
}

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<{ email: string; emailVerified: boolean; nome: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(
      `Falha ao buscar informações da conta Google (status ${response.status}): ${(payload.error as { message?: string } | undefined)?.message ?? payload.raw ?? "erro desconhecido"}`,
    );
  }
  return {
    email: payload.email as string,
    emailVerified: payload.email_verified === true,
    nome: payload.name as string,
  };
}
