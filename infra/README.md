# Infrastructure Ellipse

Architecture **distribuée** — ORDRE-006 : **pas de monolithe**.

Documentation complète : [docs/02-architecture/INFRASTRUCTURE.md](../docs/02-architecture/INFRASTRUCTURE.md)

## Structure

```
infra/
├── services/SERVICE_CATALOG.yaml   # Catalogue officiel des services
├── docker/                         # Dockerfile par service (Phase 1)
└── compose/
    └── docker-compose.yml          # Dev — infra + services séparés
```

## Démarrage dev (infra seule)

```bash
docker compose -f infra/compose/docker-compose.yml up -d
```

Services infra : Redis (bus), Postgres (GDL/projects), MinIO (assets).

## Règle

- **Monorepo** (`packages/`) = organisation code ✅
- **Monolithe runtime** = un processus qui fait tout ❌

Chaque service = container/processus indépendant, contrat API versionné, scaling propre.
