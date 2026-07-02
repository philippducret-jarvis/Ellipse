# Ellipse — Vision complète de l'outil : création tous-genres, IA, agents & écrans

> Document maître. Répond à : (1) tous les types de jeux et leur intégration à la création,
> (2) les mécaniques spécifiques par type, (3) l'intégration avec l'IA et les agents,
> (4) le traitement global d'un jeu par type, (5) la vision écran par écran.
> Tout est **sans GPU ni LLM tiers**. Pièces exécutables : `catalog/game-types.ts`,
> `library-plan.ts`, `starter-game.ts`, `production-recipe.ts`, `codegen/codegen.ts`.

---

## 0. Vision de l'outil

Ellipse est un **studio de production de jeux assisté par IA** : on décrit/choisit un jeu, l'IA
maîtresse (Cortex) planifie, des **agents spécialisés** fabriquent (assets, niveaux, systèmes, audio),
le **code-gen** écrit le code par type de jeu, l'**exécuteur durable** orchestre, et le runtime
data-driven rend le jeu jouable — le tout traçable (provenance) et exportable (web/mobile/desktop).

Principe : **un type de jeu = un preset = une bibliothèque + des systèmes + une recette de production.**

---

## 1. Tous les types de jeux & intégration à la création

La création passe par l'**Assistant** (`CreationWizard`) en 4 temps :
**Type → Format (2D/2.5D/3D) → Style/Ambiance/Difficulté → Mécaniques (modules) → Plateformes**,
puis `derivePreset()` produit la config, `resolveLibraryPlan()` le plan de prod, `buildStarterGdl()`
un jeu jouable, `buildProductionRecipe()` le pipeline d'agents.

Familles couvertes : **Action/Plateforme, Tir, RPG/Aventure, Stratégie/Tactique, Réflexion/Puzzle,
Narration, Simulation/Gestion, Arcade, Live/Collection, 3D stylisée (phase tardive).**

---

## 2. Mécaniques spécifiques par type (matrice)

`Sys` = systèmes runtime cœur · `Modules` = mécaniques composables suggérées · `Réf` = jeux phares.

