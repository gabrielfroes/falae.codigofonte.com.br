"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInviteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/configuracoes?erro=email");
  }

  const jaExiste = await prisma.user.findUnique({ where: { email } });
  if (jaExiste) {
    redirect("/configuracoes?erro=existe");
  }

  const token = randomBytes(24).toString("base64url");
  await prisma.invite.create({
    data: { email, token, expiraEm: new Date(Date.now() + INVITE_TTL_MS) },
  });
  await recordAudit({ userId: user.id, acao: "criar_convite", entidade: "invite", entidadeId: email });

  revalidatePath("/configuracoes");
  redirect(`/configuracoes?conviteToken=${token}`);
}
