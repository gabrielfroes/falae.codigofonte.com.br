// Seed de dados para testar o fluxo localmente (ver scripts/simulate-webhook.ts).
// Idempotente: pode rodar de novo (pnpm db:seed) sem duplicar registros.

import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

const ACCOUNT_EXTERNAL_ID = "17841400000000000";

async function main() {
  const account = await prisma.account.upsert({
    where: { platform_externalId: { platform: "instagram", externalId: ACCOUNT_EXTERNAL_ID } },
    update: {},
    create: {
      platform: "instagram",
      externalId: ACCOUNT_EXTERNAL_ID,
      username: "codigofontetv",
      accessTokenEncrypted: encryptToken("fake-long-lived-token-para-testes-locais"),
      status: "conectado",
    },
  });

  const existingAutomation = await prisma.automation.findFirst({
    where: { accountId: account.id, nome: "Automação de teste" },
  });

  const automation =
    existingAutomation ??
    (await prisma.automation.create({
      data: {
        accountId: account.id,
        nome: "Automação de teste",
        scope: "todos_posts",
        status: "ativa",
        delayMinSeconds: 1,
        delayMaxSeconds: 2,
        keywords: { create: [{ termo: "quero", matchMode: "contem" }] },
        publicReplyTemplates: { create: [{ texto: "Enviei no seu direct! 📩" }] },
        dmTemplate: {
          create: {
            texto: "Oi! Aqui está o link que você pediu:",
            link: "https://codigofonte.com.br/material-de-teste",
          },
        },
      },
    }));

  console.log("Seed concluído:");
  console.log({ accountId: account.id, accountExternalId: account.externalId, automationId: automation.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
