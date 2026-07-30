"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

export async function acceptInviteAction(token: string, formData: FormData): Promise<void> {
  const nome = String(formData.get("nome") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.aceitoEm || invite.expiraEm < new Date()) {
    redirect(`/convite/${token}?erro=invalido`);
  }
  if (!nome || senha.length < 8) {
    redirect(`/convite/${token}?erro=dados`);
  }
  if (senha !== confirmarSenha) {
    redirect(`/convite/${token}?erro=senha`);
  }

  const jaExiste = await prisma.user.findUnique({ where: { email: invite.email } });
  if (jaExiste) {
    redirect(`/convite/${token}?erro=invalido`);
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: invite.email, nome, passwordHash: await hashPassword(senha), role: "membro" },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { aceitoEm: new Date() } });
    return created;
  });

  await createSession(user.id);
  redirect("/conexoes");
}
