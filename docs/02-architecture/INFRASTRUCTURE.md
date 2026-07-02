# Infrastructure Ellipse — Architecture distribuée

> **ORDRE-006 :** pas de monolithe. Ce document définit la cible infra professionnelle du projet.
> Voir [CONSTRUCTION_ORDERS.md](../04-roadmap/CONSTRUCTION_ORDERS.md).

---

## Principe directeur

**Monorepo oui — monolithe non.**

| Concept | Ellipse |
|---------|---------|
| **Monorepo** (`packages/`) | ✅ Organisation du code, schemas partagés, DX |
| **Monolithe runtime** (un seul processus « tout-en-un ») | ❌ **Interdit en production** |
| **Services déployables indépendants** | ✅ **Obligatoire** |

Chaque bounded context possède son **propre service**, son **cycle de déploiement**, son **scaling** et ses **contrats API** versionnés.

---

## Carte des services

```
                         ┌─────────────────┐
                         │   CDN / Edge    │
                         └────────┬────────┘
                                  │
┌──────────────┐         ┌────────▼────────┐
│ ellipse-     │  HTTPS  │ ellipse-        │
│ studio       │────────►│ gateway           │
│ (frontend)   │         │ (API + WS)      │
└──────────────┘         └────────┬────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ ellipse-        │      │ ellipse-        │      │ ellipse-        │
│ orchestrator    │◄────►│ cortex          │      │ project-api     │
│ (sessions, DAG) │      │ (IA maîtresse)  │      │ (CRUD projets)  │
└────────┬────────┘      └─────────────────┘      └─────────────────┘
         │
         │  task.assign (queue)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ellipse-event-bus (NATS / Redis Streams)      │
└───┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┘
    ▼         ▼         ▼         ▼         ▼         ▼
 agent-    agent-    agent-    agent-    agent-    agent-
 asset     animation level     gameplay  audio     …
    │         │         │         │         │
    └─────────┴─────────┴─────────┴─────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ pipeline-   │ │ ellipse-    │ │ ellipse-    │
│ vision      │ │ asset-store │ │ gdl-store   │
│ pipeline-   │ │ (MinIO/S3)  │ │ (Postgres)  │
│ diffusion   │ └─────────────┘ └─────────────┘
└─────────────┘
         │
         ▼
┌─────────────────┐
│ ellipse-engine  │  ← preview client-side ; build-service séparé Phase 3
│ (runtime)       │
└─────────────────┘
```

---

## Catalogue des services

| Service | ID | Responsabilité | Package source | Scale |
|---------|-----|------------------|----------------|-------|
| Studio | `ellipse-studio` | UI utilisateur | `packages/studio` | Static CDN |
| Gateway | `ellipse-gateway` | Auth, routing, rate limit | `infra/services/gateway` | Horizontal |
| Orchestrator | `ellipse-orchestrator` | Sessions, dispatch DAG | `packages/orchestrator` | Horizontal |
| Cortex | `ellipse-cortex` | Intent, plan, synthèse | `packages/cortex` | GPU optional |
| Project API | `ellipse-project-api` | Projets, métadonnées | Phase 2 | Horizontal |
| Agent workers | `ellipse-agent-*` | 1 worker par type agent | `packages/agents` | Par charge |
| Pipeline vision | `ellipse-pipeline-vision` | Segmentation, depth | `packages/pipeline` | GPU pool |
| Pipeline diffusion | `ellipse-pipeline-diffusion` | ComfyUI / SDXL local | `packages/pipeline` | GPU pool |
| Asset Store | `ellipse-asset-store` | MinIO / S3 | Infra | Object storage |
| GDL Store | `ellipse-gdl-store` | Postgres + patches | Infra | DB cluster |
| Event Bus | `ellipse-bus` | NATS ou Redis Streams | Infra | Cluster |
| Engine Build | `ellipse-engine-build` | Builds export | Phase 3 | Queue workers |

**Règle :** un agent = **un worker déployable** (même codebase, processus/container séparé en prod).

---

## Communication inter-services

### Synchrone (REST / gRPC)
- Studio → Gateway → Orchestrator (création session, statut)
- Gateway → Project API (CRUD projet)
- Health checks : `GET /health` sur **chaque** service

### Asynchrone (obligatoire entre agents)
- Orchestrator publie `task.assign` sur le bus
- Agent worker consomme sa queue dédiée (`agent.asset`, `agent.level`, …)
- Agent publie `task.complete` / `task.fail`
- Pipeline workers : jobs GPU isolés (`pipeline.vision`, `pipeline.diffusion`)

### Contrats
- **JSON Schema** dans `schemas/` — versionnés (`task-spec@v1`)
- Breaking change = nouvelle version de schema + période de coexistence
- Pas d'import direct cross-service en runtime (pas de `require('@ellipse/agents')` depuis pipeline en prod)

