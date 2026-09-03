#!/bin/sh
# Roda antes de qualquer comando do container (pnpm start, pnpm worker, ...).
# Garante que as migrations sempre rodam, mesmo se o Start Command no
# Dokploy (ou o "command" do docker-compose) não incluir isso explicitamente
# — foi exatamente a falta disso que quebrou o primeiro deploy em produção
# ("table public.users does not exist").
set -e

echo "[entrypoint] rodando prisma migrate deploy..."
pnpm db:migrate

exec "$@"
