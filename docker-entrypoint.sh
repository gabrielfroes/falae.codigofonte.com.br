#!/bin/sh
# Roda antes de qualquer comando do container (pnpm start, pnpm worker, ...).
# Garante que as migrations sempre rodam, mesmo se o Start Command no
# Dokploy (ou o "command" do docker-compose) não incluir isso explicitamente
# — foi exatamente a falta disso que quebrou o primeiro deploy em produção
# ("table public.users does not exist").
#
# Os scripts "start" e "worker" do package.json TAMBÉM rodam
# "prisma migrate deploy" antes do processo principal — de propósito,
# redundante. Se a plataforma de deploy substituir o ENTRYPOINT em vez de
# só o CMD (ex: um Start Command que vira `--entrypoint`), esse script aqui
# nem roda, e a segunda camada nos scripts npm continua garantindo a
# migration. `prisma migrate deploy` é seguro de rodar mais de uma vez.
set -e

echo "[entrypoint] rodando prisma migrate deploy..."
pnpm db:migrate

exec "$@"
