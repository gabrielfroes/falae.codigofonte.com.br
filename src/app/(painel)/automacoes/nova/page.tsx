import { prisma } from "@/lib/prisma";
import styles from "../../panel.module.css";
import { AutomationForm } from "../AutomationForm";
import { createAutomationAction } from "../actions";

export default async function NovaAutomacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const accounts = await prisma.account.findMany({ orderBy: { criadoEm: "asc" } });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Nova automação</h1>
      </div>

      {accounts.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>
            Conecte uma conta do Instagram em &quot;Conexões&quot; antes de criar uma automação.
          </p>
        </div>
      ) : (
        <div className={styles.card}>
          {erro && <p className={styles.error}>Preencha nome, conta, ao menos uma palavra-chave e a DM completa.</p>}
          <AutomationForm action={createAutomationAction} accounts={accounts} />
        </div>
      )}
    </div>
  );
}
