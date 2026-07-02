import type { GameProjectTask } from '@ellipse/shared';
import { FLAGSHIP_GAME, FLAGSHIP_PATHS } from '@ellipse/shared';

/** Showcase Studio = jeu livrable Veloria (flagship Ellipse). */
export const SHOWCASE_PROJECT_ID = FLAGSHIP_GAME.id;
export const SHOWCASE_SLUG = FLAGSHIP_GAME.slug;
export const SHOWCASE_BASE = FLAGSHIP_PATHS.workspaceBase;
export const SHOWCASE_MANIFEST_URL = `${SHOWCASE_BASE}/08_ops/manifests/veloria-workspace.json`;

export const SHOWCASE_DOC_PATHS = [
  ['pitch', 'Pitch Veloria', `${SHOWCASE_BASE}/00_brief/documents/00_pitch.md`],
  ['game_design_document', 'Game Design Document', `${SHOWCASE_BASE}/00_brief/documents/01_game_design.md`],
  ['narrative_bible', 'Narrative Bible', `${SHOWCASE_BASE}/00_brief/documents/02_narrative.md`],
  ['art_direction', 'Art Direction', `${SHOWCASE_BASE}/00_brief/documents/03_art_direction.md`],
  ['technical_design', 'Technical Design', `${SHOWCASE_BASE}/00_brief/documents/04_technical_design.md`],
  ['production_plan', 'Production Plan', `${SHOWCASE_BASE}/00_brief/documents/05_production_plan.md`],
] as const;

export const SHOWCASE_TASKS: GameProjectTask[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    project_id: SHOWCASE_PROJECT_ID,
    agent_id: 'producer',
    kind: 'vision',
    title: 'Verrouiller Veloria MVP',
    description: 'Survivors portrait : 6 arènes, 3 voies, 12 vagues, bénédictions 3/6/9.',
    status: 'ready',
    priority: 10,
    acceptance_criteria: ['Preview jouable', 'GDL veloria.preview.gdl.json', '14/14 étapes training'],
    depends_on: [],
    payload: {},
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    project_id: SHOWCASE_PROJECT_ID,
    agent_id: 'asset_direction',
    kind: 'asset',
    title: 'Packs HD héroïnes & ennemis',
    description: '29 assets QA validés — héroïnes, supports, elites, boss Bourreau.',
    status: 'ready',
    priority: 9,
    acceptance_criteria: ['Hero pack', 'Enemy roster', 'Boss phases'],
    depends_on: ['10000000-0000-0000-0000-000000000001'],
    payload: {},
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    project_id: SHOWCASE_PROJECT_ID,
    agent_id: 'gameplay_programming',
    kind: 'code',
    title: 'Runtime survivors Veloria',
    description: 'lane_runner, wave_spawner, blessing_draft, hazard_scheduler, boss_phases.',
    status: 'ready',
    priority: 9,
    acceptance_criteria: ['Playtest 24/24 wins', 'Draft auto', 'Esquive hazards'],
    depends_on: ['10000000-0000-0000-0000-000000000001'],
    payload: {},
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    project_id: SHOWCASE_PROJECT_ID,
    agent_id: 'build_release',
    kind: 'build',
    title: 'Preview web HD',
    description: 'Bundle preview.html + veloria-systems.js — slice jouable portrait.',
    status: 'ready',
    priority: 8,
    acceptance_criteria: ['Preview URL active', 'Manifest flagship-deliverable.json'],
    depends_on: ['10000000-0000-0000-0000-000000000003'],
    payload: {},
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    project_id: SHOWCASE_PROJECT_ID,
    agent_id: 'qa',
    kind: 'qa',
    title: 'Gate export P5 shipping',
    description: 'QA assets 07 + intent gate + audit training 14/14.',
    status: 'ready',
    priority: 8,
    acceptance_criteria: ['export_blocked=false', 'phase P5_shipping'],
    depends_on: ['10000000-0000-0000-0000-000000000004'],
    payload: {},
  },
];

export const SHOWCASE_WORKSPACE_PATHS = [
  'README.md',
  '00_brief/documents/00_pitch.md',
  '00_brief/documents/01_game_design.md',
  '02_design/specs/veloria-concept-bible.md',
  '01_inputs/references/reference-index.json',
  '03_assets/registry/studio-asset-catalog.json',
  '05_runtime/gdl/veloria.preview.gdl.json',
  '07_exports/web/preview.html',
  '07_exports/web/preview.js',
  '07_exports/web/veloria-systems.js',
  '08_ops/manifests/veloria-workspace.json',
  '08_ops/manifests/flagship-deliverable.json',
  '08_ops/manifests/training-audit-report.json',
  '08_ops/manifests/synthetic-playtest-report.json',
  '08_ops/manifests/agent-playbook.md',
] as const;
