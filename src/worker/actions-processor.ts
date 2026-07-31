import type { Job } from "bullmq";
import type { DeliveryTipo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { classifyInstagramError, sendPrivateReply, sendPublicReply } from "@/lib/instagram/client";
import type { ActionJobData } from "@/lib/queue";

export async function processAction(job: Job<ActionJobData>): Promise<void> {
  const { eventId, automationId } = job.data;

  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { publicReplyTemplates: true, dmTemplate: true, account: true },
  });
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!automation || !event) {
    console.warn(`[actions] automação ou evento não encontrado (event=${eventId}, automation=${automationId})`);
    return;
  }

  // Automação pode ter sido pausada entre o match e a execução do job (ou entre
  // uma tentativa e um retry) — não dispara nada.
  if (automation.status !== "ativa") {
    console.log(`[actions] automação ${automationId} está pausada, cancelando ação`);
    return;
  }

  const accessToken = decryptToken(automation.account.accessTokenEncrypted);

  // As duas ações rodam independentes: se uma bater rate limit e for
  // re-tentada, a outra (se já enviada) não deve ser re-enviada.
  const resultados = await Promise.allSettled([
    automation.publicReplyTemplates.length > 0
      ? sendIfNeeded(eventId, "resposta_publica", () => {
          const template =
            automation.publicReplyTemplates[Math.floor(Math.random() * automation.publicReplyTemplates.length)];
          return sendPublicReply({ commentId: event.externalCommentId, text: template.texto, accessToken });
        })
      : Promise.resolve(),
    automation.dmTemplate
      ? sendIfNeeded(eventId, "dm", () => {
          const texto = `${automation.dmTemplate!.texto}\n${automation.dmTemplate!.link}`;
          return sendPrivateReply({
            igAccountId: automation.account.externalId,
            commentId: event.externalCommentId,
            text: texto,
            accessToken,
          });
        })
      : Promise.resolve(),
  ]);

  // Se alguma das duas precisar de retry (rate limit), propaga o erro pra
  // fila re-agendar o job com backoff exponencial — a outra ação já ficou
  // registrada e não será repetida na próxima tentativa.
  const paraRetentar = resultados.find(
    (resultado): resultado is PromiseRejectedResult => resultado.status === "rejected",
  );
  if (paraRetentar) throw paraRetentar.reason;
}

/** Erro interno só pra sinalizar pro BullMQ "vale a pena tentar de novo depois". */
class RetryableDeliveryError extends Error {}

async function sendIfNeeded(
  eventId: string,
  tipo: DeliveryTipo,
  send: () => Promise<{ externalMessageId: string | null }>,
): Promise<void> {
  const entregasAnteriores = await prisma.delivery.findMany({ where: { eventId, tipo } });
  if (entregasAnteriores.some((d) => d.status === "enviado")) {
    return; // já enviado numa tentativa anterior — idempotente entre retries
  }

  try {
    const { externalMessageId } = await send();
    await prisma.delivery.create({
      data: { eventId, tipo, status: "enviado", externalMessageId, tentativas: entregasAnteriores.length + 1 },
    });
  } catch (error) {
    const { status, motivo } = classifyInstagramError(error);
    console.error(`[actions] falha ao enviar ${tipo} para evento ${eventId}: ${motivo}`);
    await prisma.delivery.create({
      data: { eventId, tipo, status, motivoFalha: motivo, tentativas: entregasAnteriores.length + 1 },
    });

    // rate_limited é transitório — vale re-tentar mais tarde. Os outros
    // motivos (expirado, falhou) são permanentes, re-tentar não ajuda.
    if (status === "rate_limited") {
      throw new RetryableDeliveryError(motivo);
    }
  }
}
