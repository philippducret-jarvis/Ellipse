# Game Operating Model

This layer defines how the game behaves and evolves after the first scene exists.

It centralizes:
- progression and economy
- save contracts
- accessibility presets
- localization rollout
- quest arcs
- world-state axes
- build channels
- telemetry and balancing signals

## Main files

`05_runtime/config/progression-economy.json`
- stats, currencies, reward streams, mastery tracks

`05_runtime/config/save-profile.schema.json`
- save slots, persistent groups, migration assumptions

`05_runtime/config/accessibility-presets.json`
- comfort and motor-assist presets

`05_runtime/config/localization-plan.json`
- launch languages, expansion languages, content domains

`05_runtime/config/quest-graph.json`
- main arcs and quest states

`05_runtime/config/world-state-machine.json`
- contamination, memory, and network awareness axes

`05_runtime/config/build-targets.json`
- release channels and gates

`05_runtime/config/telemetry-plan.json`
- balancing, retention, and performance signals

`08_ops/manifests/game-operating-model.json`
- aggregate manifest for the graphical operating-model view

## Web output

`07_exports/web/operating-model.html`
- visual access point for the game operating system

## Intent

The objective is to keep large-scale game behavior explicit and inspectable, so the project can grow without becoming opaque or monolithic.
