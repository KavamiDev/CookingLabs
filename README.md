# CookingLabs

An e-learning platform for learn cooking skill (LMS).

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Front | **Vite + React + TypeScript** | Démarrage et rechargement instantanés, écosystème React énorme (formulaires, QCM, tableaux de bord), une SPA convient à une appli connectée comme un LMS. |
| Back | **NestJS** | Structure imposée (modules, contrôleurs, services) : idéal pour travailler à plusieurs sans se marcher dessus. Auth, rôles, validation, upload et tâches planifiées intégrés. Même langage que le front (TypeScript). |
| BDD | **PostgreSQL** | Données très relationnelles (utilisateurs, groupes, cours, leçons, QCM, notes, seuils). Fiable, gratuit, standard du marché. Accès via TypeORM. |

## Lancer le projet

```bash
docker compose up -d                      # PostgreSQL sur le port 5432
cd backend && npm install && npm run start:dev   # API sur http://localhost:3000
cd frontend && npm install && npm run dev        # Front sur http://localhost:5173
```
