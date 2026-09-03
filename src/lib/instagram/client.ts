// Cliente fino sobre a Graph API para as duas ações que o Falae dispara.
// Ver docs/meta-api-notes.md para o racional de cada endpoint/limite.
//
// graph.instagram.com, não graph.facebook.com — tokens emitidos pelo fluxo
// "Instagram Login" (o que usamos, ver src/lib/instagram/oauth.ts) só
// funcionam contra graph.instagram.com. graph.facebook.com é pro fluxo
// "Facebook Login for Business" (conta vinculada a uma Página), que não é
// o nosso caso. Usar o host errado aqui fazia "conectar" funcionar (isso
// usa api.instagram.com) mas toda chamada posterior — enviar DM, resposta
// pública, listar posts — falhar silenciosamente.
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION ?? "v23.0";
const GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

async function callGraphApi(path: string, body: Record<string, unknown>, accessToken: string) {
  const url = `${GRAPH_API_BASE}${path}?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as GraphErrorBody & Record<string, unknown>;

  if (!response.ok) {
    const message = payload.error?.message ?? `Graph API retornou status ${response.status}`;
    throw new InstagramApiError(message, payload);
  }

  return payload;
}

/**
 * Envia a DM privada em resposta a um comentário ("private reply").
 * Janela de 7 dias a partir do comentário; só uma mensagem por comentário
 * (a própria Meta bloqueia reenvio) — ver docs/meta-api-notes.md.
 */
export async function sendPrivateReply(params: {
  igAccountId: string;
  commentId: string;
  text: string;
  accessToken: string;
}): Promise<{ externalMessageId: string | null }> {
  const result = await callGraphApi(
    `/${params.igAccountId}/messages`,
    {
      recipient: { comment_id: params.commentId },
      message: { text: params.text },
    },
    params.accessToken,
  );
  return { externalMessageId: (result.message_id as string | undefined) ?? null };
}

/** Resposta pública ao comentário (endpoint separado da private reply). */
export async function sendPublicReply(params: {
  commentId: string;
  text: string;
  accessToken: string;
}): Promise<{ externalMessageId: string | null }> {
  const result = await callGraphApi(
    `/${params.commentId}/replies`,
    { message: params.text },
    params.accessToken,
  );
  return { externalMessageId: (result.id as string | undefined) ?? null };
}

export interface InstagramMedia {
  id: string;
  caption: string | null;
  mediaType: string;
  displayUrl: string;
  permalink: string;
  timestamp: string;
}

interface GraphMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

/**
 * Últimos posts/reels da conta, para o seletor visual de posts na criação
 * de automações. Reels/vídeos só têm `thumbnail_url`; imagens usam
 * `media_url` diretamente.
 */
export async function fetchRecentMedia(igAccountId: string, accessToken: string, limit = 24): Promise<InstagramMedia[]> {
  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: String(limit),
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new InstagramApiError(payload.error?.message ?? `Graph API retornou status ${response.status}`, payload);
  }

  return ((payload.data ?? []) as GraphMediaItem[]).map((item) => ({
    id: item.id,
    caption: item.caption ?? null,
    mediaType: item.media_type,
    displayUrl: item.thumbnail_url ?? item.media_url ?? "",
    permalink: item.permalink,
    timestamp: item.timestamp,
  }));
}

/**
 * Classifica o erro da Graph API num motivo legível + status de delivery.
 * Os códigos exatos de erro ainda não foram confirmados contra a API real
 * (ver "pontos em aberto" em docs/meta-api-notes.md) — por ora, classifica
 * heuristicamente pelo texto da mensagem e sempre guarda a mensagem crua.
 */
export function classifyInstagramError(error: unknown): {
  status: "expirado" | "rate_limited" | "falhou";
  motivo: string;
} {
  const message = error instanceof InstagramApiError ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return { status: "rate_limited", motivo: message };
  }
  if (lower.includes("expired") || lower.includes("7 day") || lower.includes("time window")) {
    return { status: "expirado", motivo: message };
  }
  return { status: "falhou", motivo: message };
}
