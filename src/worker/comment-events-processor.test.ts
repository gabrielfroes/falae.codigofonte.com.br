import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentEventJobData } from "@/lib/queue";

const prismaMock = {
  account: { findUnique: vi.fn() },
  blocklistEntry: { findFirst: vi.fn() },
  automation: { findMany: vi.fn() },
  event: { create: vi.fn() },
};

const actionsQueueMock = { add: vi.fn() };

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/queue", () => ({ actionsQueue: actionsQueueMock }));

const { processCommentEvent } = await import("./comment-events-processor");

function criarJob(overrides: Partial<CommentEventJobData> = {}): Job<CommentEventJobData> {
  return {
    data: {
      accountExternalId: "conta-externa-1",
      commentId: "comentario-1",
      mediaId: "media-1",
      text: "quero o link",
      fromId: "seguidor-1",
      fromUsername: "seguidor",
      raw: {},
      ...overrides,
    },
  } as Job<CommentEventJobData>;
}

const CONTA = { id: "acc-1", externalId: "conta-externa-1" };

function duplicateKeyError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.account.findUnique.mockResolvedValue(CONTA);
  prismaMock.blocklistEntry.findFirst.mockResolvedValue(null);
  prismaMock.automation.findMany.mockResolvedValue([]);
});

describe("processCommentEvent — idempotência", () => {
  it("processa normalmente na primeira vez que vê o comentário", async () => {
    prismaMock.event.create.mockResolvedValue({ id: "evt-1" });

    await processCommentEvent(criarJob());

    expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
  });

  it("na reentrega do mesmo comentário (unique constraint), não enfileira ação de novo", async () => {
    prismaMock.event.create.mockRejectedValue(duplicateKeyError());

    // Simula uma automação que bateria, pra garantir que mesmo com match
    // a reentrega não chega a enfileirar nada.
    prismaMock.automation.findMany.mockResolvedValue([
      {
        id: "auto-1",
        scope: "todos_posts",
        postIds: null,
        delayMinSeconds: 1,
        delayMaxSeconds: 2,
        keywords: [{ termo: "quero", matchMode: "contem" }],
      },
    ]);

    await expect(processCommentEvent(criarJob())).resolves.toBeUndefined();

    expect(actionsQueueMock.add).not.toHaveBeenCalled();
  });

  it("propaga erros que não são de duplicidade (não engole falha real do banco)", async () => {
    prismaMock.event.create.mockRejectedValue(new Error("conexão com o banco caiu"));

    await expect(processCommentEvent(criarJob())).rejects.toThrow("conexão com o banco caiu");
  });
});

describe("processCommentEvent — match e agendamento", () => {
  it("enfileira a ação quando uma automação ativa bate com a palavra-chave", async () => {
    prismaMock.event.create.mockResolvedValue({ id: "evt-2" });
    prismaMock.automation.findMany.mockResolvedValue([
      {
        id: "auto-1",
        scope: "todos_posts",
        postIds: null,
        delayMinSeconds: 1,
        delayMaxSeconds: 1,
        keywords: [{ termo: "quero", matchMode: "contem" }],
      },
    ]);

    await processCommentEvent(criarJob({ text: "eu quero muito" }));

    expect(actionsQueueMock.add).toHaveBeenCalledTimes(1);
    expect(actionsQueueMock.add).toHaveBeenCalledWith(
      "execute-action",
      { eventId: "evt-2", automationId: "auto-1" },
      expect.objectContaining({ delay: expect.any(Number) }),
    );
  });

  it("não enfileira nada quando o texto não bate com nenhuma palavra-chave", async () => {
    prismaMock.event.create.mockResolvedValue({ id: "evt-3" });
    prismaMock.automation.findMany.mockResolvedValue([
      {
        id: "auto-1",
        scope: "todos_posts",
        postIds: null,
        delayMinSeconds: 1,
        delayMaxSeconds: 1,
        keywords: [{ termo: "quero", matchMode: "contem" }],
      },
    ]);

    await processCommentEvent(criarJob({ text: "gostei do vídeo" }));

    expect(actionsQueueMock.add).not.toHaveBeenCalled();
  });

  it("ignora automação pausada (não entra nem na disputa por match)", async () => {
    // prisma.automation.findMany já filtra status: "ativa" na query — aqui
    // simulamos o retorno vazio, que é o que o banco faria pra esse caso.
    prismaMock.event.create.mockResolvedValue({ id: "evt-4" });
    prismaMock.automation.findMany.mockResolvedValue([]);

    await processCommentEvent(criarJob({ text: "eu quero muito" }));

    expect(actionsQueueMock.add).not.toHaveBeenCalled();
  });
});
