# Image de l'API pour Railway ou Fly.io. À construire depuis la racine du dépôt :
#   docker build -f apps/backend/Dockerfile -t cookinglabs-api .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# 1. Ne garder du monorepo que ce dont l'API a besoin.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.10 prune backend --docker

# 2. Installer les dépendances, puis compiler.
FROM base AS build
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ .
RUN pnpm --filter backend exec prisma generate && pnpm --filter backend build

# 3. Au démarrage : appliquer les migrations, puis lancer l'API.
FROM build AS run
ENV NODE_ENV=production
EXPOSE 3001
WORKDIR /app/apps/backend
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
