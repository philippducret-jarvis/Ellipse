# Ordres de construction — Projet Ellipse

> **Document normatif.** Toute décision technique ou produit doit respecter ces ordres.
> En cas de conflit avec un autre document, **ce fichier fait foi**.

---

## Ordres fondamentaux (non négociables)

### ORDRE-001 — IA Ellipse souveraine (cible from-scratch, pont open-weights toléré)

**Cible : Ellipse possède et exécute sa propre IA entraînée from-scratch.**
La souveraineté se mesure au contrôle des **poids, de l'inférence et des données** — pas
seulement à l'absence d'appel réseau. Pour ne pas bloquer la construction produit, un
**pont open-weights auto-hébergé** est explicitement **toléré en transition**.

- ✅ **Cible souveraine :** modèle Ellipse **from-scratch** (`training/`), exporté ONNX, exécuté par `EllipseProvider`. C'est la destination par défaut dès que les poids existent.
- ✅ **Pont toléré (transition) :** modèles **open-weights auto-hébergés** (Ollama/Llama/Mistral via `OllamaProvider`) — poids locaux, données locales. À retirer modalité par modalité dès que le modèle Ellipse correspondant est entraîné.
- ✅ **Filet :** heuristique déterministe (`HeuristicProvider`), toujours disponible.
- ❌ **Interdit :** tout **SaaS cognitif tiers** — API OpenAI, Anthropic, Google Gemini, **Mistral API**, etc. (raisonnement/planification/génération délégués hors infra).
- ❌ **Interdit :** toute donnée projet utilisateur qui **sort de l'infra** Ellipse.
- ✅ **Obligatoire :** toute cognition passe par un **`CortexProvider`** sélectionné (`ELLIPSE_CORTEX_BACKEND`), jamais par un appel direct dispersé.
- ✅ **Obligatoire :** chaque domaine métier passe par un **sous-agent Ellipse enregistré** dans le registry interne.

**Justification :** souveraineté (poids/inférence/données sous contrôle), coûts maîtrisés,
confidentialité des projets, et spécialisation jeu vidéo — atteinte progressivement en
remplaçant le pont par des modèles Ellipse dédiés. Voir
[ELLIPSE_AI.md](../02-architecture/ELLIPSE_AI.md) et `packages/cortex/src/provider-registry.ts`.

---

### ORDRE-002 — Sous-agents enregistrés et autonomes

Chaque sous-IA :

1. Est **déclarée** dans `packages/agents/src/registry.ts`
2. Possède un **modèle Ellipse dédié** (ou module Cortex spécialisé) référencé dans `@ellipse/cortex`
3. Communique uniquement via **TaskSpec / TaskResult** (schemas/)
4. N'appelle **jamais** l'extérieur pour de la cognition — uniquement des **outils deterministes** (ffmpeg, mesh optim, etc.) si besoin

| Agent | ID registry | Domaine |
|-------|-------------|---------|
| Le Héros | `character` | Sprites personnage |
| Le Décorateur | `decor` | Décors, tilesets |
| Le Mouvement | `animation` | Animations personnage |
| L'Architecte | `level` | Niveaux, layout |
| Le Sculpteur | `mesh_3d` | Modèles 3D |
| L'Éclairagiste | `lighting` | Éclairage 3D |
| Le Cadreur | `camera` | Caméra, cinématiques |
| Le Game Designer | `gameplay` | Mécaniques GDL |
| Le Conteur | `narrative` | Histoire, dialogues |
| Le Musicien | `music` | BGM |
| L'Effeteur | `sfx` | Effets sonores |
| L'Interface | `ui` | HUD, menus |
| L'Illusionniste | `vfx` | Particules, juice |
| Le Testeur | `qa` | Validation |
| L'Assembleur | `integration` | Export final |

Catalogue complet : `packages/shared/src/agents/catalog.ts` · manifest : `packages/cortex/models/manifest.json`

---

### ORDRE-003 — Inférence auto-hébergée

- Les poids et modèles Ellipse tournent **on-premise ou sur infra Ellipse** (GPU cluster)
- Pipeline ML (diffusion, segmentation, audio) = **modèles open-weights intégrés**, pas SaaS tiers
- Variables d'environnement : chemins modèles locaux (`ELLIPSE_CORTEX_*`), jamais de clés API LLM

---

### ORDRE-004 — GDL comme seule sortie gameplay

- Les agents ne produisent **pas de code utilisateur**
- Sortie gameplay = patches **GDL** validés par JSON Schema
- Le moteur (`@ellipse/engine`) est l'unique exécuteur

---

### ORDRE-005 — Zero-code utilisateur final

- L'utilisateur ne voit jamais JSON, YAML, ni terminal
- Interaction : prompt naturel, photos, validation visuelle dans **Ellipse Studio**

---

### ORDRE-006 — Pas de monolithe infra

**L'infrastructure Ellipse est distribuée, modulaire et professionnelle.**

