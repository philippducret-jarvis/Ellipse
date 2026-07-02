# Stack technique Ellipse

## Principes de sélection

1. **TypeScript first** pour orchestration, agents, studio
2. **IA 100 % Ellipse** — Cortex natif ([ORDRE-001](../04-roadmap/CONSTRUCTION_ORDERS.md))
3. **Infra distribuée** — services indépendants, pas de monolithe ([ORDRE-006](../04-roadmap/CONSTRUCTION_ORDERS.md))
4. **Performance** — WebGPU / Rust pour le runtime jeu
5. **Self-hostable** — inference et weights on-premise

---

## Stack par couche

### Frontend — Ellipse Studio
| Techno | Rôle |
|--------|------|
| **React 19** | UI composants |
| **TypeScript 5.x** | Typage strict |
| **Vite** | Build dev rapide |
| **Tailwind CSS 4** | Design system |
| **Zustand** | État client léger |
| **Three.js / React Three Fiber** | Preview 3D |
| **PixiJS 8** | Preview 2D haute perf |
| **Monaco Editor** | Vue GDL avancée (mode expert) |

### Backend — Orchestrator & API
| Techno | Rôle |
|--------|------|
| **Node.js 22 LTS** | Runtime serveur |
| **Fastify** | API REST haute perf |
| **WebSocket (ws)** | Streaming agents |
| **BullMQ + Redis** | Queue tâches agents |
| **PostgreSQL** | Projets, users, historique |
| **MinIO / S3** | Stockage assets |

### IA — Ellipse Cortex (native)
| Composant | Package | Rôle |
|-----------|---------|------|
| **Cortex Maîtresse** | `@ellipse/cortex` | Intent, planification, synthèse GDL |
| **Model Registry** | `cortex/models/manifest.json` | Mapping agent → modèle Ellipse |
| **Sous-agents** | `@ellipse/agents` | Exécution domaine (registry) |
| **Pipeline ML** | `@ellipse/pipeline` | Workers GPU — weights locaux |

| Capacité ML | Modèle intégré (local) | Phase |
|-------------|------------------------|-------|
| Intent / plan | ellipse-cortex-master | 1-2 |
| Image gen | SDXL / Flux (self-host) | 2 |
| Segmentation | SAM 2, rembg | 2 |
| Depth | Depth Anything V2 | 3 |
| Image→3D | TripoSR | 3 |
| Audio | AudioCraft | 2 |
| Embeddings | CLIP (local) | 2 |

> ❌ **Exclus :** OpenAI, Anthropic, Gemini API, ou tout service cognitif SaaS.

### Moteur de jeu — Ellipse Engine
| Phase | Stack |
|-------|-------|
| **Phase 1 (2D)** | TypeScript + PixiJS + matter.js (physics) |
| **Phase 2 (2D HD)** | WebGL2 custom shaders, spine-like animation |
| **Phase 3 (3D)** | **Bevy (Rust)** → WASM ou native ; glTF |
| **Phase 4 (3D HD)** | PBR, cascaded shadows, post-processing |

### Pipeline assets
| Techno | Rôle |
|--------|------|
| **Python 3.12** | Workers ML lourds (microservice) |
| **ComfyUI local** | Workflows diffusion Ellipse |
| **Docker** | Isolation workers GPU |
| **gltf-transform** | Optimisation meshes |

### DevOps
| Techno | Rôle |
|--------|------|
| **pnpm workspaces** | Monorepo |
| **Turborepo** | Cache build |
| **GitHub Actions** | CI |
| **Docker Compose** | Dev local (Redis, Postgres, MinIO) |

---

## Déploiement

Architecture **multi-services** — voir [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).

```
Studio → Gateway → Orchestrator ↔ Cortex
              ↓
         Event Bus (Redis/NATS)
              ↓
    Agent workers │ Pipeline workers │ Stores
```

Catalogue : `infra/services/SERVICE_CATALOG.yaml`

---

## Dépendances clés (npm)

```json
{
  "cortex": ["@ellipse/shared", "uuid"],
  "orchestrator": ["fastify", "bullmq", "@ellipse/cortex", "@ellipse/agents"],
  "engine": ["pixi.js", "matter-js", "howler"],
  "studio": ["react", "zustand"],
  "shared": ["zod"]
}
```

---

## Environnement

| Variable | Usage |
|----------|-------|
| `ELLIPSE_MODELS_DIR` | Racine poids Cortex |
| `ELLIPSE_CORTEX_MASTER` | Modèle maître |
| `ELLIPSE_GPU_DEVICE` | Device inference |
| `REDIS_URL` | Queue |
| `DATABASE_URL` | Postgres (`postgres-ellisphere:5435`) |
| `POSTGRES_*` | Composants connexion BDD (voir `.env.example`) |
| `S3_*` | Asset storage |
| `COMFYUI_URL` | Diffusion **locale** |

Voir `.env.example`. **Pas de clés API LLM.**

---

## Standards code

- **Zod** — validation runtime
- **Conventional Commits**
- **Checklist ORDRE-001** avant chaque PR ([CONSTRUCTION_ORDERS.md](../04-roadmap/CONSTRUCTION_ORDERS.md))
