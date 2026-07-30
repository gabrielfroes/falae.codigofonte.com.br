import { prisma } from "@/lib/prisma";
import styles from "../panel.module.css";

const ERROS: Record<string, string> = {
  estado_invalido: "A conexão expirou ou foi iniciada de outro lugar — tente novamente.",
  falha_conexao: "Não foi possível concluir a conexão com o Instagram. Veja os logs do servidor para detalhes.",
};

const STATUS_LABEL: Record<string, string> = {
  conectado: "Conectado",
  expirado: "Token expirado",
  erro: "Erro",
};

function badgeClass(status: string): string {
  if (status === "conectado") return styles.badgeOk;
  return styles.badgeErro;
}

export default async function ConexoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; conectado?: string }>;
}) {
  const { erro, conectado } = await searchParams;
  const accounts = await prisma.account.findMany({ orderBy: { criadoEm: "asc" } });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Conexões</h1>
        <a className={styles.button} href="/api/auth/instagram/start">
          Conectar Instagram
        </a>
      </div>

      {erro && <p className={styles.error}>{ERROS[erro] ?? "Não foi possível conectar."}</p>}
      {conectado && <p className={styles.muted}>Conta conectada com sucesso.</p>}

      <div className={styles.card}>
        {accounts.length === 0 ? (
          <p className={styles.emptyState}>Nenhuma conta conectada ainda.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Conta</th>
                <th>Status</th>
                <th>Token expira em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.platform}</td>
                  <td>@{account.username}</td>
                  <td>
                    <span className={`${styles.badge} ${badgeClass(account.status)}`}>
                      {STATUS_LABEL[account.status] ?? account.status}
                    </span>
                  </td>
                  <td>
                    {account.tokenExpiresAt
                      ? new Date(account.tokenExpiresAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td>
                    <a className={styles.buttonSecondary} href="/api/auth/instagram/start">
                      Reconectar
                    </a>
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
