// Entrypoint do processo worker (consumidor das filas BullMQ).
// Fase 0: só valida a conexão com Redis. As filas e os processors
// reais de comment-events/actions entram na Fase 1.

import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

connection.on("connect", () => {
  console.log("[worker] conectado ao Redis, aguardando filas da Fase 1");
});

connection.on("error", (err) => {
  console.error("[worker] erro de conexão com Redis:", err);
});
