# Création tous-genres — Taxonomie, Questionnaire, Bibliothèques & Roadmap dense

> Objectif : à la création, Ellipse couvre **tous les types de jeux**. L'utilisateur répond à un
> questionnaire → Ellipse dérive un **preset de production** → mobilise une **bibliothèque
> spécifique** (assets, audio, cartes, systèmes) → génère le jeu, **sans GPU ni LLM tiers**.
>
> Socle exécutable déjà livré : `packages/shared/src/catalog/game-types.ts` (catalogue typé +
> questionnaire `CREATION_WIZARD` + `derivePreset`), testé.

---

## 1. Taxonomie exhaustive des types de jeux

Classement par famille. `P` = phase de construction (1 = runtime actuel, 2 = étendu, 3 = avancé/3D).

### Action / Plateforme
- **Plateforme** (P1) · Metroidvania (P2) · **Souls-like 2D** (P2) · Runner/Endless (P1) · Beat'em up (P2) · Combat/Versus (P2) · Précision/puzzle-platformer (P2)

### Tir
- Twin-stick shooter (P2) · Shoot'em up / shmup (P2) · Run'n'gun (P2) · Bullet-hell (P3)

### Aventure / RPG
- Aventure top-down (Zelda-like) (P1) · Action-RPG / hack'n'slash (P2) · JRPG tour par tour (P2) · Roguelike/Roguelite (P2) · Dungeon crawler (P3) · Open-world lite (P3)

### Stratégie / Tactique
- Tactics / SRPG grille (P3) · Tower defense (P2) · RTS lite (P3) · 4X lite (P3) · Auto-battler (P3) · Cartes / Deckbuilder (P2)

### Réflexion / Puzzle
- Match-3 (P2) · Blocs qui tombent / Tetris-like (P2) · Sokoban / puzzle logique (P2) · Puzzle physique (P3) · Mots/quiz (P2)

### Narration
- Visual novel / fiction interactive (P2) · Point & click / enquête (P2) · Walking-sim narratif (P3) · Dating-sim (P3)

### Simulation / Gestion
- Gestion / Tycoon / Idle-clicker (P2) · Survie / craft 2D (P3) · City-builder iso (P3) · Sandbox / construction (P3) · Farming-sim (P3)

### Arcade / Divers
- Rythme / musique (P3) · Course 2D arcade (P3) · Sport arcade (P3) · Casse-brique / pong-like (P1) · Snake-like (P1)

### 3D stylisée (phase tardive, sans GPU lourd)
- Plateforme 3D (P3) · FPS-lite / explorateur (P3) · Action 3ᵉ personne / souls 3D (P3) · Course 3D (P3)

> **Styles artistiques** (orthogonaux au genre) : pixel, dessiné main, vectoriel/flat, cartoon,
> peint/illustration, low-poly, rétro 8/16-bit, minimaliste, noir, anime, dark fantasy, cyberpunk.

---

## 2. Questionnaire de création (`CREATION_WIZARD`)

Séquence (chaque réponse restreint/oriente la suivante) :

1. **Type de jeu** (catalogue ci-dessus)
2. **Dimension** : 2D · 2.5D · 3D
3. **Style artistique** (liste `ART_STYLES`)
4. **Ambiance/ton** : mignon · sombre · épique · rétro · mystérieux
5. **Difficulté** : détente · standard · exigeant · **souls**
6. **Portée** : tranche démo · niveau complet · mini-campagne
7. **Plateformes** : web · mobile (PWA) · desktop
8. *(optionnel)* **Références** : photos/images uploadées (→ découpe CV) ; **prompt** libre

→ `derivePreset(answers)` renvoie : `{ dimension, perspective, art_style, difficulty, systems[],
asset_families[], map_kind, audio_profile, platforms[], phase }`. C'est le contrat unique qui pilote
toute la fabrication.

---

## 3. Bibliothèques spécifiques par type (matrice)

Chaque type déclare sa **bibliothèque** : familles d'assets · type de carte · profil audio · systèmes.
Extrait (le catalogue typé fait foi) :

