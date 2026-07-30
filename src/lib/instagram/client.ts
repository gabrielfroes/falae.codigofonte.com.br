// Cliente fino sobre a Graph API para as duas ações que o Falae dispara.
// Ver docs/meta-api-notes.md para o racional de cada endpoint/limite.

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION ?? "v23.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
