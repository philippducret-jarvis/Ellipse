# Roadmap ambitieuse Ellipse — 2026-2028

> **Vision :** devenir la première **usine de jeux vidéo multi-agents souveraine** — où une IA maîtresse et 16+ agents spécialisés transforment une idée (et des photos) en jeu HD jouable, itérable et exportable, sans écrire de code.

**Date :** 18 juin 2026  
**Horizon :** 24 mois (Phase 0 → Phase 4+)  
**Références externes :** [StraySpark MCP pipelines](https://www.strayspark.studio/blog/building-multi-agent-game-dev-pipelines-mcp), [RGS Framework 55 agents](https://github.com/benedek-dev/RGS-Framework), [ComfyUI 2D character pipeline](https://github.com/mor-o/comfyui-2d-character-pipeline), [VNCCS character suite](https://github.com/AHEKOT/ComfyUI_VNCCS)

---

## Partie I — État des lieux et ambition

### Ce qui existe (Phase 0-1 ✅)

- Monorepo 10 packages, typecheck vert, 19 tests
- Boucle photo → platformer jouable (heuristique + Sharp)
- 16 agents runtime enregistrés, bus Redis/BullMQ
- Studio React, Game Factory, workspace Echoes
- Taxonomie 11 familles assets + pipeline 8 stages (spec)

### Ce qui manque pour « voir le jour »

| Gap | Impact |
|-----|--------|
| Monolithe orchestrator (Cortex + API + factory) | Scaling impossible, dette |
| UI prototype | Crédibilité produit zero |
| Agents procéduraux vs ML réel | Promesse IA non tenue |
| Assets mélangés / mal synchronisés | Chaos production |
| Pas de Git / CI | Risque perte, pas de release |
| 14/16 modèles Cortex `pending` | Cognition = heuristique |

### Ambition cible (24 mois)

```
Utilisateur : « Je veux un metroidvania spore/cyberpunk avec ce chien en héros »
                                    │
                    ┌───────────────▼───────────────┐
                    │  Ellipse Cortex (souverain)   │
                    │  Intent → GDD → Plan DAG      │
                    └───────────────┬───────────────┘
          ┌─────────┬─────────┬─────┴─────┬─────────┬─────────┐
          ▼         ▼         ▼           ▼         ▼         ▼
      Character  Level    Gameplay   Narrative  Music    QA
      (photo→    (proc+   (GDL       (quêtes,   (BGM     (bot
       sprite)    gen)     patches)   dialogues) adaptive) joueur)
          │         │         │           │         │         │
          └─────────┴─────────┴─────┬─────┴─────────┴─────────┘
                                    ▼
                         Jeu HD jouable + export HTML5/desktop
                         Itération : « le boss phase 2 plus lent »
```

**Différenciation vs concurrence :**
- **Souveraineté** (ORDRE-001) — pas de SaaS cognitif, poids Ellipse
- **GDL zero-code** — pas de code utilisateur, patches validés
- **Photo-to-Game natif** — pipeline vision intégré, pas plugin
- **Taxonomie assets stricte** — usine, pas dossier fourre-tout
- **Studio unifié** — création + production + preview + agents live

---

## Partie II — Principes directeurs (enregistrés)

### ORDRE-006 renforcé — Zéro monolithe

Règle Cursor : `.cursor/rules/ordre-006-no-monolith.mdc` (alwaysApply)

| Composant | Cible déployable | Port | État |
|-----------|------------------|------|------|
| `@ellipse/gateway` | ellipse-gateway | 4480 | ✅ |
| `@ellipse/orchestrator` | ellipse-orchestrator | 4400 | ⚠️ trop gros |
| `@ellipse/cortex` | ellipse-cortex | 4401 | ❌ lib embarquée |
| `@ellipse/agents` | ellipse-agent-* (×16 pools) | — | ⚠️ Dockerfile cassé |
| `@ellipse/pipeline` | ellipse-pipeline-gpu | — | ⚠️ stub diffusion |
| `@ellipse/studio` | ellipse-studio | 4273 | ✅ |
| `@ellipse/engine` | client-side | — | ✅ |
| `@ellipse/db` | migrations | — | ✅ |
| `@ellipse/bus` | redis | 6379 | ✅ |

### Taxonomie assets — Zéro mélange

Règle Cursor : `.cursor/rules/asset-taxonomy.mdc`  
Source code : `packages/shared/src/assets/taxonomy.ts`

---

## Partie III — Roadmap détaillée par phase

---

### PHASE A — Fondations production (Semaines 1-4) 🔴 URGENT

**Objectif :** Git, découpage monolithe, taxonomie synchronisée, agents branchés sur stages.

#### Semaine 1 — Gouvernance & anti-monolithe

| Jour | Livrable | Owner |
|------|----------|-------|
| L | `git init` + commit initial + `.github/workflows/ci.yml` | DevOps |
| M | Extraire `orchestrator/src/routes/` (plan, generate, sessions, projects) | Backend |
| M | Extraire `orchestrator/src/ws/generate.ts` | Backend |
| J | Créer `orchestrator/src/asset-pipeline/` (dispatch stage) | Backend |
| V | Corriger `agent-worker.Dockerfile` + `cortex.Dockerfile` | Infra |

**Critère done :** `server.ts` < 150 lignes, CI typecheck + test on push.

#### Semaine 2 — Taxonomie & registry synchronisés

| Jour | Livrable |
|------|----------|
| L-M | Resync `asset-taxonomy.json` ↔ disque Echoes (5 slots synthétiques → realized) |
| M | Corriger `family_id` dans `model-routing.json` |
| J | Matérialiser cast manquant : Cardinal boss, ennemis individuels |
| V | `catalog.mjs` importe depuis `@ellipse/shared` (build) |

**Critère done :** `pnpm echoes:validate` vert, 0 family_id orphelins.

#### Semaine 3 — Agents stages 02-03 (découpage réel)

| Jour | Livrable |
|------|----------|
| L-M | API `POST .../stages/02_cutouts/run` |
| M-J | Worker character : SAM2/rembg → écrit `02_cutouts/` |
| J-V | Worker character : cleanup Sharp → `03_cleanup/` |
| V | Tests intégration stage 02 sur hero Echoes |

**Critère done :** Photo héros → cutout alpha + parts masks automatiques.

#### Semaine 4 — Agents stage 05 (mouvements v0)

| Jour | Livrable |
|------|----------|
| L-M | ComfyUI workflow idle+walk (ControlNet OpenPose) |
| M-J | Animation agent dispatch queue GPU |
| J-V | Spritesheet walk 6 frames → `05_animation/` |
| V | Engine charge animation walk depuis export stage 06 |

**Critère done :** Héros Echoes marche avec spritesheet généré (pas procédural).

---

### PHASE B — Studio professionnel (Semaines 5-8)

**Objectif :** UI niveau produit, assets par famille, workflow actionnable.

Spec complète : [STUDIO_UI_V2.md](../02-architecture/STUDIO_UI_V2.md)

#### Semaine 5 — Design system

- Tailwind v4 + shadcn/ui + tokens
- Purge legacy UI (FactoryView, CreateView, Sidebar)
- Split `styles.css` → `design/tokens.css` + modules

#### Semaine 6 — Routing & navigation

- React Router : `/projects/:slug/assets/:id`
- Breadcrumbs, app shell 3 zones
- i18n français

#### Semaine 7 — AssetsTab v2

- Grille 11 familles depuis `@ellipse/shared`
- AssetStagePipeline (barre 01-07)
- Boutons « Lancer découpage », « Générer animations »

#### Semaine 8 — Preview & agents live

- EmbeddedGamePreview (moteur in-app)
- AgentLiveBoard WebSocket
- Toasts, skeletons, empty states polish

**Critère done :** Utilisateur non-dev peut lancer découpage héros depuis Studio sans voir JSON.

---

### PHASE C — Usine ML souveraine (Mois 3-6)

**Objectif :** Weights Ellipse, ComfyUI production, TripoSR, fine-tune par domaine.

#### Mois 3 — Infrastructure GPU

| Composant | Action |
|-----------|--------|
| ComfyUI | Deploy worker isolé, workflows versionnés dans `infra/comfyui/workflows/` |
| ellipse-asset-v0 | Entraînement LoRA style Echoes (`training/`) |
| SAM2 + rembg | Nodes ComfyUI intégrés pipeline |
| MinIO | Brancher uploads assets (remplacer filesystem prod) |
| OpenTelemetry | Traces cross-services |

#### Mois 4 — Pipeline personnage complet

Inspiré [ComfyUI 2D character pipeline](https://github.com/mor-o/comfyui-2d-character-pipeline) :

1. Photo → cutout → rig 2D
2. Base motion (idle, walk, jump) greyscale RGBA
3. Cosmetic layers (hair, eyes, clothes) pixel-aligned
4. Atlas Aseprite + state machine

**Agents impliqués :** character, animation, qa

#### Mois 5 — Ennemis, boss, PNJ

| Type | Pipeline spécifique |
|------|---------------------|
| Enemy | Variantes palette, comportement patrol GDL |
| Boss | Multi-phase spritesheets, arena props, FX pack |
| NPC | Portrait + emotion sheet (VNCCS pattern) |
| Mount/Summon | Rig + ride animation |

#### Mois 6 — Environnements & audio

| Type | Pipeline |
|------|----------|
| Tileset | decor agent + diffusion seamless |
| Parallax | layers séparés, depth metadata |
| Biome kit | collision shell auto |
| Music | music agent + loops adaptive |
| SFX | sfx agent + presets par action GDL |
| Voice | TTS local (Phase 2+) |

**Jalon Phase C :** Echoes of the Mushroom Realm — tous cast matérialisés, stages 01-07 sur hero + 1 enemy + 1 boss + 1 level kit.

---

### PHASE D — Cognition souveraine (Mois 6-9)

**Objectif :** Remplacer heuristique par modèles Ellipse from-scratch.

| Modèle | Domaine | Remplace |
|--------|---------|----------|
| cortex-master-v0 | Intent + plan DAG | HeuristicProvider |
| ellipse-gameplay-v0 | Patches GDL | Templates statiques |
| ellipse-character-v0 | Vision sprite | Sharp-only |
| ellipse-level-v0 | Layout procédural | level-gen heuristique |
| ellipse-qa-v0 | Validation + bot | Règles hardcodées |

**Pipeline entraînement :** `training/` → datasets projets Ellipse → export ONNX → `EllipseProvider`

**Pont Ollama :** retirer modalité par modalité dès poids Ellipse disponibles (ORDRE-001).

**Service Cortex :** HTTP `:4401`, plus embarqué dans orchestrator.

---

### PHASE E — 3D & HD (Mois 9-15)

| Feature | Technologie | Agent |
|---------|-------------|-------|
| Photo → mesh | TripoSR, InstantMesh | mesh_3d |
| PBR textures | ComfyUI material | decor |
| Éclairage 3D | bake shadows | lighting |
| Caméra 3D | follow cam, ciné | camera |
| Preview 3D | Bevy/WASM ou Three.js avancé | engine |
| Export desktop | Electron/Tauri | integration |

**Jalon :** Jeu 2.5D (sprites + mesh fond) jouable export HTML5 + desktop.

---

### PHASE F — Produit & scale (Mois 15-24)

| Feature | Description |
|---------|-------------|
| SaaS multi-tenant | Projets isolés, quotas GPU |
| Marketplace templates | Jeux Ellipse pré-configurés |
| Collaboration CRDT | Édition multi-utilisateur Studio |
| Mobile web export | PWA, touch controls |
| MCP Ellipse | Exposer agents comme tools MCP (interop Blender, Unreal) |
| Agent narrative avancé | Quêtes procédurales, dialogues branchés |
| Fine-tune par projet | LoRA style par workspace |
| Auto-QA nightly | Bot joue 30 min, rapport régression |

---

## Partie IV — Architecture cible multi-agents (inspirée industrie)

### Pattern supervisor (EITT 2026)

```
CortexMaster (supervisor)
    │
    ├── character worker pool (scale N)
    ├── animation worker pool
    ├── level worker pool
    ├── pipeline GPU pool (ComfyUI)
    └── qa validator (checkpoint entre phases)
```

### Pattern MCP (StraySpark 2025)

Ellipse expose des **MCP tools** :
- `ellipse.plan_game(prompt, images)`
- `ellipse.run_asset_stage(asset_id, stage)`
- `ellipse.preview_gdl(project_id)`
- `ellipse.export_build(target)`

Permet orchestration externe (Blender, Unreal, CI) sans coupler le monorepo.

### Pattern studio AAA simulé (RGS / 14 agents)

Mapping Ellipse vers rôles studio :

| Rôle studio | Ellipse |
|-------------|---------|
| Creative Director | CortexMaster + narrative |
| Art Director | art_direction factory agent |
| Asset Artist | character, decor, ui, vfx |
| Animator | animation |
| Level Designer | level |
| Gameplay Programmer | gameplay |
| QA Lead | qa |
| Build Engineer | integration |

---

## Partie V — Matrice agents × types assets

| Agent | Hero | Enemy | Boss | NPC | Map | Prop | UI | Audio | FX |
|-------|------|-------|------|-----|-----|------|----|----|-----|
| character | ●●● | ●●● | ●● | ●● | ○ | ○ | ○ | ○ | ○ |
| decor | ○ | ○ | ○ | ○ | ●●● | ● | ○ | ○ | ○ |
| animation | ●●● | ●●● | ●●● | ● | ○ | ○ | ● | ○ | ● |
| level | ○ | ● | ● | ○ | ●●● | ● | ○ | ○ | ○ |
| mesh_3d | ● | ● | ●●● | ○ | ● | ● | ○ | ○ | ○ |
| gameplay | ●● | ●● | ●●● | ● | ●● | ● | ● | ○ | ○ |
| narrative | ● | ○ | ● | ●●● | ● | ○ | ● | ○ | ○ |
| music | ○ | ○ | ● | ○ | ● | ○ | ○ | ●●● | ○ |
| sfx | ● | ● | ● | ○ | ● | ● | ● | ●● | ● |
| ui | ● | ○ | ● | ● | ○ | ○ | ●●● | ○ | ○ |
| vfx | ● | ● | ●●● | ○ | ● | ● | ● | ○ | ●●● |
| qa | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| integration | ● | ● | ● | ● | ● | ● | ● | ● | ● |

Légende : ○ optionnel · ● important · ●●● critique

---

## Partie VI — Jalons mesurables

| Jalon | Date cible | Critère |
|-------|------------|---------|
| **J0** Git + CI | S+1 | Push → typecheck + test |
| **J1** Anti-monolithe orchestrator | S+2 | server.ts < 150 lignes |
| **J2** Découpage hero auto | S+4 | Stage 02-03 hero Echoes |
| **J3** Walk animation ML | S+4 | Spritesheet walk non procédural |
| **J4** Studio v2 alpha | S+8 | Assets par famille, actions stage |
| **J5** Echoes cast complet | M+6 | 5 ennemis + 2 boss matérialisés |
| **J6** Cortex ONNX v0 | M+9 | Plan platformer sans heuristique |
| **J7** Export HTML5 standalone | M+9 | 1 clic depuis Studio |
| **J8** Jeu 2.5D demo | M+12 | Echoes jouable HD 30 min |
| **J9** Beta privée SaaS | M+18 | 10 projets, quotas GPU |
| **J10** Public launch | M+24 | Marketplace + docs publiques |

---

## Partie VII — Prochaines actions immédiates (cette semaine)

1. ✅ Règles Cursor ORDRE-006 + asset-taxonomy enregistrées
2. ✅ Taxonomie canonique `@ellipse/shared/src/assets/`
3. ✅ Spec Studio UI v2 + pipeline agents production
4. ⬜ `git init` + CI GitHub Actions
5. ⬜ Découper `orchestrator/server.ts` → routes modulaires
6. ⬜ API `POST /stages/:stageId/run` + brancher worker character
7. ⬜ Resync Echoes taxonomy + matérialiser Sporeling stage 02
8. ⬜ Sprint UI-1 : Tailwind + purge legacy

---

## Partie VIII — Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| GPU coûteux | Queue BullMQ, workers spot, fallback CPU (rembg) |
| ComfyUI instable | Workflows versionnés, retry, QA gate |
| Scope creep | Jalons J0-J4 stricts avant Phase C |
| Modèles Ellipse longs à entraîner | Pont Ollama toléré (ORDRE-001) |
| UI rewrite bloque features | Paralléliser backend agents + frontend |
| Pas de Git | **Bloquant** — J0 priorité absolue |

---

## Annexes

- [ASSET_TAXONOMY.md](../02-architecture/ASSET_TAXONOMY.md) — inventaire complet types
- [STUDIO_UI_V2.md](../02-architecture/STUDIO_UI_V2.md) — spec UI professionnelle
- [AGENT_PRODUCTION_PIPELINE.md](../03-pipelines/AGENT_PRODUCTION_PIPELINE.md) — découpage/rig/anim
- [MODULARITY_AUDIT.md](../04-architecture/MODULARITY_AUDIT.md) — dette technique
- [CONSTRUCTION_ORDERS.md](CONSTRUCTION_ORDERS.md) — ordres normatifs

---

> *« Le Figma du jeu vidéo »* — Ellipse ne génère pas des assets isolés ; il orchestre une **usine de production** où chaque agent, chaque stage et chaque type d'asset a sa place, son contrat et sa gate qualité.