| Type | Familles d'assets clés | Carte | Audio | Systèmes cœur |
|---|---|---|---|---|
| Plateforme | hero, enemies, tileset, collectibles, parallax_bg | tilemap | chiptune+arcade | physics_platformer, collectibles, enemy_ai |
| Souls-like 2D | hero, bosses, weapons, bonfire | graph | dark_ambient+impact | stamina_combat, parry_dodge, bonfire_checkpoints, boss_phases |
| Twin-stick | hero, enemies, projectiles, arena_tiles | arena | synthwave+laser | physics_topdown, shooting, wave_spawner |
| JRPG | party, enemies, portraits, tileset, items | tilemap | melodic_orchestral | turn_based_battle, party_system, dialogue, quest_log |
| Tactics/SRPG | units, classes, grid_tiles, portraits | grid | tactical_orchestral | grid_movement, fog_of_war, ai_tactics |
| Match-3 | gems, board_bg, ui, fx | grid | casual_pop | grid_match, cascade, score_objectives |
| Visual novel | characters, backgrounds, cg, portraits | graph | ambient+voice | dialogue, branching_choices, save_system |
| Tower defense | towers, enemies, path_tiles | tilemap | tension_orchestral | enemy_paths, tower_placement, economy |
| Gestion/Idle | buildings, agents, icons | isometric_grid | cozy_loop | economy, time_progression, build_placement |
| Deckbuilder | cards, enemies, board_bg | graph | mystic_ambient | deck_system, card_effects, map_nodes |
| Roguelike | hero, enemies, tileset, items | grid | dungeon_synth | procedural_dungeon, permadeath, loot_system |

**Réalisation des bibliothèques sans GPU :**
- **Assets** : découpe CV des références (`board-cutter`) + génération procédurale vectorielle HD
  par famille (`produceAssetFamily`, étendue par type) → atlas + animations.
- **Cartes** : générateurs par `map_kind` (tilemap = `world-factory` ; grid/iso/graph/arena/track =
  générateurs dédiés feuille de route).
- **Audio** : `audio_profile` → synthèse procédurale (gammes/tempo/timbres par profil).
- **Systèmes** : registre de systèmes runtime (ECS-lite) ; chaque `system` du preset s'active.

---

## 4. Roadmap dense (lots T)

> Convention : 🎯 objectif · 📦 livrables · ✅ gate · ⛓️ dépend. Réutilise l'acquis
> (IR typé, runtime ECS, AssetFamilyPipeline, board-cutter, durable executor, provenance, télémétrie).

