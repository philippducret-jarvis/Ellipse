# Feuille de route Ellipse — 24 mois

> **ORDRE-001** — IA Ellipse · **ORDRE-006** — infra distribuée, pas de monolithe.

## Vue macro

```
Phase 1          Phase 2           Phase 3            Phase 4+
Cortex + 2D      Photo2D + ML      2D HD + 3D         3D HD + Scale
(0-3 mois)       (3-6 mois)        (6-12 mois)        (12-24 mois)
     │                │                  │                    │
     ▼                ▼                  ▼                    ▼
  @ellipse/cortex  Weights Asset     Export + 3D walk     SaaS public
  Engine jouable   Photo→sprite      PBR preview          Marketplace
  Registry agents  ComfyUI local     Mobile web           Fine-tune Cortex
```

---

## Phase 0 — Socle ✅

| Livrable | Statut |
|----------|--------|
| Vision, ORDRE-001 à ORDRE-006 | ✅ |
| `@ellipse/cortex` + 7 agents | ✅ |
| `@ellipse/db` (PostgreSQL ellisphere:5435) | ✅ |
| `@ellipse/bus` (Redis/BullMQ) | ✅ |
| Orchestrator + upload + persist BDD | ✅ |
| Engine 2D jouable + Studio preview | ✅ |
| `@ellipse/gateway` + Dockerfiles | ✅ |

Runbook : [FOUNDATION_RUNBOOK.md](../05-guides/FOUNDATION_RUNBOOK.md)

---

## Phase 1 — Photo-to-Game v0 ✅

**Objectif :** Pipeline vision local, templates GDL, preview jouable depuis photo.

| Livrable | Statut |
|----------|--------|
| `@ellipse/pipeline` vision (sharp, 4 frames) | ✅ |
| Asset Agent → spritesheet depuis photo | ✅ |
| Templates GDL (platformer, runner, puzzle, rpg, fighting) | ✅ |
| Engine charge sprite + animation marche | ✅ |
| Studio upload + preview personnage | ✅ |
| Orchestrator static `/generated/` | ✅ |

**Jalon :** Photo → platformer jouable avec personnage issu de l'image.

---

## Phase 2 — Weights & ComfyUI (Mois 3-6)

**Objectif :** Weights Ellipse Asset + pipeline vision local.

| Feature | Priorité |
|---------|----------|
| ComfyUI local (ellipse-asset-v0) | P0 |
| Segmentation SAM/rembg | P0 |
| Spritesheet auto | P0 |
| Timeline agents Studio | P0 |
| Export HTML5 | P1 |

**Jalon :** Photo chien → platformer jouable.

---

## Phase 3 — 2D HD & 3D (Mois 6-12)

- ellipse-level-v0, TripoSR local
- Bevy/WASM preview 3D
- Export desktop

---

## Phase 4+ — Produit & Scale

- Fine-tuning Cortex par projet
- Narrative agent
- Marketplace templates Ellipse

---

## Prochaines actions

Voir [CONSTRUCTION_ORDERS.md](CONSTRUCTION_ORDERS.md#prochaines-actions-ordre-dexécution).

1. ComfyUI + weights `ellipse-asset-v0`
2. Queue pipeline vision (worker GPU isolé)
3. Segmentation fond transparent
4. Export HTML5 standalone
5. OpenTelemetry cross-services
