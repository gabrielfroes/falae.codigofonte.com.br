import type { Job } from "bullmq";
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

  // Automação pode ter sido pausada entre o match e a execução do job — não dispara nada.
  if (automation.status !== "ativa") {
    console.log(`[actions] automação ${automationId} está pausada, cancelando ação`);
    return;
  }

  const accessToken = decryptToken(automation.account.accessTokenEncrypted);

  if (automation.publicReplyTemplates.length > 0) {
    const template =
      automation.publicReplyTemplates[Math.floor(Math.random() * automation.publicReplyTemplates.length)];
    await sendAndRecord({
      eventId,
      tipo: "resposta_publica",
      send: () => sendPublicReply({ commentId: event.externalCommentId, text: template.texto, accessToken }),
    });
  }

  if (automation.dmTemplate) {
    const texto = `${automation.dmTemplate.texto}\n${automation.dmTemplate.link}`;
    await sendAndRecord({
      eventId,
      tipo: "dm",
      send: () =>
        sendPrivateReply({
          igAccountId: automation.account.externalId,
          commentId: event.externalCommentId,
          text: texto,
          accessToken,
        }),
    });
  }
}

async function sendAndRecord(params: {
  eventId: string;
  tipo: "resposta_publica" | "dm";
  send: () => Promise<{ externalMessageId: string | null }>;
}): Promise<void> {
  try {
    const { externalMessageId } = await params.send();
    await prisma.delivery.create({
      data: {
        eventId: params.eventId,
        tipo: params.tipo,
        status: "enviado",
        externalMessageId,
        tentativas: 1,
      },
    });
  } catch (error) {
    const { status, motivo } = classifyInstagramError(error);
    console.error(`[actions] falha ao enviar ${params.tipo} para evento ${params.eventId}: ${motivo}`);
    await prisma.delivery.create({
      data: {
        eventId: params.eventId,
        tipo: params.tipo,
        status,
        motivoFalha: motivo,
        tentativas: 1,
      },
    });
  }
}
