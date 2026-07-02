# Backlog cible Ellipse — usine souveraine de jeux 2D / 2.5D HD, mobile & web, **sans GPU ni LLM tiers**

> Document maître d'exécution. Fusionne : l'audit du dépôt, la vision « Ellisphere Game Factory » (PDF),
> [MOBILE_2D_HD_FACTORY.md](MOBILE_2D_HD_FACTORY.md) et [ROADMAP_AMBITIEUSE_2026.md](ROADMAP_AMBITIEUSE_2026.md).
> Projet de référence (golden test) : **Echoes of the Mushroom Realm** (`workspaces/echoes-of-the-mushroom-realm`).
> Contrainte non négociable : HD, automatique, **sur CPU modeste, sans dépendance à un LLM/modèle tiers**.

---

## Avancement (journal d'exécution)

| Lot | État | Preuve |
|---|---|---|
| 0 — Harnais runtime headless | ✅ **fait** | `engine/src/sim/sim.test.ts` (gravité, collisions, goal, hazards, stomp, scènes, checkpoints, top-down) |
| 1A — IR / GDL typé | ✅ **fait** | `shared/src/gdl/ir.ts` ; `entities`/`scenes`/`systems` typés ; 7 tests IR ; Echoes revalide |
| 1B — Engine en systèmes pluggables | ✅ **fait** | `engine/src/sim/{world,systems}.ts` ; engine délègue toute la logique |
| 1C — Entités data-driven | ✅ **fait (ennemis)** | ennemis lus depuis `layout.enemies`, plus de hardcode ; bug de repositionnement corrigé |
| 1D — Multi-scènes + transitions + checkpoints | ✅ **fait** | `applyScene`/`nextSceneIndex` ; transition au goal préserve health/score ; respawn checkpoint ; 12 tests |
| 1E — Genre top-down | 🟡 **fondation** | `physics_topdown` jouable (8 dir, sans gravité) ; reste caméra + IA top-down |
| 1F — Contrat HD vectoriel | ✅ **fait** | `shared/src/assets/asset-spec.ts` ; rendu SVG pur résolution-indépendant + budgets profils ; 5 tests |
| **Lot 1 (runtime) — globalement clos** | ✅ | reste seulement la finition 1E (caméra/IA top-down) |
| 2a — Solveur budget / arbitrage + mémoire d'exécution | ✅ **fait** | `cortex/src/modules/{budget,execution-memory}.ts` ; `planFromPromptArbitrated` ; 8 tests (abandon optionnels, essentiels préservés, deps nettoyées, traçabilité) |
| 2b — Tête de planification ONNX | ⏳ | nécessite un passage d'entraînement Python (`training/`) |
| 3a — Générateur procédural d'AssetSpec + rastériseur CPU | ✅ **fait** | `pipeline/src/asset-factory/{procedural-specs,rasterize}.ts` ; héros/ennemi/prop vectoriels déterministes ; **boucle HD sans GPU prouvée** (SVG→PNG @1x/2x/3x via sharp) ; 9 tests |
| 3b — AssetFamilyPipeline (héros/ennemis/props HD) | ✅ **fait** | `pipeline/src/asset-factory/asset-family.ts` ; `produceAssetFamily`/`produceAssetCast` ; PNG réels par famille ; 2 tests. *(découpe CV des boards Echoes = reste à faire)* |
| 4 — Exécuteur durable réel | ✅ **fait** | `orchestrator/src/durable-executor.ts` ; topo-sort + persistance + **retry** + **resume** + gate humaine ; stores mémoire/JSON ; 4 tests |
| 5 — Provenance + compliance | ✅ **fait** | `shared/src/provenance/provenance.ts` ; graphe requêtable + gate d'export (photo personne / licence) ; 3 tests |
| 6 — World factory exécutable | ✅ **fait** | `shared/src/gdl/world-factory.ts` ; board→`Scene` valide + check de traversabilité ; 2 tests |
| 7 — Studio écriture (cœur) | ✅ **fait** | `shared/src/gdl/gdl-edit.ts` ; ops pures entité/composant/plateforme/transition, round-trip valide ; 1 test. *(câblage UI React = reste)* |
| 8 — Game-feel events runtime | ✅ **fait** | `engine/src/sim` émet jump/collect/enemy_killed/damage/checkpoint/scene_change/win/lose ; 2 tests. *(moteur audio/FX = reste)* |
| 9 — Export mobile PWA | ✅ **fait (descripteurs)** | `shared/src/export/pwa.ts` ; manifest + service worker + profils ; 1 test. *(bundling build = reste)* |
| 10 — Observabilité | ✅ **fait (collecteur)** | `shared/src/telemetry/telemetry.ts` ; métriques + agrégats sérialisables ; 1 test |
| 3b suite — Découpe CV des boards Echoes | ✅ **fait** | `pipeline/src/asset-factory/board-cutter.ts` ; `cutSprite`/`sliceBoardGrid` ; **exécuté sur les vraies images** (hero 688×917, main_cast 6 sprites → `generated/echoes-cast/`) ; 2 tests |
| 11 — Refonte frontend pro | ⏳ **effort dédié** | le studio a déjà un design system (`design/app.css`, tokens `base.css`) ; la refonte UX complète (IA, flows, vues, E2E) est un chantier à part entière, non bouclable en un tour |
| 2b — Tête de planification ONNX | ⏳ **passage offline** | requiert un run d'entraînement Python (torch + données + compute) hors de cet environnement ; non simulé |

