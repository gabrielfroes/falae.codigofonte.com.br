import styles from "@/app/form.module.css";

const ERROS: Record<string, string> = {
  nao_autorizado: "Esse email não tem acesso ao painel do Falae.",
  estado_invalido: "A tentativa de login expirou — tente de novo.",
  falha_login: "Não foi possível confirmar sua conta Google. Tente de novo.",
  cancelado: "Login cancelado.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Falae</h1>
        <p className={styles.subtitle}>Painel interno do Código Fonte TV.</p>

        {erro && <p className={styles.error}>{ERROS[erro] ?? "Não foi possível entrar."}</p>}

        <a className={styles.button} href="/api/auth/google/start">
          Entrar com Google
        </a>
      </div>
    </div>
  );
}
