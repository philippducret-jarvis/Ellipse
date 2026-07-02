/**
 * Playbook machine-readable — enseigne aux agents quand créer ou retoucher une image.
 */
import type { AgentType } from './catalog.js';

export type ImageOperationId =
  | 'segment_floodfill'
  | 'segment_rembg_fallback'
  | 'retouch_inpaint_cpu'
  | 'retouch_hybrid_board'
  | 'retouch_enhance'
  | 'create_procedural'
  | 'create_lot0_photo'
  | 'create_comfyui_remote';

export interface ImageOperationRecipe {
  id: ImageOperationId;
  labelFr: string;
  whenToUse: string;
  primaryAgent: AgentType;
  supportingAgents: AgentType[];
  inputs: string[];
  outputs: string[];
  tool: string;
  fidelityGate?: string;
  fallback?: ImageOperationId;
}

export const IMAGE_OPERATION_RECIPES: ImageOperationRecipe[] = [
  {
    id: 'segment_floodfill',
    labelFr: 'Détourage flood-fill CPU',
    whenToUse: 'Stage 02 — planche concept avec fond uniforme ; sujet centré ; pas de GPU.',
    primaryAgent: 'character',
    supportingAgents: ['qa'],
    inputs: ['01_source/reference.png'],
    outputs: ['02_cutouts/cutout-alpha.png', '02_cutouts/segmentation-mask.png'],
    tool: 'ellipse-extract-subject-v1',
    fidelityGate: 'IoU ≥ 0.42 vs planche après cleanup',
    fallback: 'segment_rembg_fallback',
  },
  {
    id: 'segment_rembg_fallback',
    labelFr: 'Détourage rembg (GPU/CPU distant)',
    whenToUse: 'Fond complexe, bords cheveux/cloth — flood-fill échoue ou IoU < 0.42.',
    primaryAgent: 'character',
    supportingAgents: ['qa'],
    inputs: ['01_source/reference.png'],
    outputs: ['02_cutouts/cutout-alpha.png'],
    tool: 'rembg',
    fallback: 'create_comfyui_remote',
  },
  {
    id: 'retouch_hybrid_board',
    labelFr: 'Hybrid planche + master',
    whenToUse: 'IoU 0.42–0.55 : combiner pixels planche avec master procédural ou cleanup.',
    primaryAgent: 'character',
    supportingAgents: ['animation', 'qa'],
    inputs: ['03_cleanup/board_frame.png', '03_cleanup/silhouette_hd_master.png'],
    outputs: ['03_cleanup/silhouette-clean.png'],
    tool: 'ellipse-hybrid-composite-v1',
    fidelityGate: 'IoU ≥ 0.55 avant rig',
  },
  {
    id: 'retouch_inpaint_cpu',
    labelFr: 'Inpaint CPU (polish shipping)',
    whenToUse: 'Stage 08 / QA IoU 0.55–0.72 — enrichir master sans perdre la silhouette planche.',
    primaryAgent: 'character',
    supportingAgents: ['decor', 'qa'],
    inputs: ['03_cleanup/board_frame.png', '03_cleanup/silhouette_hd_master.png'],
    outputs: ['08_inpaint/inpaint_master.png', '08_inpaint/inpaint-report.json'],
    tool: 'ellipse-cpu-inpaint-v1',
    fidelityGate: 'IoU shipping ≥ 0.72',
    fallback: 'create_comfyui_remote',
  },
  {
    id: 'retouch_enhance',
    labelFr: 'Enhance couleur/netteté',
    whenToUse: 'Arènes, UI, props statiques — pas de déformation silhouette.',
    primaryAgent: 'decor',
    supportingAgents: ['qa'],
    inputs: ['03_cleanup/silhouette-clean.png'],
    outputs: ['03_cleanup/silhouette-clean.png'],
    tool: 'sharp-modulate',
  },
  {
    id: 'create_procedural',
    labelFr: 'Création procédurale vectorielle',
    whenToUse: 'Aucune photo — placeholder gameplay ou draft rapide ; IoU N/A.',
    primaryAgent: 'character',
    supportingAgents: ['decor'],
    inputs: ['prompt keywords', 'style palette'],
    outputs: ['generated/*/spritesheet.png'],
    tool: 'ellipse-procedural-spec-v1',
  },
  {
    id: 'create_lot0_photo',
    labelFr: 'Création depuis photo (Lot 0)',
    whenToUse: 'Photo portrait ou concept uploadé — extraction éléments + spritesheet layered.',
    primaryAgent: 'character',
    supportingAgents: ['animation'],
    inputs: ['source_images[]'],
    outputs: ['lot0/lot0_manifest.json', 'layered-sprite.png'],
    tool: 'ellipse-lot0-v1',
    fidelityGate: 'learning score ≥ 60',
  },
  {
    id: 'create_comfyui_remote',
    labelFr: 'Génération / inpaint ComfyUI (Phase 2)',
    whenToUse: 'IoU < 0.42 après 2 passes CPU ; ou demande explicite upscale/inpaint GPU.',
    primaryAgent: 'character',
    supportingAgents: ['vfx', 'qa'],
    inputs: ['01_source/reference.png', 'production.workorder.json'],
    outputs: ['08_remote_jobs/job-results/*.json'],
    tool: 'comfyui-api',
  },
];

/** Chaîne de décision fidélité → opération recommandée. */
export function recommendImageOperation(opts: {
  hasPhoto: boolean;
  iou?: number;
  stage?: string;
  role?: string;
}): ImageOperationId {
  if (!opts.hasPhoto) return 'create_procedural';
  if (opts.iou != null && opts.iou >= 0.72) return 'retouch_enhance';
  if (opts.iou != null && opts.iou >= 0.55) return 'retouch_inpaint_cpu';
  if (opts.iou != null && opts.iou >= 0.42) return 'retouch_hybrid_board';
  if (opts.stage === '02_cutouts') return 'segment_floodfill';
  return opts.hasPhoto ? 'create_lot0_photo' : 'create_procedural';
}

export function formatImagePlaybookForAgents(agent?: AgentType): string {
  const recipes = agent
    ? IMAGE_OPERATION_RECIPES.filter((r) => r.primaryAgent === agent || r.supportingAgents.includes(agent))
    : IMAGE_OPERATION_RECIPES;

  const lines = [
    '## Playbook création & retouche d\'images',
    '',
    'Règles :',
    '- Toujours partir de 01_source/reference.png verrouillée.',
    '- Stage 02 = alpha réel, jamais crop rect seul.',
    '- IoU < 0.55 → hybrid obligatoire avant export.',
    '- IoU < 0.72 → inpaint CPU (stage 08) avant shipping.',
    '- Écrire agent_notes: { method, iou, operation_id, next_engine }.',
    '',
    'Opérations :',
    ...recipes.map(
      (r) =>
        `### ${r.id} — ${r.labelFr}\n- Quand : ${r.whenToUse}\n- Agent : ${r.primaryAgent}\n- Tool : ${r.tool}\n- In : ${r.inputs.join(', ')}\n- Out : ${r.outputs.join(', ')}${r.fidelityGate ? `\n- Gate : ${r.fidelityGate}` : ''}${r.fallback ? `\n- Fallback : ${r.fallback}` : ''}`,
    ),
  ];
  return lines.join('\n');
}
