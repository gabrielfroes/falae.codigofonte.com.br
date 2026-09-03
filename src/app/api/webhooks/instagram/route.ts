import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/instagram/verify-signature";
import type { InstagramWebhookPayload } from "@/lib/instagram/webhook-types";
import { commentEventsQueue } from "@/lib/queue";

// GET: desafio de verificação do webhook (cadastro inicial na Meta).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: entrega de eventos. Responde 200 rápido e delega o processamento
// pesado para a fila — nunca fazer chamadas à Graph API aqui dentro.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET ?? "";

  if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    console.error("[webhook/instagram] assinatura inválida, requisição rejeitada", {
      signature,
      bodyPreview: rawBody.slice(0, 200),
    });
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[webhook/instagram] corpo não é JSON válido");
    return new Response("Bad request", { status: 400 });
  }

  // Log do payload bruto — o formato exato ainda não foi 100% confirmado
  // contra entregas reais (ver docs/meta-api-notes.md). Barato de manter e
  // já foi o que revelou o bug do "external_id=0".
  console.log("[webhook/instagram] payload recebido:", JSON.stringify(payload));

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const value = change.value;

      // Formato ainda não 100% confirmado contra entregas reais — se algum
      // campo esperado não vier, loga e pula esse item em vez de derrubar a
      // requisição inteira (Meta reentrega em cima de erro 500).
      if (!entry.id || !value?.id || !value.media?.id || !value.from?.id) {
        console.warn("[webhook/instagram] payload de comentário com formato inesperado, ignorando", {
          entryId: entry.id,
          change,
        });
        continue;
      }

      await commentEventsQueue.add(
        "process-comment",
        {
          accountExternalId: entry.id,
          commentId: value.id,
          mediaId: value.media.id,
          text: value.text,
          fromId: value.from.id,
          fromUsername: value.from.username ?? null,
          raw: change,
        },
        { jobId: value.id },
      );
    }
  }

  return new Response("OK", { status: 200 });
}
