import { prisma } from "@/lib/prisma";
import styles from "../panel.module.css";

const STATUS_LABEL: Record<string, string> = {
  sem_match: "Sem match",
  match: "Match",
  ignorado_blocklist: "Ignorado (blocklist)",
  ignorado_proprio_perfil: "Ignorado (próprio perfil)",
};

function badgeClass(status: string): string {
  if (status === "match") return styles.badgeOk;
  if (status.startsWith("ignorado")) return styles.badgeMuted;
  return styles.badgeMuted;
}

export default async function AtividadePage({
  searchParams,
}: {
  searchParams: Promise<{ automationId?: string; status?: string; de?: string; ate?: string }>;
}) {
  const { automationId, status, de, ate } = await searchParams;

  const automacoes = await prisma.automation.findMany({ orderBy: { criadoEm: "asc" } });

  const where = {
    ...(automationId ? { automationId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(de || ate
      ? {
          criadoEm: {
            ...(de ? { gte: new Date(de) } : {}),
            ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [eventos, totalComentarios, totalMatches, totalDmsEnviadas, totalFalhas] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { deliveries: true, automation: true },
      orderBy: { criadoEm: "desc" },
      take: 100,
    }),
    prisma.event.count({ where }),
    prisma.event.count({ where: { ...where, status: "match" } }),
    prisma.delivery.count({ where: { tipo: "dm", status: "enviado", event: where } }),
    prisma.delivery.count({ where: { status: { in: ["falhou", "expirado", "rate_limited"] }, event: where } }),
  ]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Atividade</h1>
      </div>

      <div className={styles.counters}>
        <div className={styles.counterCard}>
          <div className={styles.value}>{totalComentarios}</div>
          <div className={styles.label}>Comentários recebidos</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{totalMatches}</div>
          <div className={styles.label}>Matches</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{totalDmsEnviadas}</div>
          <div className={styles.label}>DMs enviadas</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{totalFalhas}</div>
          <div className={styles.label}>Falhas de envio</div>
        </div>
      </div>

      <form method="get" className={styles.filters}>
        <div className={styles.formGroup}>
          <label htmlFor="automationId">Automação</label>
          <select id="automationId" name="automationId" defaultValue={automationId ?? ""}>
            <option value="">Todas</option>
            {automacoes.map((automacao) => (
              <option key={automacao.id} value={automacao.id}>
                {automacao.nome}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="de">De</label>
          <input id="de" name="de" type="date" defaultValue={de} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="ate">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={ate} />
        </div>
        <button className={styles.buttonSecondary} type="submit">
          Filtrar
        </button>
      </form>

      <div className={styles.card}>
        {eventos.length === 0 ? (
          <p className={styles.emptyState}>Nenhum evento encontrado para esse filtro.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Automação</th>
                <th>Autor</th>
                <th>Comentário</th>
                <th>Status</th>
                <th>Entregas</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{evento.criadoEm.toLocaleString("pt-BR")}</td>
                  <td>{evento.automation?.nome ?? "—"}</td>
                  <td>@{evento.autorUsername || "?"}</td>
                  <td>{evento.textoComentario}</td>
                  <td>
                    <span className={`${styles.badge} ${badgeClass(evento.status)}`}>
                      {STATUS_LABEL[evento.status] ?? evento.status}
                    </span>
                  </td>
                  <td>
                    {evento.deliveries.length === 0
                      ? "—"
                      : evento.deliveries.map((delivery) => (
                          <div key={delivery.id}>
                            {delivery.tipo === "dm" ? "DM" : "Resposta pública"}:{" "}
                            <span
                              className={`${styles.badge} ${
                                delivery.status === "enviado" ? styles.badgeOk : styles.badgeErro
                              }`}
                            >
                              {delivery.status}
                            </span>
                            {delivery.motivoFalha && (
                              <span className={styles.muted}> — {delivery.motivoFalha}</span>
                            )}
                          </div>
                        ))}
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
