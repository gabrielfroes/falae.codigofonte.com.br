import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { isEmailAllowed } from "@/lib/allowlist";
import { exchangeCodeForAccessToken, fetchGoogleUserInfo } from "@/lib/google-oauth";

const STATE_COOKIE = "falae_google_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (errorParam) {
    redirect("/login?erro=cancelado");
  }
  if (!code || !state || state !== expectedState) {
    redirect("/login?erro=estado_invalido");
  }

  let email: string;
  let emailVerified: boolean;
  let nome: string;
  try {
    const accessToken = await exchangeCodeForAccessToken(code);
    ({ email, emailVerified, nome } = await fetchGoogleUserInfo(accessToken));
  } catch (error) {
    console.error("[auth/google/callback] falha ao autenticar com o Google:", error);
    redirect("/login?erro=falha_login");
  }

  if (!emailVerified || !isEmailAllowed(email)) {
    redirect("/login?erro=nao_autorizado");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { nome },
    create: { email, nome, role: "admin" },
  });

  await createSession(user.id);
  redirect("/conexoes");
}
