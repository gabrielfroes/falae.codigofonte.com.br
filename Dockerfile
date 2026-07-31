# Imagem única para os processos "app" e "worker" — mesmo build, só muda o
# comando na hora de rodar. Localmente via docker-compose.yml (serviços com
# CMD diferente); no Dokploy via duas Applications com Start Command
# diferente, ambas com Build Type Dockerfile (ver docs/deploy-dokploy.md).

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
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
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["pnpm", "start"]
