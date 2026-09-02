# Imagem única para os processos "app" e "worker" — mesmo build, só muda o
# comando na hora de rodar. Localmente via docker-compose.yml (serviços com
# CMD diferente); no Dokploy via duas Applications com Start Command
# diferente, ambas com Build Type Dockerfile (ver docs/deploy-dokploy.md).

FROM node:22-alpine AS base
# pnpm 11 exige Node >=22.13 (engines) — node:20 falha em "pnpm install"
# com ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING. Confirme a versão mínima do
# pnpm fixado abaixo (`packageManager` no package.json) antes de rebaixar
# a imagem base.
#
# Ativa a versão exata do pnpm (do "packageManager" no package.json) uma
# única vez aqui na base — sem isso, cada stage abaixo (deps/build/runner)
# deriva de "base" de forma independente e o corepack tentaria baixar o
# pnpm de novo em cada uma, o que pode falhar em builds sem acesso de rede
# irrestrito (ex: sandbox de build do Dokploy).
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["pnpm", "start"]
