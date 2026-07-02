# Game Construction Stack

This document describes the full layered construction model for Ellipse game workspaces.

## Goal

Do not think of game creation as:
- one scene file
- one engine timeline
- one asset pass
- one "generate game" button

Instead, think of it as a stack of cooperating layers that can be built, tested, and upgraded independently.

## The stack

1. Vision
2. Wireframe
3. Mechanics
4. Scene assembly
5. Narrative
6. Menus and UI
7. Audio
8. VFX and HD presentation
9. Runtime configuration
10. QA and release

## Layer details

### Vision
- project pillars
- audience
- device target
- dimension priority

### Wireframe
- critical path
- anchors
- puzzle/combat pockets
- teach-test-mastery order

### Mechanics
- movement model
- combat verbs
- rewards
- fail states
- progression gates

### Scene assembly
- asset placements
- parallax layers
- collision ownership
- spawn and checkpoint logic
- camera zones

### Narrative
- main spine
- optional lore
- NPC dialogue
- codex
- world-state unlocks

### Menus and UI
- title flow
- continue/load/save
- codex
- settings
- accessibility
- onboarding

### Audio
- music states
- ambients
- SFX families
- transitions
- bus structure

### HD presentation
- particles
- glow logic
- impact responses
- device-tier scaling

### Runtime configuration
- system toggles
- mobile presets
- input routing
- save model
- content loading order

### QA and release
- construction gates
- performance gates
- readability gates
- packaging validation

## Why this matters for 2D / 2.5D / 3D

This stack is dimension-agnostic above the rendering layer.

That means:
- 2D can ship first
- 2.5D can reuse the same story/menu/audio/runtime stack
- 3D can remain optional without invalidating the design system

## Current repo effect

The Echoes workspace now contains:
- hero runtime pack
- environment runtime kit
- asset factory blueprint
- construction stack manifests

So the repo is no longer just collecting references. It is starting to behave like a true layer-driven game factory.
