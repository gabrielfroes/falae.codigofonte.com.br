"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const senhaValida = user ? await verifyPassword(senha, user.passwordHash) : false;

  if (!user || !senhaValida) {
    redirect("/login?erro=1");
  }

  await createSession(user.id);
  redirect("/conexoes");
}