> Vérifié : **10/10 packages typecheck, ~91 tests verts** (shared 33, engine 14, cortex 14, pipeline 15, orchestrator 15), aucune régression.

---

## 0. Cadrage — réconcilier le PDF avec les contraintes réelles

Le PDF décrit une plateforme **cloud / GPU / API tierces**. Nos contraintes imposent l'inverse.
On garde les *concepts*, on rejette les *dépendances*.

| Sujet | PDF (à adapter) | Décision Ellipse (souveraine) |
|---|---|---|
| Intelligence | OpenAI Agents SDK, LLM tiers | Modèles **from-scratch ONNX** (`packages/cortex`, `training/`), inférence CPU via `onnxruntime-node` |
| Génération image | OpenAI Image, ComfyUI+ControlNet (GPU) | **Procédural + vectoriel + paramétrique** + super-résolution CPU. *Aucune diffusion GPU.* |
| Audio | ElevenLabs, Stable Audio | Synthèse procédurale (`packages/shared/src/audio/procedural-wav.ts`) + DSP |
| 3D | Meshy, Tripo, TripoSR (GPU) | 2.5D par couches/parallaxe + mesh-from-silhouette CPU (`pipeline/src/lot0/mesh-from-silhouette.ts`). 3D réaliste = hors périmètre. |
| Backend | FastAPI / Python | On **garde la stack TS** (Fastify orchestrator). Pas de replatforming. |
| Orchestration durable | Temporal (cluster) | Exécuteur durable **TS léger, backed-DB** (`packages/db`). Temporal = option phase tardive. |
| Métadonnées / provenance | Postgres + schéma riche | On **adopte le schéma du PDF** (asset / variant / provenance / compliance) sur `packages/db` |
| Conformité photo personne | privacy-by-default | **Adopté tel quel** — traitement 100 % local renforce même cette exigence |

**Ce qu'on garde du PDF (les bons concepts) :** séparation stricte *intention → fabrication → exécution* ;
IR moteur-agnostique (= notre **GDL**, à typer) ; boucle qualité comme citoyen de 1ère classe (artefact → validation → versioning → approbation) ;
traçabilité de bout en bout (modèle, seed, prompt, provenance) ; 4 catégories de retry ; compliance photo de personne.

**Ce qu'on rejette :** toute dépendance GPU/diffusion, tout LLM/poids tiers, la migration Python/FastAPI, Temporal en phase 1,
et la 3D réaliste de personnes (la plus coûteuse, la plus sensible juridiquement).

**Correction d'incohérence interne** : `packages/cortex/models/manifest.json` proclame « aucun LLM tiers » mais route
`character → comfyui-local` et `mesh_3d → TripoSR`. À corriger (Lot 3) : ces runtimes deviennent
`procedural-cpu` / `synthesis-cpu`. Le manifeste doit refléter la politique qu'il déclare.

---

