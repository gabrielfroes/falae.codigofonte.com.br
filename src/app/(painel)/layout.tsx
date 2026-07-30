import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import styles from "./panel.module.css";
import { logoutAction } from "./actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Image src="/codigofonte-icon.svg" alt="" width={28} height={28} />
          <div>
            <strong>Falae</strong>
            <span>Código Fonte</span>
          </div>
        </div>

        <Link href="/">Dashboard</Link>
        <Link href="/conexoes">Conexões</Link>
        <Link href="/automacoes">Automações</Link>
        <Link href="/atividade">Atividade</Link>
        <Link href="/configuracoes">Configurações</Link>

        <div className={styles.sidebarFooter}>
          <p>
            {user.nome} · {user.email}
          </p>
          <form action={logoutAction}>
            <button className={styles.logoutButton} type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