---

## Anti-patterns interdits (ORDRE-006)

| ❌ Interdit | ✅ À la place |
|------------|---------------|
| Un binaire « ellipse-all » en production | Services séparés par domaine |
| Appels in-process Agent → Pipeline en prod | Message queue + worker dédié |
| Base de données partagée sans boundary | Schema par service ; GDL store vs asset store |
| Déploiement couplé (tout redéployer pour un fix UI) | CI/CD indépendant par service |
| Logique métier dans le Gateway | Gateway = routing + auth uniquement |
| GPU inference dans orchestrator | Pipeline workers pool GPU |

---

## Environnements

| Env | Objectif | Topologie |
|-----|----------|-----------|
| **local** | DX dev | `docker compose` multi-services ; certains processus `pnpm dev` |
| **staging** | Intégration | K8s / compose prod-like, tous services séparés |
| **production** | Utilisateurs | K8s, autoscaling agents + GPU node pool |

### Dev local — pas un monolithe déguisé

Même en dev, **chaque service a son port et son Dockerfile** :

```
4273  ellipse-studio
4480  ellipse-gateway
4400  ellipse-orchestrator
4401  ellipse-cortex
4010  ellipse-agent-asset (worker)
4020  ellipse-pipeline-vision
6379  redis (bus dev)
5435  postgres-ellisphere (externe — .env)
9000  minio
```

Un script `pnpm dev` peut **orchestrer** plusieurs processus (turbo parallel), sans les **fusionner** en un seul.

---

## Observabilité (obligatoire Phase 1+)

| Pilier | Outil cible |
|--------|-------------|
| Logs | JSON structuré, `service`, `trace_id`, `session_id` |
| Traces | OpenTelemetry — trace bout-en-bout session génération |
| Metrics | Prometheus — latence par agent, queue depth, GPU util |
| Health | Liveness + readiness par service |

---

## Sécurité infra

- **Network policies** — agents n'exposent pas de port public
- **Secrets** — vault / env injectés par service, pas de `.env` global partagé
- **Sandbox GPU** — pipeline workers isolés (containers, no host mount user)
- **Tenant isolation** — préfixe S3 par `project_id`

---

## Structure repo infra

```
infra/
├── README.md                 # Ce catalogue + runbooks
├── docker/
│   ├── gateway.Dockerfile
│   ├── orchestrator.Dockerfile
│   ├── cortex.Dockerfile
│   ├── agent-worker.Dockerfile
│   └── pipeline-vision.Dockerfile
├── compose/
│   ├── docker-compose.yml        # Dev — services séparés
│   └── docker-compose.gpu.yml      # Workers GPU
├── k8s/                      # Manifests Phase 2+
│   └── ...
└── services/
    └── SERVICE_CATALOG.yaml  # Source de vérité IDs + ports
```

---

## Alignement packages ↔ services

| Package npm | Type | Déploiement |
|-------------|------|-------------|
| `@ellipse/shared` | Lib | Bundlé dans chaque service (pas déployé seul) |
| `@ellipse/cortex` | Lib → service | **`ellipse-cortex`** process |
| `@ellipse/orchestrator` | Lib → service | **`ellipse-orchestrator`** process |
| `@ellipse/agents` | Lib → workers | **`ellipse-agent-{type}`** × N |
| `@ellipse/pipeline` | Lib → workers | **`ellipse-pipeline-*`** × N |
| `@ellipse/studio` | Frontend | Static **`ellipse-studio`** |
| `@ellipse/engine` | Runtime | Client + futur **`ellipse-engine-build`** |

---

## ADR infra

| ID | Décision | Raison |
|----|----------|--------|
| ADR-010 | Services déployables indépendants | ORDRE-006, scale, résilience |
| ADR-011 | Bus async inter-agents | Découplage, retry, parallélisme |
| ADR-012 | Monorepo pnpm | Schemas partagés — **≠** monolithe runtime |
| ADR-013 | Gateway dédié | Séparation edge / métier |
| ADR-014 | 1 queue par agent type | Isolation charge, scaling ciblé |

---

## Migration depuis le socle actuel (Phase 0 → 1)

| Étape | Action |
|-------|--------|
| 1 | Extraire `infra/compose/docker-compose.yml` multi-services |
| 2 | Dockerfile par service cible |
| 3 | Remplacer EventEmitter in-process par Redis Streams |
| 4 | Agent workers en processus séparés (BullMQ consumers) |
| 5 | Gateway devant orchestrator |
| 6 | OpenTelemetry sur orchestrator + 1 agent |

Voir [CONSTRUCTION_ORDERS.md](../04-roadmap/CONSTRUCTION_ORDERS.md) — prochaines actions infra.