- ❌ **Interdit :** un service unique « tout-en-un » en production (`ellipse-all`, backend monolithique)
- ❌ **Interdit :** coupler runtime orchestrator + cortex + agents + pipeline dans un seul processus déployable
- ❌ **Interdit :** communication agent↔agent par imports in-process en prod (contournement du bus)
- ✅ **Obligatoire :** **un service déployable par bounded context** (voir `infra/services/SERVICE_CATALOG.yaml`)
- ✅ **Obligatoire :** communication **async via bus** (Redis Streams / NATS) entre orchestrator et workers
- ✅ **Obligatoire :** contrats API **versionnés** (schemas/) entre services
- ✅ **Obligatoire :** scaling, health checks et observabilité **par service**

**Monorepo (`packages/`) ≠ monolithe.** Le monorepo organise le code ; le **runtime** reste multi-services.

**Référence :** [INFRASTRUCTURE.md](../02-architecture/INFRASTRUCTURE.md)

---

## Stack IA Ellipse (référence)

```
packages/cortex/          ← Lib → service ellipse-cortex
packages/agents/          ← Lib → workers ellipse-agent-* (1 par type)
packages/pipeline/        ← Lib → workers ellipse-pipeline-* (GPU)
packages/orchestrator/    ← Lib → service ellipse-orchestrator
infra/                    ← Catalogue services, Docker, compose, k8s
```

Voir [ELLIPSE_AI.md](../02-architecture/ELLIPSE_AI.md) pour l'architecture détaillée.

---

## Phases de construction (rappel)

| Phase | Focus IA Ellipse |
|-------|------------------|
| **0** ✅ | Socle, registry agents, planner heuristique temporaire |
| **1** | `@ellipse/cortex` — intent + planification native |
| **2** | Modèles spécialisés Asset / Level (weights Ellipse) |
| **3** | Cortex 3D + modèles depth/mesh intégrés |
| **4+** | Fine-tuning par projet, distillation, marketplace |

---

## Prochaines actions (ordre d'exécution)

### Phase 1 ✅ — Photo-to-Game v0 (2026-05-31)

| # | Action | Statut |
|---|--------|--------|
| 1 | `@ellipse/pipeline` vision sharp | ✅ |
| 2 | Templates GDL multi-genres | ✅ |
| 3 | Asset Agent + patches sprite/palette | ✅ |
| 4 | Engine spritesheet + animation | ✅ |
| 5 | Studio upload + preview | ✅ |

### Immédiat — Phase 2

| # | Action | Cible | Critère done |
|---|--------|-------|--------------|
| 1 | ComfyUI local + `ellipse-asset-v0` | pipeline | génération si COMFYUI_URL up |
| 2 | Asset Agent via queue `ellipse:pipeline:vision` | agents + bus | worker GPU isolé |
| 3 | Segmentation SAM/rembg | pipeline | fond transparent |
| 4 | Export HTML5 standalone | orchestrator | zip jouable offline |
| 5 | OpenTelemetry traces session | infra | trace_id cross-services |

### Fondations ✅ (Phase 0-1)

| # | Action | Statut |
|---|--------|--------|
| 1 | `@ellipse/cortex` build + tests | ✅ |
| 2 | Registry + manifest 7 agents | ✅ |
| 3 | infra/ catalogue + compose | ✅ |
| 4 | Engine 2D jouable | ✅ |
| 5 | Bus async Redis/BullMQ | ✅ |
| 6 | Dockerfile par service | ✅ |
| 7 | ellipse-gateway | ✅ |
| 8 | Studio upload photo | ✅ |
| 9 | Pipeline vision worker | ✅ |
| 10 | Preview engine Studio | ✅ |
| 11 | 7 agent workers queues | ✅ |
| 13 | Gameplay templates GDL | ✅ |
| 14 | Photo-to-Game démo v0 | ✅ |

### Reporté — Moyen terme

| 11 | Entraînement Cortex v0 (weights intent/plan) | remplacer heuristiques |
| 12 | Level Agent parallax depuis photo | tilemap GDL |
| 13 | Timeline agents Studio (WebSocket) | UX temps réel |

### Reporté — ancien moyen terme

---

## Checklist conformité (revue PR)

Avant merge, vérifier :

- [ ] Aucune dépendance SaaS cognitif tiers (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, SDK API Mistral…)
- [ ] Aucune variable `*_API_KEY` pour service cognitif tiers ; cognition derrière un `CortexProvider`
- [ ] Inférence open-weights/Ellipse **auto-hébergée** uniquement (poids + données locales)
- [ ] Nouvel agent enregistré dans `registry.ts` + manifest Cortex
- [ ] Sorties agent validées par Zod / JSON Schema
- [ ] ORDRE-001 à ORDRE-006 respectés
- [ ] Nouveau composant = entrée dans `infra/services/SERVICE_CATALOG.yaml`
- [ ] Pas de fusion de services dans un seul Dockerfile/deploy unit

---

## Révisions

| Date | Changement |
|------|------------|
| 2026-05-31 | Création — IA 100 % Ellipse, interdiction LLM tiers |
| 2026-05-31 | 15 agents spécialisés — un métier = un agent (character, decor, narrative, 3D…) |
| 2026-05-31 | ORDRE-001 révisé — double piste : cible modèle from-scratch (`training/`) + pont open-weights auto-hébergé toléré, via `CortexProvider` / `ELLIPSE_CORTEX_BACKEND`. Interdiction recentrée sur les **SaaS cognitifs tiers**. Scope modèle v0 : 2D/2.5D. |
