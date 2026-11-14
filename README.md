# CookingLabs

Plateforme e-learning (LMS) pour former les salariés d'une entreprise.

## Stack

| Couche                      | Choix                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| Monorepo                    | Turborepo + pnpm                                                                  |
| Front                       | Next.js (App Router), Tailwind CSS, shadcn/ui                                     |
| Back                        | NestJS, Swagger sur `/api/docs`                                                   |
| Base de données             | PostgreSQL + Prisma                                                               |
| Sécurité                    | Guards NestJS (rôles), `@nestjs/throttler`                                        |
| Tests                       | Vitest + SWC (unitaires), Testcontainers (intégration), Playwright (bout en bout) |
| Qualité                     | Biome, Husky + lint-staged, GitHub Actions                                        |
| Hébergement                 | Vercel (front), Railway ou Fly.io (API + PostgreSQL), Docker                      |
| Médias et e-mails (à venir) | Cloudflare Stream, Cloudflare R2, Resend                                          |

## Structure

```
apps/
  frontend/   Next.js : les pages, sur http://localhost:3000
  backend/    NestJS : l'API, sur http://localhost:3001/api
      prisma/schema.prisma   le modèle de données (source de vérité)
```

Le navigateur n'appelle que `/api/...` sur le site : Next.js transmet à NestJS (`rewrites` dans `apps/frontend/next.config.ts`).

## Démarrer

Prérequis : Node 24 et Docker. pnpm s'active avec `corepack enable`.

```bash
corepack enable
pnpm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
pnpm dev
```

## Commandes

| Commande                           | Effet                                       |
| ---------------------------------- | ------------------------------------------- |
| `pnpm dev`                         | Lance le front et l'API                     |
| `pnpm lint` / `pnpm format`        | Vérifie / corrige le code avec Biome        |
| `pnpm typecheck`                   | Vérifie les types                           |
| `pnpm test`                        | Tests unitaires                             |
| `pnpm test:integration`            | Tests avec une vraie base (Docker requis)   |
| `pnpm test:e2e`                    | Tests Playwright dans un navigateur         |
| `pnpm build`                       | Construit les deux applications             |
| `pnpm --filter backend db:migrate` | Applique les changements de `schema.prisma` |
| `pnpm --filter backend db:studio`  | Ouvre la base dans le navigateur            |
| `pnpm --filter backend db:seed `   | Crée le compte de test                      |

Avant chaque commit, Husky lance Biome sur les fichiers modifiés.

L'API se construit en image Docker pour Railway ou Fly.io : `docker build -f apps/backend/Dockerfile .`