## 1. Thèse technique « HD sans GPU » (le cœur du différenciateur)

Le piège est de croire que « HD » = « diffusion neurale ». Faux à notre échelle. On découple :

> **L'IA prend les *décisions* (composition, palette, layout, rig, mécaniques). La *synthèse* des pixels/sons est déterministe et CPU.**

Quatre leviers rendent la HD atteignable sans GPU :

1. **Vector-first / résolution-indépendante.** Les assets sont décrits en primitives paramétriques (formes, courbes, palettes,
   couches) → rastérisées à n'importe quelle densité (mobile @1x→@3x) sans perte. La HD devient « gratuite » par construction.
2. **Synthèse procédurale guidée par contraintes** (déjà amorcée : `procedural/generate-hero.ts`, `decor/generate-decor.ts`,
   `audio/procedural-wav.ts`). L'IA fournit les *paramètres* ; le code génère le résultat, déterministe et **reproductible par seed**.
3. **Photo → asset par vision classique CPU** (cutout GrabCut/edge, extraction palette, décomposition en couches, rig cutout) —
   déjà esquissé dans `pipeline/src/asset-factory/hero-runtime/image-analysis.ts`. Pas de SAM/diffusion.
4. **Super-résolution CPU en 2ᵉ passe** : edge-aware upscale + (optionnel) petit modèle SR ONNX quantifié **entraîné maison**,
   appliqué seulement sur les rasters finaux. La 1ère passe reste vectorielle/déterministe.

**Style-lock** : palette + bible visuelle figées par projet → cohérence inter-assets (le risque n°1 de la génération libre).
**Budgets de texture par profil** (low/mid/high) appliqués à la rastérisation → perf mobile garantie.

---

## 2. Trous conceptuels à combler (priorisés)

1. **GDL non typé = IR fantôme.** `entities`/`scenes` sont des `z.record(z.unknown())`
   ([shared/src/index.ts](../../packages/shared/src/index.ts)). Sans IR typé, ni multi-genres, ni studio en écriture, ni provenance fiable. **Bloquant.**
2. **« HD sans GPU » non spécifié comme pipeline.** Le principe existe en prose, pas en contrat (`AssetSpec` vectoriel, budgets, SR). À formaliser.
3. **Cognition réduite à des mots-clés.** Cortex v0 ne prédit que l'intent ; planification/budget/arbitrage = absents (`planHints` → `null`).
4. **Agents = stubs.** `simulateWork()` ([agents/src/base-agent.ts](../../packages/agents/src/base-agent.ts)) : ils ne produisent pas de vrais artefacts validés.
5. **Orchestration durable = catalogue statique.** `durable-workflows.ts` = data, pas d'exécuteur/persistance/retry.
6. **Provenance & compliance absentes.** Pas de généalogie d'asset, pas de `consent_scope`/`license_mode` (photo de personne).
7. **Boucle qualité partielle.** Gates métier (collisions, perf mobile, alpha, tiling, loop audio) non exécutées.
8. **Runtime mono-genre/mono-scène** ([engine/src/index.ts](../../packages/engine/src/index.ts)) : platformer hardcodé.
9. **Reproductibilité non garantie.** Seeds non persistés → builds non rejouables.

---

## 3. Renforcer l'IA souveraine (Cortex + agents) sans tiers

Architecture cognitive en 3 strates, **toutes locales** :

- **Strate déterministe (toujours dispo)** : grammaires PCG, templates de design, solveur de contraintes (budget coût/qualité/délai),
  validateurs. C'est le socle « jamais en panne ».
- **Strate modèles Ellipse from-scratch (ONNX/CPU)** : têtes spécialisées entraînées dans `training/ellipse_cortex/`.
  - `cortex-planner` : **intent (existe) → + tête planification** (DAG, agents requis, estimation). Comble le `planHints: null`.
  - `gameplay`, `narrative`, `level`, `ui` : générateurs **structurés** (sortent du JSON/GDL conforme au schéma, pas du texte libre).
  - `qa` : modèle validateur/simulateur (prédit la jouabilité/lisibilité).
  - têtes « décision visuelle » : palette, composition, rig plan → **paramètres** pour la synthèse procédurale (Lot 1, §1).
