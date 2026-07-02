# Guide de démarrage — Ellipse

> Ellipse : **IA native (Cortex)** + **infra distribuée** — voir [ORDRE-001](../04-roadmap/CONSTRUCTION_ORDERS.md) et [ORDRE-006](../04-roadmap/CONSTRUCTION_ORDERS.md).
## Prérequis

- **Node.js** ≥ 22
- **pnpm** ≥ 9 (ou `npx pnpm@9`)
- **Docker Desktop** (Redis, Postgres, MinIO — optionnel Phase 1)
- **GPU NVIDIA** (Phase 2+) : inference Cortex + ComfyUI local

---

## Installation

```bash
cd "Projet Ellipse"
pnpm install
cp .env.example .env
# Configurer ELLIPSE_MODELS_DIR si weights disponibles
```

---

## Commandes

```bash
pnpm build
pnpm dev:orchestrator   # API + Ellipse Cortex (:4400)
pnpm dev:studio         # Interface (:4273)
pnpm orchestrator:plan "platformer chat ninja"
pnpm test
```

---

## Premier test — Cortex natif

```bash
pnpm orchestrator:plan "Je veux un platformer 2D avec un chat ninja"
```

Sortie : `GenerationPlan` produit par **Ellipse Cortex**, délégué aux 7 sous-agents enregistrés.

---

## Configuration `.env`

Copier le modèle et renseigner le mot de passe PostgreSQL :

```bash
cp .env.example .env
```

PostgreSQL (conteneur `postgres-ellisphere`, port **5435**) :

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5435
POSTGRES_DB=ellisphere
POSTGRES_USER=ellisphere
POSTGRES_PASSWORD=<mot de passe conteneur Docker>
DATABASE_URL=postgresql://ellisphere:<mdp_encodé>@localhost:5435/ellisphere
```

Détails : [DATABASE.md](DATABASE.md)

---

## Infra (services séparés)

```bash
docker compose -f infra/compose/docker-compose.yml up -d
# ou : docker compose up -d  (depuis la racine)
```

Services : `ellipse-bus` (Redis), `ellipse-asset-store` (MinIO).

PostgreSQL : conteneur **`postgres-ellisphere`** sur **localhost:5435** (hors compose — voir [DATABASE.md](DATABASE.md)).

Catalogue complet : [INFRASTRUCTURE.md](../02-architecture/INFRASTRUCTURE.md) · `infra/services/SERVICE_CATALOG.yaml`

---

## Ajouter un sous-agent Ellipse

1. Créer `packages/agents/src/agents/mon-agent/`
2. Implémenter `Agent` + enregistrer dans `registry.ts`
3. Ajouter entrée dans `packages/cortex/models/manifest.json`
4. Documenter dans [AGENTS.md](../02-architecture/AGENTS.md)
5. Vérifier conformité [CONSTRUCTION_ORDERS.md](../04-roadmap/CONSTRUCTION_ORDERS.md) (ORDRE-002 + ORDRE-006)
6. Ajouter entrée dans `infra/services/SERVICE_CATALOG.yaml` si nouveau worker déployable

---

## Ressources

- [Ordres de construction](../04-roadmap/CONSTRUCTION_ORDERS.md) — ORDRE-001 à ORDRE-006
- [Infrastructure distribuée](../02-architecture/INFRASTRUCTURE.md)
- [Ellipse Cortex](../02-architecture/ELLIPSE_AI.md)
- [Base de données PostgreSQL](DATABASE.md)
- [Agents](../02-architecture/AGENTS.md)
