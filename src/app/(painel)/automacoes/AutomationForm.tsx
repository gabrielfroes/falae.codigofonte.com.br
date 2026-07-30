import styles from "../panel.module.css";

interface AutomationFormProps {
  action: (formData: FormData) => void | Promise<void>;
  accounts: { id: string; username: string }[];
  initial?: {
    nome: string;
    accountId: string;
    scope: string;
    postIds: string[];
    matchMode: string;
    keywords: string[];
    publicReplies: string[];
    dmTexto: string;
    dmLink: string;
    delayMinSeconds: number;
    delayMaxSeconds: number;
  };
  accountLocked?: boolean;
}

export function AutomationForm({ action, accounts, initial, accountLocked }: AutomationFormProps) {
  return (
    <form action={action}>
      <div className={styles.formGroup}>
        <label htmlFor="nome">Nome da automação</label>
        <input id="nome" name="nome" type="text" defaultValue={initial?.nome} required />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="accountId">Conta</label>
        <select id="accountId" name="accountId" defaultValue={initial?.accountId} disabled={accountLocked} required>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              @{account.username}
            </option>
          ))}
        </select>
        {accountLocked && <input type="hidden" name="accountId" value={initial?.accountId} />}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="scope">Escopo</label>
        <select id="scope" name="scope" defaultValue={initial?.scope ?? "todos_posts"}>
          <option value="todos_posts">Todos os posts</option>
          <option value="posts_especificos">Posts específicos</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="postIds">
          IDs dos posts/reels (um por linha) — só usado com escopo &quot;Posts específicos&quot;
        </label>
        <textarea
          id="postIds"
          name="postIds"
          rows={3}
          defaultValue={initial?.postIds?.join("\n")}
          placeholder="18000000000000000"
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="keywords">Palavras-chave (uma por linha)</label>
          <textarea
            id="keywords"
            name="keywords"
            rows={4}
            defaultValue={initial?.keywords?.join("\n")}
            placeholder="quero&#10;link"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="matchMode">Modo de match</label>
          <select id="matchMode" name="matchMode" defaultValue={initial?.matchMode ?? "contem"}>
            <option value="contem">Contém</option>
            <option value="exato">Exato</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="publicReplies">
          Respostas públicas (opcional, uma por linha — sorteia uma aleatoriamente)
        </label>
        <textarea
          id="publicReplies"
          name="publicReplies"
          rows={3}
          defaultValue={initial?.publicReplies?.join("\n")}
          placeholder="Enviei no seu direct! 📩"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="dmTexto">Texto da DM</label>
        <textarea id="dmTexto" name="dmTexto" rows={3} defaultValue={initial?.dmTexto} required />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="dmLink">Link da DM</label>
        <input
          id="dmLink"
          name="dmLink"
          type="url"
          defaultValue={initial?.dmLink}
          placeholder="https://..."
          required
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="delayMinSeconds">Delay mínimo (segundos)</label>
          <input
            id="delayMinSeconds"
            name="delayMinSeconds"
            type="number"
            min={0}
            defaultValue={initial?.delayMinSeconds ?? 5}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="delayMaxSeconds">Delay máximo (segundos)</label>
          <input
            id="delayMaxSeconds"
            name="delayMaxSeconds"
            type="number"
            min={0}
            defaultValue={initial?.delayMaxSeconds ?? 30}
          />
        </div>
      </div>

      <button className={styles.button} type="submit">
        Salvar
      </button>
    </form>
  );
}
