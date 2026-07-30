import styles from "@/app/form.module.css";
import { loginAction } from "./actions";

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
        <p className={styles.subtitle}>Entre com sua conta do painel.</p>

        {erro && <p className={styles.error}>Email ou senha inválidos.</p>}

        <form action={loginAction}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoFocus />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" required />
          </div>
          <button className={styles.button} type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
