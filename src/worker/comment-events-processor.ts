import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchesKeyword } from "@/lib/keyword-matching";
import { actionsQueue, type CommentEventJobData } from "@/lib/queue";

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

export async function processCommentEvent(job: Job<CommentEventJobData>): Promise<void> {
  const { accountExternalId, commentId, mediaId, text, fromId, fromUsername, raw } = job.data;

  const account = await prisma.account.findUnique({
    where: { platform_externalId: { platform: "instagram", externalId: accountExternalId } },
  });

  if (!account) {
    console.warn(
      `[comment-events] conta desconhecida (external_id=${accountExternalId}), ignorando. Payload cru:`,
      JSON.stringify(raw),
    );
    return;
  }

  // Ignora comentários feitos pela própria conta do canal.
  if (fromId === account.externalId) {
    await createEventIdempotent({
      accountId: account.id,
      automationId: null,
      externalCommentId: commentId,
      externalMediaId: mediaId,
      autorUsername: fromUsername ?? "",
      autorExternalId: fromId,
      textoComentario: text,
      status: "ignorado_proprio_perfil",
      payloadRaw: raw,
    });
    return;
  }

  // Ignora comentários de contas na blocklist.
  const bloqueado = await prisma.blocklistEntry.findFirst({
    where: {
      accountId: account.id,
      OR: [{ externalId: fromId }, { externalUsername: fromUsername ?? undefined }],
    },
  });
  if (bloqueado) {
    await createEventIdempotent({
      accountId: account.id,
      automationId: null,
      externalCommentId: commentId,
      externalMediaId: mediaId,
      autorUsername: fromUsername ?? "",
      autorExternalId: fromId,
      textoComentario: text,
      status: "ignorado_blocklist",
      payloadRaw: raw,
    });
    return;
  }

  // Só automações ativas entram na disputa por match — pausada não processa nada.
  const automacoesAtivas = await prisma.automation.findMany({
    where: { accountId: account.id, status: "ativa" },
    include: { keywords: true },
    orderBy: { criadoEm: "asc" },
  });

  const automacaoCorrespondente = automacoesAtivas.find((automacao) => {
    const escopoBate =
      automacao.scope === "todos_posts" ||
      (Array.isArray(automacao.postIds) && (automacao.postIds as string[]).includes(mediaId));
    if (!escopoBate) return false;
    return automacao.keywords.some((keyword) => matchesKeyword(text, keyword.termo, keyword.matchMode));
  });

  const event = await createEventIdempotent({
    accountId: account.id,
    automationId: automacaoCorrespondente?.id ?? null,
    externalCommentId: commentId,
    externalMediaId: mediaId,
    autorUsername: fromUsername ?? "",
    autorExternalId: fromId,
    textoComentario: text,
    status: automacaoCorrespondente ? "match" : "sem_match",
    payloadRaw: raw,
  });

  if (!event || !automacaoCorrespondente) return;

  const delayMs =
    (automacaoCorrespondente.delayMinSeconds +
      Math.random() *
        (automacaoCorrespondente.delayMaxSeconds - automacaoCorrespondente.delayMinSeconds)) *
    1000;

  await actionsQueue.add(
    "execute-action",
    { eventId: event.id, automationId: automacaoCorrespondente.id },
    { delay: Math.round(delayMs) },
  );
}

/**
 * Cria o Event respeitando a idempotência via unique constraint em
 * external_comment_id. Se já existir (reentrega de webhook), loga e
 * retorna null para o chamador não enfileirar ações de novo.
 */
async function createEventIdempotent(data: {
  accountId: string;
  automationId: string | null;
  externalCommentId: string;
  externalMediaId: string;
  autorUsername: string;
  autorExternalId: string;
  textoComentario: string;
  status: "sem_match" | "match" | "ignorado_blocklist" | "ignorado_proprio_perfil";
  payloadRaw: unknown;
}) {
  try {
    return await prisma.event.create({
      data: {
        accountId: data.accountId,
        automationId: data.automationId,
        externalCommentId: data.externalCommentId,
        externalMediaId: data.externalMediaId,
        autorUsername: data.autorUsername,
        autorExternalId: data.autorExternalId,
        textoComentario: data.textoComentario,
        status: data.status,
        payloadRaw: data.payloadRaw as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR) {
      console.log(`[comment-events] comentário ${data.externalCommentId} já processado, ignorando duplicata`);
      return null;
    }
    throw error;
  }
}
