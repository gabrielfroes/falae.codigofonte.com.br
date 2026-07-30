import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchMediaByAccount } from "@/lib/instagram/media";
import styles from "../../panel.module.css";
import { AutomationForm } from "../AutomationForm";
import { deleteAutomationAction, testAutomationAction, toggleStatusAction, updateAutomationAction } from "../actions";

const RESULTADO_TESTE: Record<string, { texto: string; classe: string }> = {
  match: { texto: "Bateu! Dispararia resposta pública (se configurada) + DM.", classe: "badgeOk" },
  sem_match: { texto: "Não bateu com nenhuma palavra-chave — nada seria enviado.", classe: "badgeMuted" },
  pausada: { texto: "Bateria com a palavra-chave, mas a automação está pausada — nada seria enviado.", classe: "badgeMuted" },
};

export default async function EditarAutomacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; salvo?: string; testeTexto?: string; testeResultado?: string }>;
}) {
  const { id } = await params;
  const { erro, salvo, testeTexto, testeResultado } = await searchParams;

  const automacao = await prisma.automation.findUnique({
    where: { id },
    include: { account: true, keywords: true, publicReplyTemplates: true, dmTemplate: true },
  });
  if (!automacao) notFound();

  const accounts = await prisma.account.findMany({ orderBy: { criadoEm: "asc" } });
  const mediaByAccount = await fetchMediaByAccount(accounts);
  const resultado = testeResultado ? RESULTADO_TESTE[testeResultado] : null;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>{automacao.nome}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <form action={toggleStatusAction.bind(null, automacao.id)}>
            <button className={styles.buttonSecondary} type="submit">
              {automacao.status === "ativa" ? "Pausar" : "Ativar"}
            </button>
          </form>
          <form action={deleteAutomationAction.bind(null, automacao.id)}>
            <button className={styles.buttonDanger} type="submit">
              Excluir
            </button>
          </form>
        </div>
      </div>

      <div className={styles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Testar</h2>
        <p className={styles.muted}>Simula um comentário contra esta automação, sem enviar nada de verdade.</p>
        <form action={testAutomationAction.bind(null, automacao.id)} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="text"
            name="textoTeste"
            placeholder="Texto do comentário de teste"
            defaultValue={testeTexto}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6 }}
          />
          <button className={styles.buttonSecondary} type="submit">
            Testar
          </button>
        </form>
        {resultado && (
          <p style={{ marginTop: 12 }}>
            <span className={`${styles.badge} ${styles[resultado.classe]}`}>{resultado.texto}</span>
          </p>
        )}
      </div>

      <div className={styles.card}>
        {salvo && <p className={styles.muted}>Alterações salvas.</p>}
        {erro && <p className={styles.error}>Preencha nome, ao menos uma palavra-chave e a DM completa.</p>}
        <AutomationForm
          action={updateAutomationAction.bind(null, automacao.id)}
          accounts={accounts}
          mediaByAccount={mediaByAccount}
          accountLocked
          initial={{
            nome: automacao.nome,
            accountId: automacao.accountId,
            scope: automacao.scope,
            postIds: Array.isArray(automacao.postIds) ? (automacao.postIds as string[]) : [],
            matchMode: automacao.keywords[0]?.matchMode ?? "contem",
            keywords: automacao.keywords.map((k) => k.termo),
            publicReplies: automacao.publicReplyTemplates.map((t) => t.texto),
            dmTexto: automacao.dmTemplate?.texto ?? "",
            dmLink: automacao.dmTemplate?.link ?? "",
            delayMinSeconds: automacao.delayMinSeconds,
            delayMaxSeconds: automacao.delayMaxSeconds,
          }}
        />
      </div>
    </div>
  );
}