### Bloc A — Création & presets
- **T0 — Catalogue + questionnaire + preset** ✅ *(fait)* : `catalog/game-types.ts` testé (9 tests).
- **T1 — Library resolver** ✅ *(fait)* : `catalog/library-plan.ts` — `resolveLibraryPlan` + `assessLibraryReadiness` (recettes par asset, statut carte/systèmes) ; 3 tests.
- **T2 — Wizard UI dans le studio** ✅ *(fait)* : `studio/components/CreationWizard.tsx` — sélection **type + format (2D/2.5D/3D) + style + ambiance + difficulté + plateformes + modules de mécaniques** (gacha, invocation, tetris, craft, parade/souls, deckbuild…) avec **jeux de référence** par type ; aperçu de production live (`derivePreset`/`resolveLibraryPlan`) → crée le projet. Bouton « ✨ Créer un jeu » (topbar + accueil).
- **T0+ — Banque de mécaniques & références** ✅ : `MECHANIC_MODULES` (18 modules composables) + `reference_games`/`suggested_modules` par type + nouveaux genres (gacha RPG, survivors-like, auto-battler, idle). `derivePreset` fusionne les modules choisis (systèmes + familles d'assets).

### Bloc B — Bibliothèques d'assets par type
- **T3 — Générateurs d'assets par famille** 🟡 *(amorcé)* : `pipeline/asset-factory/library-pack.ts` — `produceLibraryPack(preset)` génère les familles procédurales d'un preset en PNG réels et liste les familles à découper / spécialisées restantes ; 2 tests. Reste : générateurs spécialisés (gems, cards, ships, units, towers, vehicles, portraits, tiles…) + style-lock par `art_style`. ⛓️ T1.
- **T4 — Packs par style artistique** : pixel / dessiné / vectoriel / low-poly → post-traitements CPU (quantification palette pixel, contours, dithering) appliqués aux specs. ⛓️ T3.
- **T5 — Pipeline « références → bibliothèque »** : depuis images uploadées, découpe + classification en familles (Lot 3b généralisé). ⛓️ T3.

### Bloc C — Cartes & mondes par `map_kind`
- **T6 — Générateurs de cartes** : `tilemap` (✓ world-factory), `grid`, `isometric_grid`, `graph` (nœuds de progression), `arena`, `endless`, `track`, `board`. Chacun sort un `SceneSchema`/structure validée + gate de traversabilité. ⛓️ T0.

### Bloc D — Systèmes runtime par genre
- **T7 — Banque de systèmes ECS** : implémenter les `systems` déclarés (stamina_combat, turn_based_battle, grid_movement, deck_system, tower_placement, rhythm_input, procedural_dungeon…), activés par preset. ⛓️ runtime ECS (Lot 1B).
- **T8 — Templates GDL par genre** ✅ *(fait)* : `catalog/starter-game.ts` — `buildStarterGdl(preset)` produit un **GDL valide et jouable pour tout preset** (perspective→systèmes runtime, difficulté→santé/ennemis, intention complète conservée en `meta.declared_systems`/`mechanic_modules`). Prouvé en headless sur platformer/top-down/souls/survivors/gacha. ⛓️ T7.

### Bloc E — Audio par profil
- **T9 — Moteur audio procédural par `audio_profile`** : gammes/tempo/instruments + SFX sets ; bus/zones/ducking (relie Lot 8). ⛓️ —

### Bloc F — Orchestration & qualité
- **T10 — Workflows durables par genre** : recettes de production (assets→carte→systèmes→audio→QA) branchées sur l'exécuteur durable (Lot 4), avec retries/gates. ⛓️ T1, T3, T6, T7.
- **T11 — Gates QA par genre** : critères spécifiques (lisibilité pixel, équilibrage souls, solvabilité puzzle, sync rythme). ⛓️ T7.
- **T12 — Provenance & télémétrie par type** : métriques de production par genre (Lots 5/10). ⛓️ —

### Bloc H — Autonomie de développement (moteur de code par type)
- **T14 — Code-gen autonome** ✅ *(fait)* : `shared/codegen/codegen.ts` — `generateGameCodeProject(preset)` produit, **par type de jeu**, le GDL jouable + des **scaffolds TypeScript** (signature runtime `@ellipse/engine`) pour chaque système à implémenter + un **DEV_BRIEF** (comment créer/modifier/optimiser) + un manifest. `SYSTEM_KNOWLEDGE` encode le savoir-faire et les pistes d'optimisation par système. Sortie tangible dans `generated/code/<genre>/`. C'est la base permettant à l'IA/aux agents de coder, modifier, ajuster, optimiser.
- **T15 — Boucle agent d'implémentation** ⏳ : un agent consomme les scaffolds + brief, implémente le système, le branche au GDL, valide (harnais headless), itère (optimise via télémétrie).

### Frontend
- **Design system renforcé** ✅ : `studio/styles/base.css` refondu — palette/échelles (espacement, rayons, ombres), polish global (typo, scrollbars, focus-visible, champs de formulaire), fond dégradé subtil. Améliore tout l'app d'un coup (tout référence ces tokens). Refonte vue-par-vue = chantier continu.

### Bloc G — Sortie
- **T13 — Profils d'export par plateforme** : web/mobile(PWA)/desktop selon `platforms` (relie Lot 9). ⛓️ —

---

## 5. Ordre d'exécution recommandé
```
T0 ✅ → T1 → (T3 ‖ T6 ‖ T7) → T8 → T2 (wizard UI) → T9 → T10 → T11/T12 → T13
                     └ T4, T5 (styles & références) en parallèle de T3
```
**T1 (library resolver)** est le prochain maillon : il transforme un preset en plan de production
concret, et débloque T3/T6/T7. Les 3D et les genres P3 restent des extensions, jamais des dépendances.
```
