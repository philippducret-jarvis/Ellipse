# Fondation Ellipse — checklist exécution

## Commandes (ordre recommandé)

```bash
# 1. Infra Redis (bus agents)
docker compose -f infra/compose/docker-compose.yml up -d ellipse-bus

# 2. PostgreSQL — conteneur postgres-ellisphere déjà sur :5435

# 3. Variables (.env à la racine avec POSTGRES_*)

# 4. Migrations BDD
pnpm db:migrate

# 5. Build
pnpm build

# 6. Workers agents (terminal 1)
pnpm dev:workers

# 7. Orchestrator (terminal 2, :4400)
pnpm dev:orchestrator

# 8. Studio (terminal 3, :4273)
pnpm dev:studio

# Ou tout-en-un dev (sans workers séparés — fallback inline)
pnpm dev:stack
```

## Gateway (optionnel)

```bash
pnpm dev:gateway   # :4480 → proxy orchestrator + studio
```

## Critères Phase 1 fondation

- [x] `@ellipse/db` — migrations + sessions PostgreSQL
- [x] `@ellipse/bus` — BullMQ / Redis
- [x] Workers agents isolés
- [x] Orchestrator — health, upload, generate, persist
- [x] Engine 2D jouable (platformer)
- [x] Studio — upload, generate, preview
- [x] `@ellipse/gateway` — routing
- [x] Dockerfiles orchestrator + agent-worker
