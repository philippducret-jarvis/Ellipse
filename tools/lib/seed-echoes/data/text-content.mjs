export function buildTechnicalPipelineMd() {
  return `# Technical pipeline

## Goal
Use concept images as the top-level source of truth, then derive:
- modular HD assets
- animation briefs
- level layout data
- runtime GDL preview

## Low-GPU strategy
- Use external or API image generation for concept and upscale stages
- Keep local runtime focused on assembly, validation, and export
- Store every prompt/result pair in the workspace for traceability

## Rules
- No monolith: design, assets, scenes, runtime, QA, ops stay separated
- Every generated artifact must be linked to a source image or prompt
- Collision and gameplay data stay authored in JSON, not painted into images
`;
}

export function buildLevelNotesMd() {
  return `# level_01

This preview slice follows the Echoes first-level arc:

- awakening under the tree
- descent through ruined platforms
- weapon test zone
- exit gate

The collision layout is simplified for playability but anchored to the supplied concept boards.
`;
}

export function buildPreviewChecklistMd() {
  return `# Echoes preview checklist

- Background concept image loads from /workspaces
- Hero concept image loads as player sprite
- Spawn is readable on the left third of the scene
- Goal is reachable on the far right
- Platforms align with the broad level narrative
- Preview remains readable on 1280x720 and mobile downscales
`;
}
