import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function recordAudit(params: {
  userId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  diff?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      diff: params.diff,
    },
  });
}
