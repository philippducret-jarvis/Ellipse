export function buildConstructionDocs({ checkedAt }) {
  return {
    gameConstructionStackMd: `# Echoes construction stack

Checked on: ${checkedAt}

## Why this exists
This workspace should not only hold assets. It should hold the full layered construction model of a video game:
- wireframe and player path
- mechanics and game feel
- asset binding and scene assembly
- camera language
- menus and onboarding
- story graph and codex
- audio and music states
- HD effects and device tiers
- build and QA gates

## Reinvented approach
Instead of treating a game as one timeline or one editor file, Ellipse treats it as a stack of cooperating strata.

Each stratum:
1. owns a specific concern
2. writes data and manifests
3. can be upgraded without collapsing lower layers

## Construction order
1. Vision and constraints
2. Wireframe and interaction anchors
3. Movement, combat, rewards, progression
4. Scene assembly with asset placement
5. Story graph and delivery channels
6. Menus, onboarding, codex, options
7. Audio states and sound families
8. HD effects and device scaling
9. Runtime configuration and build profiles
10. QA and release gates

## 2D, 2.5D, 3D strategy
- 2D is the shipping core.
- 2.5D is an extension of the same manifests.
- 3D is deferred and should reuse the same story, menu, audio, and progression layers.

## Current Echoes application
- hero runtime pack exists
- environment runtime kit exists
- level layout and encounter beats exist
- construction manifests now define how the game should keep growing without rewrites
`,
    interactiveSystemsBlueprintMd: `# Echoes interactive systems blueprint

Checked on: ${checkedAt}

## Purpose
The construction map explains the project. The systems board must let the team think like an editor:
- what can be placed
- where it can be dropped
- what it triggers
- which assets are called
- what audio, VFX, camera, story, and UI reactions are chained

## Surfaces
1. Worlds and zones
2. Addable palette elements
3. Trigger library
4. Asset call graph
5. Runtime event recipes
6. Drag and drop board for scene composition

## Everything that should be embeddable
- player spawns
- checkpoints
- enemies, elite enemies, bosses, NPCs, merchants
- platforms, moving platforms, climbables, doors, keys, breakables
- hazards, traps, environmental damage, secret walls
- pickups, codex memories, weapon choices, upgrades
- story triggers, dialogue, cutscenes, tutorial hints
- music states, ambience states, ducking, stingers, volume ramps
- VFX bursts, corruption waves, glows, fog, spores
- camera focus zones, locks, shakes, framed intros
- save gates, travel portals, unlock gates, progression flags

## Rule set
- Every board item maps to a runtime category.
- Every trigger template names its event, condition, outputs, and files.
- Every world zone declares accepted drop categories.
- Every asset call chain shows which manifest owns the next step.
- Drag and drop remains low-cost by editing data, not heavy binary scenes.
`,
    gameOperatingModelMd: `# Echoes game operating model

Checked on: ${checkedAt}

## Role
This layer defines how the game behaves over time once content exists:
- progression and unlocks
- quests and world state
- save slots and persistent flags
- accessibility and localization
- build targets and device profiles
- telemetry and balancing loops

## Design principle
The game should remain authorable by manifests and agents. Complex systems must be visible, not buried in code-only logic.

## Operating strata
1. Player progression
2. Economy and rewards
3. Save and restore contracts
4. Accessibility presets
5. Localization pipeline
6. Quest and story state
7. World contamination and reactivity
8. Build targets and release channels
9. Telemetry for balancing

## Long-term payoff
This makes the project easier to scale from one polished level to a full game without rewriting the runtime every time a new region, weapon, language, or accessibility rule appears.
`,
  };
}
