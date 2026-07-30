// Cria o primeiro usuário admin do painel. Não há cadastro aberto — este
// script roda uma vez, direto no servidor, para destravar o convite dos
// demais (Configurações -> convidar) sem precisar de acesso ao banco na mão.
//
// Uso: pnpm create-admin <email> <nome> <senha>

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function main() {
  const [email, nome, senha] = process.argv.slice(2);
  if (!email || !nome || !senha) {
    console.error("Uso: pnpm create-admin <email> <nome> <senha>");
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres");
    process.exit(1);
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.error(`Já existe um usuário com o email ${email}`);
    process.exit(1);
  }

  const user = await prisma.user.create({
    data: { email, nome, passwordHash: await hashPassword(senha), role: "admin" },
  });

  console.log(`Usuário admin criado: ${user.email} (id ${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
