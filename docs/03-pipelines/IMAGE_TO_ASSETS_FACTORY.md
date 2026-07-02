# Image-to-Assets Factory

This document defines the production-grade path from concept boards to runtime-ready 2D mobile assets in Ellipse.

## Why this exists

The project already had:
- concept ingestion
- workspace generation
- preview assembly
- a lightweight lot0 extraction path

What it did not have yet was a reliable production contract for:
- clean subject cutouts
- part splitting for runtime animation
- low-GPU local fallback versus remote heavy jobs
- agent-readable ownership of each production folder

This document fills that gap.

## Core principle

Do not ask one monolithic AI step to do everything.

Instead, break asset production into separate states:
1. `source`
2. `cutout`
3. `cleanup`
4. `rig`
5. `animation`
6. `export`
7. `qa`
8. `remote_job` when local hardware is not enough

That gives us traceability, repeatability, and a place for embedded agents to act without ambiguity.

## Reference implementation strategy

### 1. Segmentation and cutout

Use a two-lane strategy:
- Low-cost local fallback: `rembg`
- Higher-quality segmentation path: `SAM 2`

Why:
- `rembg` is simple and works well as a local first pass.
- `SAM 2` is a much stronger candidate for dense painterly boards where the subject and background interlock visually.

Official sources:
- `rembg`: https://github.com/danielgatis/rembg
- `SAM 2`: https://github.com/facebookresearch/sam2

### 2. Cleanup and part split

After segmentation, the asset still is not runtime-ready.

We need:
- transparent alpha QA
- edge repair
- hidden limb reconstruction when needed
- naming and pivots for parts

This stage is where most "looks good in a mockup but breaks in production" failures are prevented.

### 3. Runtime 2D rig

For gameplay characters, prefer a cutout rig plus sprite-swap hybrid.

Why:
- fully generated frame-by-frame animation is expensive to keep coherent
- mobile runtime wants fewer textures and controlled motion
- cutout rigs remain editable after generation

Official reference:
- Godot 2D skeleton docs: https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html

### 4. Motion generation

Not every animation problem should be solved with the same tool.

Use:
- runtime rigs for gameplay loops
- portrait motion tools for portraits, key art, or dialogue panels

Official reference:
- LivePortrait: https://github.com/KlingAIResearch/LivePortrait

Important limitation:
- portrait animation tools are not a replacement for side-view combat locomotion packs

### 5. Atlas and metadata export

The runtime should not depend on raw layered PSD-style outputs.

Export:
- deterministic sprite atlases
- frame tags
- metadata for pivots, hitboxes, and timing

Official reference:
- Aseprite sprite sheet export: https://www.aseprite.org/docs/sprite-sheet/

### 6. Workflow orchestration

For heavier graph-based image workflows, use a workflow runner rather than hand-wiring each run.

Official reference:
- ComfyUI: https://github.com/comfyanonymous/ComfyUI

### 7. Optional image-to-3D branch

For premium promo renders, statues, or optional proxies, run image-to-3D remotely instead of expecting local consumer hardware to do it comfortably.

Official reference:
- TRELLIS: https://github.com/microsoft/TRELLIS

This branch is optional and should stay clearly labeled as remote and QA-sensitive.

## Quality gates

No asset is considered runtime-ready until it passes:
- no background halo
- no clipped extremities
- no fake transparency caused by dark matte contamination
- mobile readability at gameplay scale
- explicit state coverage for animation
- metadata stored outside pixel art

## Embedded agent responsibilities

The embedded AI should know how to:
- classify the asset type
- select the correct reference boards
- choose a low-GPU or remote path
- create or update the production folders
- record which tool generated which intermediate
- stop promotion when QA blockers exist

## Practical outcome in this repo

The repo now exposes an `asset factory` knowledge layer plus a workspace sync script that writes:
- tooling manifests
- agent playbooks
- per-asset production recipes
- cutting QA checklists
- per-asset production folders and contracts

This does not magically complete the whole art pipeline by itself.
It does make the project operational, auditable, and ready to integrate the actual external model/toolchain cleanly.
