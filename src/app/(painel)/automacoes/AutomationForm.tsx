"use client";

import { useState } from "react";
import type { InstagramMedia } from "@/lib/instagram/client";
import styles from "../panel.module.css";

interface AutomationFormProps {
  action: (formData: FormData) => void | Promise<void>;
  accounts: { id: string; username: string }[];
  mediaByAccount: Record<string, { items: InstagramMedia[]; erro: string | null }>;
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

export function AutomationForm({ action, accounts, mediaByAccount, initial, accountLocked }: AutomationFormProps) {
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [scope, setScope] = useState(initial?.scope ?? "todos_posts");
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>(initial?.postIds ?? []);

  const media = mediaByAccount[accountId];

  function togglePost(id: string) {
    setSelectedPostIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <form action={action}>
      <div className={styles.formGroup}>
        <label htmlFor="nome">Nome da automação</label>
        <input id="nome" name="nome" type="text" defaultValue={initial?.nome} required />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="accountId">Conta</label>
        {accounts.length > 1 && !accountLocked ? (
          <select id="accountId" name="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.username}
              </option>
            ))}
          </select>
        ) : (
          <p className={styles.muted}>@{accounts.find((a) => a.id === accountId)?.username}</p>
        )}
        <input type="hidden" name="accountId" value={accountId} />
      </div>

      <div className={styles.formGroup}>
        <label>Onde vale</label>
        <div className={styles.segmented}>
          <button
            type="button"
            className={scope === "todos_posts" ? styles.segmentedActive : styles.segmentedOption}
            onClick={() => setScope("todos_posts")}
          >
            Todos os posts
          </button>
          <button
            type="button"
            className={scope === "posts_especificos" ? styles.segmentedActive : styles.segmentedOption}
            onClick={() => setScope("posts_especificos")}
          >
            Posts específicos
          </button>
        </div>
        <input type="hidden" name="scope" value={scope} />
      </div>

      {scope === "posts_especificos" && (
        <div className={styles.formGroup}>
          <label>Selecione os posts/reels ({selectedPostIds.length} selecionado(s))</label>
          <input type="hidden" name="postIds" value={selectedPostIds.join("\n")} />
          {!media || media.items.length === 0 ? (
            <p className={styles.muted}>
              {media?.erro
                ? "Não foi possível carregar os posts dessa conta (verifique a conexão em Conexões)."
                : "Nenhum post encontrado para essa conta."}
            </p>
          ) : (
            <div className={styles.postGrid}>
              {media.items.map((item) => {
                const selecionado = selectedPostIds.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => togglePost(item.id)}
                    className={selecionado ? styles.postThumbSelected : styles.postThumb}
                    title={item.caption ?? ""}
                  >
                    {item.displayUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.displayUrl} alt="" />
                    ) : (
                      <span className={styles.postThumbFallback}>{item.mediaType}</span>
                    )}
                    {selecionado && <span className={styles.postThumbCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="keywords">Palavras-chave (uma por linha)</label>
        <textarea
          id="keywords"
          name="keywords"
          rows={3}
          defaultValue={initial?.keywords?.join("\n")}
          placeholder="quero&#10;link"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="dmTexto">Mensagem da DM</label>
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

      <details className={styles.advanced}>
        <summary>Opções avançadas</summary>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="matchMode">Modo de match das palavras-chave</label>
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
      </details>

      <button className={styles.button} type="submit" style={{ marginTop: 16 }}>
        Salvar
      </button>
    </form>
  );
}
