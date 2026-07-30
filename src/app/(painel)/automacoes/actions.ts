"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { matchesKeyword } from "@/lib/keyword-matching";
import type { AutomationScope, MatchMode } from "@prisma/client";

function linesFrom(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseAutomationForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  const scope = String(formData.get("scope") ?? "todos_posts") as AutomationScope;
  const postIdsLinhas = linesFrom(formData.get("postIds"));
  const matchMode = String(formData.get("matchMode") ?? "contem") as MatchMode;
  const keywords = linesFrom(formData.get("keywords"));
  const publicReplies = linesFrom(formData.get("publicReplies"));
  const dmTexto = String(formData.get("dmTexto") ?? "").trim();
  const dmLink = String(formData.get("dmLink") ?? "").trim();
  const delayMinSeconds = Number(formData.get("delayMinSeconds") ?? 5);
  const delayMaxSeconds = Number(formData.get("delayMaxSeconds") ?? 30);

  return {
    nome,
    accountId,
    scope,
    postIds: scope === "posts_especificos" ? postIdsLinhas : undefined,
    matchMode,
    keywords,
    publicReplies,
    dmTexto,
    dmLink,
    delayMinSeconds,
    delayMaxSeconds,
  };
}

export async function createAutomationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const data = parseAutomationForm(formData);

  if (!data.nome || !data.accountId || data.keywords.length === 0 || !data.dmTexto || !data.dmLink) {
    redirect("/automacoes/nova?erro=dados");
  }

  const automation = await prisma.automation.create({
    data: {
      accountId: data.accountId,
      nome: data.nome,
      scope: data.scope,
      postIds: data.postIds,
      delayMinSeconds: data.delayMinSeconds,
      delayMaxSeconds: data.delayMaxSeconds,
      keywords: { create: data.keywords.map((termo) => ({ termo, matchMode: data.matchMode })) },
      publicReplyTemplates: { create: data.publicReplies.map((texto) => ({ texto })) },
      dmTemplate: { create: { texto: data.dmTexto, link: data.dmLink } },
    },
  });

  await recordAudit({ userId: user.id, acao: "criar_automacao", entidade: "automation", entidadeId: automation.id });

  revalidatePath("/automacoes");
  redirect(`/automacoes/${automation.id}`);
}

export async function updateAutomationAction(automationId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const data = parseAutomationForm(formData);

  if (!data.nome || data.keywords.length === 0 || !data.dmTexto || !data.dmLink) {
    redirect(`/automacoes/${automationId}?erro=dados`);
  }

  await prisma.$transaction([
    prisma.automation.update({
      where: { id: automationId },
      data: {
        nome: data.nome,
        scope: data.scope,
        postIds: data.postIds,
        delayMinSeconds: data.delayMinSeconds,
        delayMaxSeconds: data.delayMaxSeconds,
      },
    }),
    prisma.keyword.deleteMany({ where: { automationId } }),
    prisma.keyword.createMany({
      data: data.keywords.map((termo) => ({ automationId, termo, matchMode: data.matchMode })),
    }),
    prisma.publicReplyTemplate.deleteMany({ where: { automationId } }),
    prisma.publicReplyTemplate.createMany({
      data: data.publicReplies.map((texto) => ({ automationId, texto })),
    }),
    prisma.dmTemplate.upsert({
      where: { automationId },
      update: { texto: data.dmTexto, link: data.dmLink },
      create: { automationId, texto: data.dmTexto, link: data.dmLink },
    }),
  ]);

  await recordAudit({ userId: user.id, acao: "editar_automacao", entidade: "automation", entidadeId: automationId });

  revalidatePath("/automacoes");
  revalidatePath(`/automacoes/${automationId}`);
  redirect(`/automacoes/${automationId}?salvo=1`);
}

export async function toggleStatusAction(automationId: string): Promise<void> {
  const user = await requireUser();
  const automation = await prisma.automation.findUniqueOrThrow({ where: { id: automationId } });
  const novoStatus = automation.status === "ativa" ? "pausada" : "ativa";

  await prisma.automation.update({ where: { id: automationId }, data: { status: novoStatus } });
  await recordAudit({
    userId: user.id,
    acao: novoStatus === "ativa" ? "ativar_automacao" : "pausar_automacao",
    entidade: "automation",
    entidadeId: automationId,
  });

  revalidatePath("/automacoes");
  revalidatePath(`/automacoes/${automationId}`);
}

export async function deleteAutomationAction(automationId: string): Promise<void> {
  const user = await requireUser();
  await prisma.automation.delete({ where: { id: automationId } });
  await recordAudit({ userId: user.id, acao: "excluir_automacao", entidade: "automation", entidadeId: automationId });

  revalidatePath("/automacoes");
  redirect("/automacoes");
}

export async function testAutomationAction(automationId: string, formData: FormData): Promise<void> {
  await requireUser();
  const textoTeste = String(formData.get("textoTeste") ?? "");

  const automation = await prisma.automation.findUniqueOrThrow({
    where: { id: automationId },
    include: { keywords: true, publicReplyTemplates: true, dmTemplate: true },
  });

  const keywordCorrespondente = automation.keywords.find((keyword) =>
    matchesKeyword(textoTeste, keyword.termo, keyword.matchMode),
  );

  const resultado = !keywordCorrespondente
    ? "sem_match"
    : automation.status !== "ativa"
      ? "pausada"
      : "match";

  redirect(
    `/automacoes/${automationId}?testeTexto=${encodeURIComponent(textoTeste)}&testeResultado=${resultado}`,
  );
}
