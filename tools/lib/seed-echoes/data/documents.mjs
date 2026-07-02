export function buildSeedDocuments(project) {
  return [
    {
      id: '00000000-0000-0000-0000-000000000101',
      project_id: project.id,
      kind: 'pitch',
      title: 'Project Pitch',
      status: 'generated',
      content: `# Echoes of the Mushroom Realm

## High concept
A dark fantasy 2D action exploration game built for mobile and web preview. The player awakens under the Origin Tree, crosses fungal battlefields, tests one sacred weapon, then exits into a larger corrupted world.

## Pillars
- Painterly HD 2D presentation
- Readable combat and traversal
- Modular level construction
- Strong atmosphere driven by spores, ruins, and luminous accents
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      project_id: project.id,
      kind: 'game_design_document',
      title: 'Game Design Document',
      status: 'generated',
      content: `# Core loop
- Wake under the Origin Tree
- Learn movement through a safe opening zone
- Cross a dangerous fungal battlefield
- Reach a weapon test altar
- Choose one weapon
- Exit through the final gate

## MVP scope
- One hero
- One demonstration level
- Four enemy archetypes
- One mini-boss/boss placeholder
- One complete preview build
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      project_id: project.id,
      kind: 'narrative_bible',
      title: 'Narrative Bible',
      status: 'generated',
      content: `# Story frame
The Echo is a child the network could not read. He awakens beneath the Origin Tree, where the remains of former guardians and abandoned weapons lie entangled in spores. This first level serves as a rite of passage: survive, remember, choose a weapon, and leave.

## Named roles
- The Echo: hooded playable hero with red cloak
- Myla: guide tied to spores and memory
- The Cardinal: corrupted authority figure
- Root Guardian: first major fungal protector
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      project_id: project.id,
      kind: 'art_direction',
      title: 'Art Direction',
      status: 'generated',
      content: `# Visual direction
- Painterly 2D, dark fantasy, high-detail illustration
- Main contrast: warm ember reds vs cool fungal violets and blues
- Hero readability must survive mobile downscaling
- Stone, roots, spores, lamps, and weapon altars are reusable motifs

## Rendering target
- Use full concept boards as reference anchors
- Favor atmosphere and silhouette fidelity over raw effect count
- Keep the level layout modular even when the preview uses painted boards
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
    {
      id: '00000000-0000-0000-0000-000000000105',
      project_id: project.id,
      kind: 'technical_design',
      title: 'Technical Design',
      status: 'generated',
      content: `# Runtime target
- Web 2D runtime
- 1280x720 preview baseline
- Mobile-friendly readability

## First implementation rules
- Serve workspace references statically
- Support background concept images in-engine
- Keep level collision authored in JSON
- Reuse the Echoes layout preset for level generation
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
    {
      id: '00000000-0000-0000-0000-000000000106',
      project_id: project.id,
      kind: 'production_plan',
      title: 'Production Plan',
      status: 'generated',
      content: `# Immediate milestones
1. Seed workspace and references
2. Lock cast and environment modules
3. Author level_01 layout and preview GDL
4. Iterate hero, enemies, and props toward runtime-ready assets
5. Add QA and mobile performance passes
`,
      payload: {},
      created_by: 'ellipse_seed',
    },
  ];
}