| Type | Dim / Perspective | Systèmes cœur | Modules suggérés | Carte | Réf |
|---|---|---|---|---|---|
| Plateforme | 2D/2.5D · latéral | physics_platformer, collectibles, enemy_ai, hazards, goal | combos, temps | tilemap | Mario, Celeste, Hollow Knight |
| Metroidvania | 2D · latéral | physics_platformer, abilities, world_map, save | skill_tree, loot | graph | Hollow Knight, SOTN |
| **Souls-like 2D** | 2D/2.5D · latéral | stamina_combat, parry_dodge, lock_on, bonfire_checkpoints, boss_phases | parade/esquive, loot, permadeath | graph | Dark Souls, Blasphemous |
| Runner | 2D · latéral | runner_physics, endless_scroll, obstacle_spawner | vagues | endless | Canabalt, Subway Surfers |
| Beat'em up | 2D/2.5D · latéral | brawler_combat, combo_system, enemy_waves | combos, vagues | scene_graph | Streets of Rage |
| Combat/Versus | 2D · latéral | fighting_physics, hitbox, combo_system, round_system | combos | arena | Street Fighter, Skullgirls |
| Twin-stick | 2D · top-down | shooting, twin_stick_aim, wave_spawner | vagues, loot, permadeath | arena | Enter the Gungeon |
| Shmup | 2D · latéral/top | auto_scroll, bullet_patterns, boss_phases, power_ups | vagues | endless | Ikaruga, Touhou |
| Aventure top-down | 2D/2.5D · top-down | physics_topdown, dialogue, inventory, enemy_ai, triggers | craft, skill_tree | tilemap | Zelda, Tunic |
| Action-RPG | 2D/2.5D · top/iso | rpg_stats, loot_system, skill_tree, inventory | loot, skill_tree, permadeath | tilemap | Diablo, Hades |
| JRPG | 2D/2.5D · top-down | turn_based_battle, party_system, dialogue, quest_log | invocation, skill_tree, romance | tilemap | FF VI, Chrono Trigger |
| Roguelike | 2D · top-down | procedural_dungeon, permadeath, turn_system, loot | permadeath, loot | grid | Isaac, Slay the Spire |
| Tactics/SRPG | 2D/2.5D · iso/top | grid_movement, turn_based_battle, fog_of_war, ai_tactics | invocation, skill_tree | grid | Fire Emblem, FFT |
| Match-3 | 2D · top-down | grid_match, cascade, score_objectives | match-3, gacha | grid | Bejeweled, P&D |
| **Tetris-like** | 2D · latéral | falling_blocks, line_clear, gravity_grid, level_speed | blocs | grid | Tetris, Puyo Puyo |
| Sokoban | 2D/2.5D · top/lat | grid_movement, push_blocks, goal_tiles, undo | temps | grid | Baba Is You |
| Visual novel | 2D · latéral | dialogue, branching_choices, save | romance | graph | DDLC, Steins;Gate |
| Point & click | 2D/2.5D · latéral | hotspots, inventory, dialogue, puzzle_logic | — | scene_graph | Monkey Island, Obra Dinn |
| Tower defense | 2D/2.5D · top/iso | enemy_paths, tower_placement, wave_spawner, economy | vagues, base | tilemap | Kingdom Rush, BTD |
| RTS lite | 2D/2.5D · top/iso | unit_selection, rts_pathfinding, resource_economy | base, vagues | tilemap | StarCraft, AoE |
| Gestion/Idle | 2D/2.5D · iso | economy, time_progression, build_placement, upgrades | base, prestige | isometric_grid | Tycoon, Two Point |
| Deckbuilder | 2D · latéral | deck_system, turn_based_battle, card_effects, map_nodes | deck, loot | graph | Slay the Spire, Inscryption |
| Rythme | 2D · latéral/top | rhythm_input, beatmap, scoring, audio_sync | — | track | osu!, NecroDancer |
| Course 2D | 2D/2.5D · top/lat | vehicle_physics, lap_system, ai_racers | véhicules | track | Micro Machines |
| Survie/Craft | 2D/2.5D · top/lat | inventory, crafting, day_night, hunger_health, procedural_world | craft, base, jour/nuit | tilemap | Terraria, Stardew |
| **Gacha RPG** | 2D/2.5D · latéral/top | turn_based_battle, gacha_summon, roster_collection, ascension, banner_rotation | gacha, invocation, skill_tree | graph | Genshin, FGO |
| **Survivors-like** | 2D · top-down | auto_attack, horde_spawner, level_up_drafts, pickup_magnet, survival_timer | vagues, skill_tree, permadeath | arena | Vampire Survivors, Brotato |
| Auto-battler | 2D/2.5D · top/iso | shop_phase, unit_synergies, auto_battle, economy, rounds | gacha, deck | grid | TFT, Super Auto Pets |
| Idle/Incremental | 2D · latéral | idle_production, prestige, upgrade_tree, offline_progress | prestige, craft | scene_graph | Cookie Clicker |

> Banque de **modules composables** (`MECHANIC_MODULES`, 18) attachables selon la famille :
> gacha/invocation, escouade, blocs (tetris), match-3, deckbuild, craft, arbre de compétences,
> construction de base, permadeath, parade/esquive (souls), combos, manipulation du temps,
> jour/nuit, romance, prestige/idle, vagues/horde, loot & raretés, véhicules.

---

## 3. Intégration IA & agents

```
Prompt / Wizard
   │  Cortex (IA maîtresse, ONNX from-scratch + heuristiques + solveur budget)
   ▼  intent → derivePreset → plan arbitré (coût/qualité/délai)
buildProductionRecipe(type)  ── pipeline d'agents par étape ──────────────┐
   ▼                                                                       │
Exécuteur durable (retry / resume / gates humaines)                       │
   ├─ design     : cortex_master + narrative → game_spec, art_bible       │
   ├─ art        : character / decor / ui / vfx → asset_pack (procédural  │ provenance
   │               HD vectoriel + découpe CV des références)              │  + télémétrie
   ├─ animation  : animation → atlas, manifests                          │  par étape
   ├─ niveau     : level → scene + collisions (par map_kind)             │
   ├─ systèmes   : gameplay + **code-gen** → systèmes du type            │
   ├─ audio      : music + sfx → profil audio procédural                 │
   ├─ assemblage : integration + camera → preview bundle                 │
   └─ qa         : qa → gates spécifiques au genre ─────────────────────┘
   ▼
Runtime data-driven (jouable) → export web / mobile (PWA) / desktop
```

