import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../panel.module.css";
import { toggleStatusAction } from "./actions";

export default async function AutomacoesPage() {
  const automacoes = await prisma.automation.findMany({
    include: { account: true, keywords: true },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Automações</h1>
        <Link className={styles.button} href="/automacoes/nova">
          Nova automação
        </Link>
      </div>

      <div className={styles.card}>
        {automacoes.length === 0 ? (
          <p className={styles.emptyState}>Nenhuma automação criada ainda.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Conta</th>
                <th>Escopo</th>
                <th>Palavras-chave</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {automacoes.map((automacao) => (
                <tr key={automacao.id}>
                  <td>
                    <Link href={`/automacoes/${automacao.id}`}>{automacao.nome}</Link>
                  </td>
                  <td>@{automacao.account.username}</td>
                  <td>{automacao.scope === "todos_posts" ? "Todos os posts" : "Posts específicos"}</td>
                  <td>{automacao.keywords.map((k) => k.termo).join(", ")}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        automacao.status === "ativa" ? styles.badgeOk : styles.badgeMuted
                      }`}
                    >
                      {automacao.status === "ativa" ? "Ativa" : "Pausada"}
                    </span>
                  </td>
                  <td>
                    <form action={toggleStatusAction.bind(null, automacao.id)}>
                      <button className={styles.buttonSecondary} type="submit">
                        {automacao.status === "ativa" ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
