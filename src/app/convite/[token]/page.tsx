import { prisma } from "@/lib/prisma";
import styles from "@/app/form.module.css";
import { acceptInviteAction } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  invalido: "Este convite não é mais válido — já foi usado ou expirou.",
  dados: "Preencha seu nome e uma senha com pelo menos 8 caracteres.",
  senha: "As senhas não coincidem.",
};

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;

  const invite = await prisma.invite.findUnique({ where: { token } });
  const invalido = !invite || invite.aceitoEm !== null || invite.expiraEm < new Date();

  const acceptWithToken = acceptInviteAction.bind(null, token);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Falae</h1>
        {invalido ? (
          <p className={styles.error}>
            {MENSAGENS_ERRO.invalido}
          </p>
        ) : (
          <>
            <p className={styles.subtitle}>
              Você foi convidado para o painel do Falae com o email <strong>{invite.email}</strong>.
              Defina seu nome e uma senha para continuar.
            </p>
            {erro && <p className={styles.error}>{MENSAGENS_ERRO[erro] ?? "Não foi possível continuar."}</p>}
            <form action={acceptWithToken}>
              <div className={styles.formGroup}>
                <label htmlFor="nome">Nome</label>
                <input id="nome" name="nome" type="text" required autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="senha">Senha</label>
                <input id="senha" name="senha" type="password" minLength={8} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmarSenha">Confirmar senha</label>
                <input id="confirmarSenha" name="confirmarSenha" type="password" minLength={8} required />
              </div>
              <button className={styles.button} type="submit">
                Criar minha conta
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
