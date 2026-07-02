# Ellipse — Analyse des gaps Studio Next-Gen

> Généré : 2026-06-21T07:38:29.972Z
> Maturité moyenne capacités : **43%**

## Diagnostic Veloria (constat utilisateur)

Les livrables actuels sont **majoritairement vectorisés procéduralement** ou **hybrid planche basse fidélité** (IoU ~0.40–0.50). Les planches concept restent la **source d'intention**, pas des assets shipping. C'est une **maquette de pipeline**, pas un jeu visuellement fidèle.

## 8 moteurs à construire

### Moteur fidélité concept → HD (`concept_fidelity_engine`)
- Statut : **partial**
- Planche → extraction sujet → cleanup neuronal/heuristique → pixel-diff gate → hybrid ou inpaint. Veloria IoU gate existe hors orchestrator.
- Manque : SAM2/BiRefNet ; inpainting ComfyUI ; gate bloquant stage 07_qa ; style-lock embedding

### Moteur rig & animation 2D (`rig_animation_engine`)
- Statut : **stub**
- rig.json + atlas + state machine → runtime Pixi skeletal. Exporté mais non consommé par engine.
- Manque : Skeletal2DRenderer ; anim-state-machine runtime ; IK 2D ; timeline Studio

### Moteur environnements tileables (`environment_tile_engine`)
- Statut : **partial**
- Extraction modules depuis planches → tileset + collision + parallax + hazard zones.
- Manque : TilemapLayer renderer ; tile_collision sim ; parallax layers GDL ; Tiled export

### Moteur systèmes gameplay data-driven (`gameplay_systems_engine`)
- Statut : **partial**
- GDL systems[] → sim modules. Veloria lane_runner/wave_spawner/blessing_draft/hazard_scheduler/boss_phases dans engine.
- Manque : gacha_summon ; summon_units ; loot_system ; tile_collision sim ; camera_follow sim ; meta_systems runes/relics

### Moteur orchestration durable agents (`agent_orchestration_engine`)
- Statut : **partial**
- Workflows, work orders, itération projet, handoffs QA.
- Manque : workflow_runs DB ; executeWorkflow branché routes ; GDL path multi-projet ; retries QA PDF

### Moteur connaissance projet (RAG) (`knowledge_rag_engine`)
- Statut : **missing**
- Index GDD, art bible, specs, échecs QA → retrieval pour Cortex et agents.
- Manque : vector store ; workspace doc indexer ; QA failure memory ; CLIP style embedding

### Moteur QA & compliance bloquant (`qa_compliance_engine`)
- Statut : **partial**
- Pixel-diff, engine smoke, gates export, provenance.
- Manque : export blocked on fail ; headless engine smoke ; game_tests runner ; telemetry persistée

### Moteur actions Studio (factory actionnable) (`studio_action_engine`)
- Statut : **partial**
- UI déclenche stages, work orders, preview hot-reload — pas seulement lecture JSON.
- Manque : ProductionTab run work order ; Scene editor + engine embed ; tilemap editor ; rig timeline

## Capacités P0 (5)

- **Concept art → asset HD fidèle** (58%) — Veloria/Echoes produisent surtout du vectoriel procédural ou des crops — très loin des planches.
- **Décomposition planches → familles assets** (55%) — Crops bbox OK ; pas de découpe intelligente multi-entités ni props modulaires.
- **Animation riggée consommée par le runtime** (12%) — rig.json et atlas exportés ; engine = rectangles ou strip horizontal.
- **Tilemaps + collision + hazards spatialisés** (8%) — 6 arènes Veloria = fond PNG unique ; pas de tiles ni collision grid.
- **Catalogue systèmes → sim implémentée** (72%) — Codegen 40+ systèmes ; Veloria survivors branché dans engine (veloria-survival.ts) + tests headless.

## Phases recommandées

| Phase | Focus | Durée |
|-------|-------|-------|
| T0 | Fidélité assets + rig + QA bloquant | 4-8 sem |
| T1 | Tilemaps + systèmes engine + audio GDL | 6-10 sem |
| T2 | Studio actionnable + éditeurs visuels | 4-6 sem |
| T3 | RAG + observabilité + export multi-plateforme | 8+ sem |

Voir `packages/shared/src/studio/capability-gap-registry.ts` pour le registre source.