- **Cortex** décide (intent, plan, budget, arbitrage) — `planFromPromptArbitrated`.
- **Agents** exécutent chaque étape ; le **code-gen** (`generateGameCodeProject`) fournit aux agents
  les **scaffolds de systèmes** + un **DEV_BRIEF** (comment créer/modifier/optimiser) par type.
- **Durable executor** garantit reprise/retries ; **provenance** trace la généalogie ; **télémétrie**
  mesure coût/qualité/retries par étape et par genre.

---

## 4. Traiter un jeu dans sa globalité, par type

`buildProductionRecipe(type)` renvoie les **étapes + agents + sorties** et les **gates QA** propres au
genre :
- platformer → gate **traversabilité** ; souls → **courbe de difficulté (punitif mais juste)** ;
  puzzle/tetris → **solvabilité** ; visual novel → **cohérence narrative** ; rythme → **sync audio** ;
  tower defense/survivors → **courbe de vagues** ; deckbuilder/auto-battler → **équilibrage**.
- Gates transverses toujours présentes : **perf mobile, lisibilité, validation GDL, smoke runtime.**

Ainsi un même moteur produit chaque genre avec **sa** chaîne d'agents, **ses** assets, **ses** systèmes,
**son** audio et **ses** critères de validation.

---

## 5. Vision écran par écran (refonte cible)

Design system renforcé (`base.css` : palette, échelles, ombres, focus, champs) = socle commun.

1. **Cockpit / Accueil** — état du studio : projets (cartes), CTA « ✨ Créer un jeu », santé des
   services, derniers runs, métriques clés (prompt→preview, coût, QA). *Intègre IA* : suggestions de
   genres et de presets.
2. **Assistant de création** *(fait)* — type + format + style + ambiance + difficulté + **modules de
   mécaniques** + plateformes + références, avec **aperçu de production live** (systèmes prêts, carte,
   audio) et **jeux de référence** par type.
3. **Workspace par jeu** — en-tête (titre, genre, dimension, statut), navigation par onglets
   adaptés au type (un JRPG montre Party/Quêtes ; un Tetris montre Règles/Score ; un Gacha montre
   Roster/Bannières).
4. **Production / Agents** — la **recette de production** du type en pipeline visuel (étapes, agents,
   statut durable : en cours / retry / gate humaine), avec relance ciblée par étape.
5. **Assets** — galerie par famille (héros, ennemis, props, tilesets, UI, FX) avec **variantes +
   provenance** (découpe CV vs procédural, seed) et regénération ; budgets de texture par profil.
6. **Generate / Preview** — prompt + preview runtime **jouable intégrée**, timeline des agents,
   diff GDL ; le code-gen propose les **systèmes à coder** pour le type.
7. **Éditeur de scène** — placement entités/plateformes/triggers écrivant l'IR typé (round-trip),
   adapté au `map_kind` (tilemap / grille / nœuds / arène / circuit).
8. **Build / Export** — profils web/mobile(PWA)/desktop, gates QA du genre, gate compliance
   (photo de personne / licences) bloquante avant export public.
9. **Observabilité** — coût/qualité/retries par run et par genre, provenance requêtable,
   rejouabilité par seed.

> Implémentation : la **fondation design** est posée et l'**assistant** est livré ; la refonte des
> écrans 1, 3–9 se fait **écran par écran** (chaque écran consomme les pièces exécutables ci-dessus),
> avec validation visuelle.

---

## 6. État (exécutable, vérifié)
- ✅ Catalogue types + modules + références (`game-types.ts`)
- ✅ Library resolver (`library-plan.ts`) · ✅ Starter GDL jouable (`starter-game.ts`)
- ✅ Recettes de production par type (`production-recipe.ts`)
- ✅ Code-gen autonome par type (`codegen.ts`)
- ✅ Assistant de création (studio) · ✅ Design system renforcé
- ⏳ Refonte écran par écran (1, 3–9) · ⏳ Implémentation runtime des systèmes par mécanique (T7/T15)
