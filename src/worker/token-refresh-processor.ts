import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshLongLivedToken } from "@/lib/instagram/oauth";

const RENOVAR_ANTES_DE_DIAS = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Roda periodicamente (ver src/worker.ts): renova o token de contas que
 * vencem em menos de RENOVAR_ANTES_DE_DIAS. Se a renovação falhar (token já
 * expirado, revogado etc.), marca a conta como "expirado" — isso aparece
 * na tela de Conexões e exige reconexão manual, nunca falha silenciosamente.
 */
export async function processTokenRefresh(): Promise<void> {
  const limite = new Date(Date.now() + RENOVAR_ANTES_DE_DIAS * DIA_MS);
  const contas = await prisma.account.findMany({
    where: { status: "conectado", tokenExpiresAt: { lte: limite } },
  });

  for (const conta of contas) {
    try {
      const tokenAtual = decryptToken(conta.accessTokenEncrypted);
      const { accessToken, expiresInSeconds } = await refreshLongLivedToken(tokenAtual);
      await prisma.account.update({
        where: { id: conta.id },
        data: {
          accessTokenEncrypted: encryptToken(accessToken),
          tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        },
      });
      console.log(`[token-refresh] token renovado para @${conta.username}`);
    } catch (error) {
      console.error(`[token-refresh] falha ao renovar token de @${conta.username}:`, error);
      await prisma.account.update({ where: { id: conta.id }, data: { status: "expirado" } });
    }
  }
}
