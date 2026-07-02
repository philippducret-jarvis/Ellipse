# Pipeline agents — Découpage, modèles, mouvements

> Chaîne de production où les **agents Ellipse exécutent réellement** chaque stage asset, pas seulement des stubs procéduraux.

Référence taxonomie : [ASSET_TAXONOMY.md](../02-architecture/ASSET_TAXONOMY.md)

---

## Architecture cible (non monolithique)

```
Studio action « Lancer découpage »
        │
        ▼
┌───────────────────┐
│  Orchestrator API │  POST /api/assets/:id/stages/02_cutouts/run
└─────────┬─────────┘
          │ task.assign (Redis)
          ▼
┌───────────────────┐     ┌─────────────────────┐
│  Worker character │────►│  Pipeline GPU       │
│  (BullMQ)         │     │  ComfyUI / SAM2     │
└─────────┬─────────┘     └─────────────────────┘
          │ task.complete + artefacts → 02_cutouts/
          ▼
┌───────────────────┐
│  QA Agent         │  gate cutting-report.json
└───────────────────┘
```

Chaque stage = **1 TaskSpec** → **1 worker** → **artefacts dans le dossier stage** → **gate QA optionnelle**.

---

## Stage 02 — Découpage (Cutouts)

### Entrée
- `01_source/reference.png`
- `pipeline.contract.json` (rôle, famille, résolution cible)

### Agent : `character`
### Pipeline : `@ellipse/pipeline`

**Workflow ComfyUI (inspiré industry 2025-2026) :**
1. **SAM2 / BiRefNet** — segmentation personnage vs fond
2. **rembg** — alpha propre (fallback sans GPU)
3. **Parts mask** — tête, torso, bras, jambes (pour rig 2D)

### Sorties
```
02_cutouts/
  cutout-alpha.png
  segmentation-mask.png
  parts-mask/
    head.png
    torso.png
    limbs.png
  cutout-manifest.json
```

### TaskSpec exemple
```json
{
  "agent": "character",
  "input": {
    "action": "run_asset_stage",
    "stage": "02_cutouts",
    "asset_id": "...",
    "source_path": "01_source/reference.png",
    "tools": ["sam2", "rembg"]
  }
}
```

---

## Stage 03 — Cleanup & découpe parts

### Agent : `character` + outils Sharp/Aseprite
- Nettoyage bords hair/antialiasing
- Normalisation taille (hauteur cible 256/512/1024 selon tier HD)
- Rapport `cutting-report.json` (pixels orphelins, bbox)

---

## Stage 04 — Rig & modèles

### 2D (platformer, metroidvania)
- **Agent : `animation`**
- Rig JSON : pivots, bones 2D, attach points (weapon, fx)
- Outils : ComfyUI 2D Pose Editor, référence [mor-o/comfyui-2d-character-pipeline](https://github.com/mor-o/comfyui-2d-character-pipeline)

### 3D (photo → mesh)
- **Agent : `mesh_3d`**
- TripoSR / InstantMesh local
- Export `skeleton.glb` + textures PBR basiques
- Rig Mixamo ou Blender headless

### Sorties
```
04_rig/
  rig.json
  skeleton.glb          # 3D optionnel
  pivot-map.json
  bind-pose.png
```

---

## Stage 05 — Mouvements & animations

### Agent : `animation`

**Pipeline spritesheet (standard industrie) :**

| Animation | Frames | ControlNet |
|-----------|--------|------------|
| idle | 4-8 | OpenPose ref |
| walk | 6-8 | cycle walk |
| run | 6-8 | cycle run |
| jump | 4-6 | pose start/apex/land |
| attack | 4-8 | combat pose pack |
| hurt | 2-4 | knockback |
| death | 4-6 | fall |

**Workflow ComfyUI :**
1. LoRA personnage (consistance identité — VNCCS pattern)
2. Batch poses via ControlNet OpenPose / DW Pose
3. Background removal par frame
4. Image Grid → spritesheet horizontal
5. `anim-state-machine.json` pour GDL

**Références :**
- [Apatero — Clean Spritesheets ComfyUI 2025](https://apatero.com/blog/generate-clean-spritesheets-comfyui-guide-2025)
- [ComfyUI VNCCS — character sheets](https://github.com/AHEKOT/ComfyUI_VNCCS)
- [TawusGames — photo → rig → sprite tutorial](https://tawusgames.itch.io/ai-gen-sprite-tutorial)

### Sorties
```
05_animation/
  idle/spritesheet.png
  walk/spritesheet.png
  jump/spritesheet.png
  anim-state-machine.json
```

---

## Stage 06 — Exports runtime

### Agent : `integration`
- Atlas Aseprite-compatible JSON
- Référence GDL `entities[].assets.animations`
- Manifest `runtime-manifest.json`

---

## Stage 07 — QA

### Agent : `qa`
- Pixel alignment entre frames
- Bbox cohérente (pas de drift)
- Smoke test : charger dans `@ellipse/engine` 30s
- Rapport `qa-report.json` + `blockers.json`

---

## Work orders GPU (stage 08)

Fichier `08_remote_jobs/production.workorder.json` :

```json
{
  "asset_id": "...",
  "family": "heroes",
  "jobs": [
    { "stage": "02_cutouts", "queue": "ellipse:pipeline:vision", "model": "sam2" },
    { "stage": "05_animation", "queue": "ellipse:pipeline:vision", "model": "wan-2.2" }
  ]
}
```

Worker `@ellipse/pipeline` consomme la queue et écrit dans le dossier stage.

---

## Mapping agents ↔ stages (résumé)

| Stage | Agents | Priorité implémentation |
|-------|--------|------------------------|
| 02_cutouts | character | **P0** — Sharp+rembg existe, brancher SAM2 |
| 03_cleanup | character, decor | **P0** |
| 04_rig | animation, mesh_3d | **P1** |
| 05_animation | animation | **P0** — cœur différenciation |
| 06_exports | integration | **P1** |
| 07_qa | qa | **P1** |
| 08_remote_jobs | bus dispatch | **P0** |

---

## API Orchestrator à ajouter

```
POST /api/projects/:id/assets/:assetId/stages/:stageId/run
GET  /api/projects/:id/assets/:assetId/stages
GET  /api/projects/:id/assets/:assetId/stages/:stageId/artifacts
POST /api/projects/:id/assets/:assetId/stages/:stageId/approve
```

Implémentation : module `packages/orchestrator/src/asset-pipeline/` (non monolithique).

---

## Critères « agents travaillent vraiment »

- [ ] Hero Echoes : stage 02→05 complétés avec photo source
- [ ] Sporeling enemy : spritesheet walk + attack
- [ ] Origin Tree : tileset exporté stage 06
- [ ] QA bloque si cutting-report > seuil erreur
- [ ] Studio bouton « Lancer découpage » déclenche worker Redis
- [ ] Timeline agents montre progression live
