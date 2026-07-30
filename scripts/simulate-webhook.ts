// Simula uma entrega de webhook de comentário da Meta, assinada corretamente,
// contra o servidor local (precisa de `pnpm dev` rodando + `pnpm db:seed`
// já executado). Útil para testar o fluxo ponta a ponta sem depender da API
// real da Meta.
//
// Uso:
//   pnpm simulate:webhook
//   pnpm simulate:webhook "quero o link" meu-comment-id-fixo   # repita o mesmo id para testar idempotência
//   pnpm simulate:webhook "gostei do video"                    # texto sem keyword -> "sem_match"

import { createHmac, randomUUID } from "node:crypto";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const APP_SECRET = process.env.META_APP_SECRET;
const ACCOUNT_EXTERNAL_ID = "17841400000000000"; // mesma conta criada em prisma/seed.ts

async function main() {
  if (!APP_SECRET) {
    throw new Error("META_APP_SECRET não configurado no .env");
  }

  const text = process.argv[2] ?? "quero o link, por favor!";
  const commentId = process.argv[3] ?? `test-comment-${randomUUID()}`;

  const payload = {
    object: "instagram",
    entry: [
      {
        id: ACCOUNT_EXTERNAL_ID,
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "comments",
            value: {
              id: commentId,
              text,
              from: { id: "9999999999999", username: "seguidor_teste" },
              media: { id: "18000000000000000", media_product_type: "FEED" },
            },
          },
        ],
      },
    ],
  };

  const rawBody = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex")}`;

  const response = await fetch(`${APP_URL}/api/webhooks/instagram`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
    body: rawBody,
  });

  console.log(`POST /api/webhooks/instagram -> ${response.status}`);
  console.log(`comment_id enviado: ${commentId}`);
  console.log(await response.text());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
