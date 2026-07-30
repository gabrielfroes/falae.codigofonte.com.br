import { prisma } from "@/lib/prisma";
import styles from "./panel.module.css";
import { MessagesChart } from "./MessagesChart";

const DIA_MS = 24 * 60 * 60 * 1000;

function bucketPorDia(deliveries: { criadoEm: Date; tipo: string }[], dias: number) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { dm: number; resposta: number }>();
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date(hoje.getTime() - i * DIA_MS);
    buckets.set(data.toISOString().slice(0, 10), { dm: 0, resposta: 0 });
  }

  for (const delivery of deliveries) {
    const chave = delivery.criadoEm.toISOString().slice(0, 10);
    const bucket = buckets.get(chave);
    if (!bucket) continue;
    if (delivery.tipo === "dm") bucket.dm += 1;
    else bucket.resposta += 1;
  }

  return {
    dates: Array.from(buckets.keys()),
    dm: Array.from(buckets.values()).map((b) => b.dm),
    respostas: Array.from(buckets.values()).map((b) => b.resposta),
  };
}

export default async function DashboardPage() {
  const agora = new Date();
  const desde24h = new Date(agora.getTime() - DIA_MS);
  const desde7d = new Date(agora.getTime() - 7 * DIA_MS);
  const desde30d = new Date(agora.getTime() - 30 * DIA_MS);

  const [totalEnviadas, ultimas24h, ultimos7d, ultimos30d, deliveriesRecentes, contasConectadas, automacoesAtivas] =
    await Promise.all([
      prisma.delivery.count({ where: { status: "enviado" } }),
      prisma.delivery.count({ where: { status: "enviado", criadoEm: { gte: desde24h } } }),
      prisma.delivery.count({ where: { status: "enviado", criadoEm: { gte: desde7d } } }),
      prisma.delivery.count({ where: { status: "enviado", criadoEm: { gte: desde30d } } }),
      prisma.delivery.findMany({
        where: { status: "enviado", criadoEm: { gte: desde30d } },
        select: { criadoEm: true, tipo: true },
      }),
      prisma.account.count({ where: { status: "conectado" } }),
      prisma.automation.count({ where: { status: "ativa" } }),
    ]);

  const serie = bucketPorDia(deliveriesRecentes, 30);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
      </div>

      <div className={styles.counters}>
        <div className={styles.counterCard}>
          <div className={styles.value}>{totalEnviadas}</div>
          <div className={styles.label}>Mensagens enviadas (total)</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{ultimas24h}</div>
          <div className={styles.label}>Últimas 24 horas</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{ultimos7d}</div>
          <div className={styles.label}>Últimos 7 dias</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{ultimos30d}</div>
          <div className={styles.label}>Últimos 30 dias</div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Mensagens por dia (últimos 30 dias)</h2>
        <p className={styles.muted} style={{ marginBottom: 8 }}>
          Resposta pública + DM, por dia de envio.
        </p>
        <MessagesChart dates={serie.dates} dm={serie.dm} respostas={serie.respostas} />
      </div>

      <div className={styles.counters}>
        <div className={styles.counterCard}>
          <div className={styles.value}>{contasConectadas}</div>
          <div className={styles.label}>Contas conectadas</div>
        </div>
        <div className={styles.counterCard}>
          <div className={styles.value}>{automacoesAtivas}</div>
          <div className={styles.label}>Automações ativas</div>
        </div>
      </div>
    </div>
  );
}
