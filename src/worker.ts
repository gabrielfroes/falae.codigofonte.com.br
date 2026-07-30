// Entrypoint do processo worker — consome as filas BullMQ populadas pela
// rota de webhook. Roda como um container separado no docker-compose.

import { Worker } from "bullmq";
import { ACTIONS_QUEUE, COMMENT_EVENTS_QUEUE, redisConnection } from "@/lib/queue";
import { processCommentEvent } from "@/worker/comment-events-processor";
import { processAction } from "@/worker/actions-processor";

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

for (const worker of [commentEventsWorker, actionsWorker]) {
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} da fila ${worker.name} falhou:`, err);
  });
}

console.log("[worker] rodando, aguardando jobs em comment-events e actions");
