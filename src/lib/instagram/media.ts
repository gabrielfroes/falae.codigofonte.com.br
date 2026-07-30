import { decryptToken } from "@/lib/crypto";
import { fetchRecentMedia, type InstagramMedia } from "@/lib/instagram/client";
import type { Account } from "@prisma/client";

/**
 * Busca os posts recentes de cada conta para o seletor visual da automação.
 * Nunca lança — se a conta não tiver um token válido (ex: dado de teste,
 * token expirado), retorna a lista vazia com o motivo, e a UI mostra que não
 * deu pra carregar em vez de quebrar a página inteira.
 */
export async function fetchMediaByAccount(
  accounts: Account[],
): Promise<Record<string, { items: InstagramMedia[]; erro: string | null }>> {
  const entries = await Promise.all(
    accounts.map(async (account) => {
      try {
        const accessToken = decryptToken(account.accessTokenEncrypted);
        const items = await fetchRecentMedia(account.externalId, accessToken);
        return [account.id, { items, erro: null }] as const;
      } catch (error) {
        const motivo = error instanceof Error ? error.message : "Falha desconhecida";
        return [account.id, { items: [], erro: motivo }] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
