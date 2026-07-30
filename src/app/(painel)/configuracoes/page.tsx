import { prisma } from "@/lib/prisma";
import styles from "../panel.module.css";
import { createInviteAction } from "./actions";

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

const ERROS: Record<string, string> = {
  email: "Informe um email válido.",
  existe: "Já existe um usuário com esse email.",
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; conviteToken?: string }>;
}) {
  const { erro, conviteToken } = await searchParams;

  const [users, invites, health] = await Promise.all([
    prisma.user.findMany({ orderBy: { criadoEm: "asc" } }),
    prisma.invite.findMany({ where: { aceitoEm: null }, orderBy: { criadoEm: "desc" } }),
    checkWebhookHealth(),
  ]);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const conviteLink = conviteToken ? `${appUrl}/convite/${conviteToken}` : null;

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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nome}</td>
                <td>{user.email}</td>
                <td>{user.role === "admin" ? "Admin" : "Membro"}</td>
                <td>{user.criadoEm.toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Convidar alguém do time</h2>
        <p className={styles.muted}>
          Ainda não enviamos o email automaticamente — depois de criar o convite, copie o link e
          envie por onde preferir (WhatsApp, etc).
        </p>

        {erro && <p className={styles.error}>{ERROS[erro] ?? "Não foi possível criar o convite."}</p>}
        {conviteLink && (
          <p className={styles.muted} style={{ wordBreak: "break-all" }}>
            Link do convite: <a href={conviteLink}>{conviteLink}</a>
          </p>
        )}

        <form action={createInviteAction} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="email"
            name="email"
            placeholder="email@exemplo.com"
            required
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6 }}
          />
          <button className={styles.button} type="submit">
            Gerar convite
          </button>
        </form>

        {invites.length > 0 && (
          <table className={styles.table} style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Expira em</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{invite.expiraEm.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
