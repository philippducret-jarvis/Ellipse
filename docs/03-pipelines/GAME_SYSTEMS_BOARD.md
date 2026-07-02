# Game Systems Board

The systems board extends the construction stack with a more editor-like surface for game assembly.

It is meant to answer these questions quickly:
- what can be added to a scene
- where it can be placed
- which trigger chains it owns
- which assets, audio banks, VFX presets, and story nodes it calls

## Core surfaces

`world-composition.json`
- world, region, scene, zone hierarchy
- accepted categories per zone

`addable-elements-catalog.json`
- palette of addable elements
- per-element owner file and typical trigger calls

`trigger-library.json`
- reusable trigger templates
- event, condition, actions, and linked files

`asset-call-graph.json`
- runtime chain from references to packs to scene assembly to feedback systems

`interaction-schema.json`
- drag and drop board rules
- starter layout
- persistence expectations

`systems-board.json`
- aggregate manifest used by the graphical systems board

## Web outputs

`07_exports/web/systems-board.html`
- interactive board
- palette and drop zones
- worlds, triggers, asset calls, recipes

`07_exports/web/construction-map.html`
- project-wide layer map and sequence overview

## Design intent

The goal is not to replace a full runtime editor yet. It is to make complex game construction visible and easy to reason about while staying data-first, modular, and AI-operable.
