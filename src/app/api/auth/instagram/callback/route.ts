import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { subscribeAccountToWebhooks } from "@/lib/instagram/client";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchAccountProfile,
} from "@/lib/instagram/oauth";

const STATE_COOKIE = "falae_oauth_state";

export async function GET(request: NextRequest) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (errorParam) {
    redirect(`/conexoes?erro=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !state || state !== expectedState) {
    redirect("/conexoes?erro=estado_invalido");
  }

  try {
    const { accessToken: shortLivedToken } = await exchangeCodeForShortLivedToken(code);
    const { accessToken: longLivedToken, expiresInSeconds } =
      await exchangeForLongLivedToken(shortLivedToken);
    const profile = await fetchAccountProfile(longLivedToken);

    await prisma.account.upsert({
      where: { platform_externalId: { platform: "instagram", externalId: profile.id } },
      update: {
        username: profile.username,
        accessTokenEncrypted: encryptToken(longLivedToken),
        tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        status: "conectado",
      },
      create: {
        platform: "instagram",
        externalId: profile.id,
        username: profile.username,
        accessTokenEncrypted: encryptToken(longLivedToken),
        tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        status: "conectado",
      },
    });

    // Sem isso, o webhook fica configurado certinho no App Dashboard e a
    // Meta simplesmente nunca entrega nada pra essa conta — descoberto
    // testando em produção. Ver o comentário em subscribeAccountToWebhooks.
    await subscribeAccountToWebhooks(profile.id, longLivedToken);
  } catch (error) {
    console.error("[auth/instagram/callback] falha ao conectar conta:", error);
    redirect("/conexoes?erro=falha_conexao");
  }

  redirect("/conexoes?conectado=1");
}
