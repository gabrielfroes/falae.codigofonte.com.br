import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Falae</h1>
        <p>
          Painel em construção. O núcleo de automação (webhook, fila e envio de
          respostas) ainda não foi implementado — veja{" "}
          <code>docs/setup-meta.md</code> para os próximos passos.
        </p>
      </main>
    </div>
  );
}