- **Strate pont open-weights local (optionnelle, désactivable)** : `ollama-provider` déjà présent comme *fallback borné*,
  jamais requis. Sur CPU modeste : **SLM quantifiés gguf** pour les sous-problèmes NL bornés uniquement (jamais le macro-workflow).

Pipeline d'entraînement (déjà scaffoldé) : `training/ellipse_cortex/{synth_data,train,export_onnx}.py` →
`models/<head>/{model.onnx,tokenizer.json,labels.json}`. **Donnée synthétique souveraine** (générée par nos propres grammaires)
= pas de corpus tiers. Chaque modèle suit le cycle `pending → active_stub → trained` dans `manifest.json`.

---

## 4. Backlog par lot (ordre d'exécution exact)

Convention : 🎯 objectif · 📦 tâches (fichiers réels) · ✅ gate vérifiable · ⛓️ dépend de · 🍄 ancrage Echoes.

### LOT 0 — Socle de vérité *(transverse, court)*
🎯 Rendre les gates exécutables avant d'empiler des features.
📦 CI bloquante (`typecheck`+`test`+`studio:smoke`+`echoes:validate`) dans `.github/workflows` · harnais **runtime headless** (charge un GDL, tick N frames, asserts) · persistance des **seeds** dans chaque run.
✅ CI rouge si une gate casse ; harnais runtime lançable en `pnpm test`.
🍄 `echoes:validate` vert sur le workspace Echoes.

