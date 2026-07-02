# Moteurs d'évolution assets — guide agents Ellipse

> **Pour l'IA et les agents** : comment faire évoluer une maquette vectorielle/procédurale
> vers des assets HD fidèles aux planches concept, puis vers un jeu shippable.

## Problème actuel (Veloria et Echoes)

| Ce qu'on livre aujourd'hui | Ce que le joueur/éditeur attend |
|---------------------------|--------------------------------|
| Primitives SVG → raster CPU | Pixels des planches concept, enrichis |
| IoU ~0.40–0.50 vs planche | IoU **≥ 0.72** (shipping) |
| Preview canvas custom | `@ellipse/engine` Pixi + atlas |
| Systèmes déclarés dans GDL | Systèmes **implémentés** en sim |
| ProductionTab lit du JSON | Studio **lance** stages et work orders |

**La vectorisation procédurale est un placeholder de pipeline**, pas le produit final.

---

## Pipeline shipping (obligatoire par pack)

Voir `packages/pipeline/src/asset-factory/fidelity-engine.ts` → `SHIPPING_ASSET_PIPELINE`.

```
01_source → 02_cutouts → 03_cleanup → 04_rig → 05_animation → 06_exports → 07_qa [GATE] → 08_inpaint
```

### Règles agents (non négociables)

1. **Ne jamais** utiliser un crop board seul comme sprite runtime final.
2. **Toujours** produire `07_qa/silhouette-diff-report.json` + heatmap.
3. Si IoU procédural < 0.55 → **hybrid planche** (normalisation + accents), pas procédural pur.
4. Si IoU < 0.42 → **human_qc_required** — ne pas avancer en production.
5. **Viser IoU 0.72+** avant de marquer un pack `production_ready`.

### Décision automatique

```typescript
import { decideFidelityPath, evaluateFidelityMetrics } from '@ellipse/pipeline';

const metrics = evaluateFidelityMetrics(iou, symmetricDiffPct);
const { decision, agent_instruction, next_engine } = decideFidelityPath({
  reference_label: 'board_cutout',
  candidate_label: 'procedural_master',
  metrics,
});
```

---

## 8 moteurs à développer (ordre T0→T3)

### 1. `concept_fidelity_engine` (P0)

**Objectif** : planche → HD pixels fidèles.

| Composant | Existe | À construire |
|-----------|--------|--------------|
| hero-runtime-pack (Sharp alpha) | ✅ pipeline | Default stages 02-06 |
| pixel-diff gate | ✅ tools/veloria | Brancher orchestrator 07_qa |
| hybrid planche | ✅ hero-refinement | Généraliser tous rôles |
| SAM2 / inpaint | ❌ | Stage 08 GPU ou CPU fallback |
| style-lock embedding | ❌ | CLIP palette lock |

**Agents** : Character, Art Direction, QA

### 2. `rig_animation_engine` (P0)

**Objectif** : atlas + rig → animation runtime.

- Export : `rig.json`, `runtime_atlas.json`, clips idle/run/attack
- **Manque** : `packages/engine/src/render/skeletal-2d.ts`
- **Manque** : Studio timeline animation

**Agents** : Animation, Integration

### 3. `environment_tile_engine` (P0)

**Objectif** : arènes modulaires, pas fond PNG unique.

- Extraction tuiles depuis planches
- `TilemapLayer` + `tile_collision` dans engine
- 6 arènes Veloria → tilesets + hazard zones

**Agents** : Decor, Level

### 4. `gameplay_systems_engine` (P0)

**Objectif** : chaque `systems[]` GDL a une impl sim.

- Veloria : migrer preview canvas → `@ellipse/engine`
- Implémenter : lane_runner, wave_spawner, blessing_draft, boss_phases, hazard_scheduler
- Codegen : remplacer TODO par vrais modules

**Agents** : Gameplay, Level

### 5. `agent_orchestration_engine` (P1)

- workflow_runs en DB
- `executeWorkflow` branché routes Studio
- GDL path multi-projet (fix project-iteration.ts)
- Tools Veloria/Echoes invoqués par orchestrator

**Agents** : MasterAI, Integration

### 6. `knowledge_rag_engine` (P2)

- Index workspace : GDD, art bible, specs, échecs QA
- Retrieval pour Cortex plan + asset briefs
- Mémoire : « pourquoi hybrid a été choisi pour Aureline »

**Agents** : MasterAI, tous

### 7. `qa_compliance_engine` (P1)

- Export PWA bloqué si `qa-report.passed === false`
- Engine headless smoke dans QA agent
- Telemetry persistée → ObservabilityTab KPIs réels

**Agents** : QA

### 8. `studio_action_engine` (P1)

- ProductionTab : lancer work order / sprint
- Scene editor : canvas + engine embed hot-reload
- AssetsTab : vérité unique DB ↔ 03_assets/

**Agents** : Integration

---

## Comment un agent fait évoluer Veloria aujourd'hui

```bash
pnpm veloria:prep          # planches → cutouts
pnpm veloria:sprint-b      # héros hybrid (minimum)
pnpm veloria:sprints-cde   # ennemis + arènes + runtime canvas
pnpm veloria:build         # GDL + preview
```

**Prochaine évolution requise** (pas encore codée) :

1. Remplacer `buildHeroSpec` par `generateHeroRuntimePack` quand IoU < shipping
2. Brancher preview sur `@ellipse/engine` avec atlas sprites
3. Enregistrer projet Veloria en DB Studio (`game_factory`)
4. Lancer stages depuis AssetsTab avec gate 07_qa bloquant

---

## Registre machine-readable

- Code : `packages/shared/src/studio/capability-gap-registry.ts`
- Manifest projet : `08_ops/manifests/studio-capability-gap-registry.json`
- Sync : `pnpm studio:capability-manifest`

---

## Références

- `docs/04-roadmap/GAP_ANALYSIS_STUDIO_NEXT_GEN.md`
- `docs/04-architecture/NEXT_GEN_MASTER_PLAN.md`
- `docs/02-architecture/ASSET_TAXONOMY.md`
- `docs/03-pipelines/IMAGE_TO_ASSETS_FACTORY.md`
