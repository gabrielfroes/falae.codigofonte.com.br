import { prisma } from "@/lib/prisma";
import styles from "../panel.module.css";

async function checkWebhookHealth(): Promise<{ ok: boolean; detalhe: string }> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return { ok: false, detalhe: "META_WEBHOOK_VERIFY_TOKEN não configurado no servidor." };
  }
  try {
    const probe = "falae-health-check";
    const url = `${appUrl}/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${probe}`;
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.text();
    if (response.ok && body === probe) {
      return { ok: true, detalhe: "Webhook respondendo normalmente." };
    }
    return { ok: false, detalhe: `Resposta inesperada do webhook (status ${response.status}).` };
  } catch {
    return { ok: false, detalhe: "Não foi possível alcançar o próprio endpoint de webhook." };
  }
}

function emailsPermitidos(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ConfiguracoesPage() {
  const [users, health] = await Promise.all([
    prisma.user.findMany({ orderBy: { criadoEm: "asc" } }),
    checkWebhookHealth(),
  ]);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const permitidos = emailsPermitidos();

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Configurações</h1>
      </div>

      <div className={styles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Webhook</h2>
        <p className={styles.muted}>URL cadastrada na Meta: {appUrl}/api/webhooks/instagram</p>
        <p style={{ marginTop: 8 }}>
          <span className={`${styles.badge} ${health.ok ? styles.badgeOk : styles.badgeErro}`}>
            {health.ok ? "OK" : "Atenção"}
          </span>{" "}
          <span className={styles.muted}>{health.detalhe}</span>
        </p>
      </div>

      <div className={styles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Usuários do time</h2>
        <p className={styles.muted}>
          Login é feito com Google — só os emails abaixo (configurados em{" "}
          <code>AUTH_ALLOWED_EMAILS</code> no servidor) conseguem entrar. Para adicionar alguém,
          inclua o email na variável de ambiente e reinicie a aplicação.
        </p>
        <ul style={{ marginTop: 8, marginBottom: 16 }}>
          {permitidos.map((email) => (
            <li key={email} className={styles.muted}>
              {email}
            </li>
          ))}
        </ul>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Primeiro login</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Ninguém logou ainda.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.nome}</td>
                  <td>{user.email}</td>
                  <td>{user.role === "admin" ? "Admin" : "Membro"}</td>
                  <td>{user.criadoEm.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
