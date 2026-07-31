// Entrypoint do processo worker — consome as filas BullMQ populadas pela
// rota de webhook. Roda como um container separado no docker-compose.

import { Worker } from "bullmq";
import { ACTIONS_QUEUE, COMMENT_EVENTS_QUEUE, TOKEN_REFRESH_QUEUE, redisConnection, tokenRefreshQueue } from "@/lib/queue";
import { processCommentEvent } from "@/worker/comment-events-processor";
import { processAction } from "@/worker/actions-processor";
import { processTokenRefresh } from "@/worker/token-refresh-processor";

const DIA_MS = 24 * 60 * 60 * 1000;

const commentEventsWorker = new Worker(COMMENT_EVENTS_QUEUE, processCommentEvent, {
  connection: redisConnection,
  concurrency: 5,
});

// Throttle conservador para respeitar o rate limit de private reply da Meta
// (750/h por conta para posts/reels) até termos limitação por conta.
const actionsWorker = new Worker(ACTIONS_QUEUE, processAction, {
  connection: redisConnection,
  concurrency: 5,
  limiter: { max: 60, duration: 60_000 },
});

const tokenRefreshWorker = new Worker(TOKEN_REFRESH_QUEUE, processTokenRefresh, {
  connection: redisConnection,
  concurrency: 1,
});

for (const worker of [commentEventsWorker, actionsWorker, tokenRefreshWorker]) {
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} da fila ${worker.name} falhou:`, err);
  });
}

async function agendarRenovacaoDeToken(): Promise<void> {
  // jobId fixo pra não duplicar o agendamento a cada restart do worker.
  await tokenRefreshQueue.add(
    "check-tokens",
    {},
    { jobId: "token-refresh-diario", repeat: { every: DIA_MS }, removeOnComplete: true },
  );
}

agendarRenovacaoDeToken()
  .then(() => console.log("[worker] renovação de token agendada (diária)"))
  .catch((error) => console.error("[worker] falha ao agendar renovação de token:", error));

console.log("[worker] rodando, aguardando jobs em comment-events, actions e token-refresh");