### LOT 1 — IR / GDL typé + Runtime multi-genres + pipeline HD-sans-GPU *(fondation)*
🎯 Transformer le GDL en **IR typé moteur-agnostique** et l'engine en moteur **data-driven** ; poser le contrat HD vectoriel.
- **1A — Typer l'IR.** Remplacer `entities/scenes: z.record(z.unknown())` par `EntitySchema`/`ComponentSchema` (union discriminée : transform, physics_platformer, physics_topdown, combat, health, ai_patrol, collectible, goal, hazard, trigger), `SceneSchema` (transitions), `SystemSchema` (enum). Migrer `validateGdl`. → comble trou #1.
- **1B — Engine en systèmes pluggables (ECS-lite).** Extraire `tick()` ([engine/src/index.ts](../../packages/engine/src/index.ts)) en registry `System{update(world,dt)}` activé par `gdl.systems[]`. Parité platformer prouvée.
- **1C — Entités pilotées par données.** Supprimer ennemis hardcodés ; lire depuis `scene.entities`. Corriger le repositionnement ennemi cassé (l.346-347).
- **1D — Multi-scènes + transitions + checkpoints.**
- **1E — Genre packs.** `physics_topdown` + caméra (`side_scroll`/`topdown`) → 2ᵉ genre jouable (top-down/RPG, layout `rpg` déjà présent mais subit la gravité aujourd'hui). 2.5D = couches+parallaxe.
- **1F — Contrat HD vectoriel.** `AssetSpec` paramétrique (primitives, palette, couches) + rastériseur CPU multi-densité + budgets par profil. → comble trou #2.
✅ Deux genres distincts jouables dans le même engine via GDL ; un asset rendu net en @1x et @3x sans régénération.
⛓️ Lot 0. 🍄 Echoes (side_view) tourne via l'engine data-driven.

### LOT 2 — Cognition souveraine (Cortex planificateur)
🎯 Combler `planHints: null` : passer du mot-clé à la **planification**.
📦 Tête de planification du `cortex-planner` (DAG, agents requis, estimation) entraînée dans `training/` et exportée ONNX · **solveur de contraintes** budget coût/qualité/délai (déterministe) · **mémoire d'exécution** (décisions persistées en DB) · branchement dans `PlanModule.buildFromHints` ([cortex/src/modules/plan.ts](../../packages/cortex/src/modules/plan.ts)).
✅ Le même prompt produit un plan adapté (agents/estimation) sans heuristique pure ; budget respecté ou arbitrage tracé.
⛓️ Lot 1A. 🍄 Re-planifier Echoes produit un DAG cohérent avec son brief.

### LOT 3 — Agents qui produisent vraiment (HD, CPU) + manifeste corrigé
🎯 Sortir les agents de `simulateWork()` ; honorer « aucun tiers / pas de GPU ».
📦 **Corriger `manifest.json`** : `comfyui-local`/`TripoSR` → `procedural-cpu`/`synthesis-cpu`. · Famille pilote **héros** end-to-end : `character-agent` branché sur `hero-runtime-pack.ts` + `image-analysis.ts` (cutout CPU → couches → rig cutout → atlas + animation manifest) sortant des `AssetSpec` vectoriels (Lot 1F) → vrais artefacts validés. · **Généraliser** en `AssetFamilyPipeline` réutilisable → ennemis, props, UI, tilesets, FX. · Style-lock (palette/bible) appliqué.
✅ Une photo → héros HD animé jouable dans l'engine, reproductible par seed, sans GPU ni API tierce ; ≥2 autres familles via le même pipeline.
⛓️ Lot 1, Lot 2. 🍄 **Découpe des boards Echoes fournis** (`01_inputs/references/` : `hero_echo_front`, `main_cast_board`, `enemy_family_board`, `sporeling_detail_board`, `boss_guardian_board`, `cast_exploration_sheet`) → segmentation CPU en assets individuels (hero, cast, ennemis, boss) → atlas + animations (idle/run/jump/attack). Maps depuis `level_test_01_board` / `sporale_cliffs_board` → tileset modulaire. Cast Echoes (hero + spore/memory_shard/weapon_echo + ennemis) généré et lisible mobile.

### LOT 4 — Exécuteur durable réel (TS, backed-DB)
🎯 Transformer le catalogue `durable-workflows.ts` en machine.
📦 Runner résolvant `depends_on`, **persistant l'état** (`workflow_runs`/`step_runs` sur `packages/db`) · les **4 retries du PDF** (technique / qualitatif / créatif borné / arrêt humain) · `resume_from_last_completed_step`, `rollback` réels · `automation_targets` reliés aux vrais handlers (cortex, pipeline, seed scripts) · interface « lane GPU distante » (stub, jamais requise localement).
✅ Tuer le process en plein run → reprise au dernier step complété ; un step en échec retry puis ouvre une gate humaine.
⛓️ Lot 0, Lot 3.

### LOT 5 — Provenance, traçabilité & compliance (schéma PDF adopté)
🎯 Généalogie d'asset + conformité photo de personne, 100 % local.
📦 Sur `packages/db`, adopter le modèle PDF : `asset`, `asset_variant`, `agent_run` (modèle, **seed**, provenance, trace), `prompt_run`, `human_review`, `audit_log`. · Champs **`privacy_mode`/`consent_scope`/`license_mode`/`retention_days`** ; une photo de personne → `kind=person_reference`, `private_only` par défaut, **hard-stop export** si consentement non résolu. · Graphe requêtable (provenance → décisions → assets → scènes → exports), alimenté par les runs Lot 4. · Surfaces cliquables studio.
✅ « Quels assets dérivent de la photo X, sous quelle licence ? » répond par requête ; export public bloqué tant que la matrice de droits n'est pas résolue.
⛓️ Lot 4.

### LOT 6 — World factory exécutable (board → scène jouable)
🎯 Convertir board/systems → kit de niveau → collisions/triggers → `SceneSchema` valide.
📦 `sync-echoes-construction-stack.mjs` → générateur de scène modulaire (biome-first, ancrages spawn/checkpoint/door/boss, hazards, zones) · step du workflow `scene_assembly` (Lot 4) · test de traversabilité automatique (harnais Lot 0).
✅ Un board sauvé → scène jouable validée. 🍄 Le niveau Echoes (zones awakening/descent/armory/exit) fabriqué depuis modules, pas hardcodé dans `level-gen.ts`.
⛓️ Lot 1, Lot 4.

### LOT 7 — Studio en écriture bidirectionnelle
🎯 L'UI écrit réellement dans l'IR (aujourd'hui surtout lecture, ~5300 lignes).
📦 Éditeur scène/entités/triggers → écrit le GDL typé (Lot 1A), re-valide, met à jour la preview live · round-trip GDL→UI→GDL sans perte (golden test) · édition narration/audio sur les mêmes contrats.
✅ Modifier Echoes dans le studio → relancer le runtime → changement visible et persistant.
⛓️ Lot 1A.

### LOT 8 — Audio + FX + game-feel runtime (procédural)
🎯 Du documenté à l'exécuté, sans samples tiers.
📦 Moteur audio (bus, zones, ducking, états musicaux) consommant `gdl.audio` + synthèse `procedural-wav.ts` · chaîne game-feel : gameplay → caméra → VFX → hit-stop → audio (nouveaux `System`, Lot 1B).
✅ Un coup réussi → hit-stop + SFX + shake, piloté par le GDL.
⛓️ Lot 1B, Lot 3.

### LOT 9 — Export mobile web-first (PWA) + profils perf
🎯 Sortir Echoes jouable sur téléphone sans changer le pipeline.
📦 Profils `low/mid/high` (budgets texture/audio/bundle) issus du `RuntimeProfile` · export **PWA** d'abord (wrapper natif ensuite) · compression assets · checklists UX mobile · réduction `pixi-runtime` (chunking/lazy).
✅ Echoes installable en PWA, fluide sur mobile mid-range, budgets respectés en CI.
⛓️ Lot 1F, Lot 4.

### LOT 10 — Observabilité & MLOps souverain
🎯 Combler la zone la plus faible (telemetry documentée seulement).
📦 Métriques PDF : temps prompt→preview, retry/type, validator failures/famille, builds cassés, score QA, ratio variantes/originaux · pour chaque agent : modèle, **seed**, durée, trace, résultat guardrail · **rejouabilité** d'un run (seeds + provenance Lot 5) · dashboard studio.
✅ Un run est rejouable à l'identique ; dashboard coût/qualité/retry par projet.
⛓️ Lot 4, Lot 5.

### LOT 11 — Refonte frontend professionnel *(en fin de parcours)*
🎯 Le studio actuel n'est ni pro ni réellement utilisable : le refondre en une UI de **studio de production** crédible.
📦 Design system cohérent (tokens, composants, thème sombre pro) · refonte des vues clés : cockpit/overview, workspace par jeu, éditeur de scène (Lot 7), galerie d'assets + variantes/provenance (Lot 5), file de production/runs (Lot 4), preview runtime intégrée, dashboards (Lot 10) · navigation et états (chargement/erreur/vide) soignés · accessibilité + responsive (desktop d'abord, conscient mobile) · onboarding « prompt + photos → projet ».
✅ Un utilisateur non-technique crée Echoes, suit la production, édite une scène, prévisualise et exporte **sans lire de doc**. Tests E2E des parcours (étend `studio:smoke`).
⛓️ S'appuie sur Lots 4, 5, 7, 9, 10 (refonte après que les données réelles existent, pour ne pas habiller du vide).

---

## 5. Chemin critique & ancrage Echoes

```
Lot 0 ─► Lot 1 (1A→1F) ─► Lot 2 ─► Lot 3 ─► Lot 4 ─► Lot 5 ─► Lot 10 ─┐
                │                       │        └─► Lot 6 ─► Lot 7 ───┤
                └─► Lot 1F ────────────►└─► Lot 8     Lot 9            └─► Lot 11 (refonte frontend)
```

- **Lot 1A est la clé de voûte** : l'IR typé débloque cognition (2), agents (3), provenance (5), studio (7).
- **Echoes of the Mushroom Realm = golden test permanent** : chaque lot a une gate « Echoes » concrète. Le produit est « prêt » quand Echoes
  se génère depuis son brief → cast HD cohérent → niveau modulaire jouable → preview mobile, **automatiquement, sur CPU, sans API tierce, rejouable par seed**.

## Definition of Done du produit (lecture honnête)
1. Un prompt + photos → projet versionné (brief, backlog, assets HD, scènes, preview, build) — **automatique**.
2. **Zéro** appel GPU / API LLM tierce sur le chemin critique.
3. Tout artefact : validé, versionné, tracé (seed + provenance + licence), rejouable.
4. Cible jeux : platformer / top-down / narration-exploration / puzzle léger, 2D & 2.5D, mobile/web HD.
5. 3D réaliste & workers GPU distants : extensions *optionnelles* phase tardive, jamais des dépendances.
