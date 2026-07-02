/**
 * F3 — Timeline de création : chaque milestone = preview jouable honnête.
 */
import type { GameProjectSnapshot } from '../game-factory.js';

export type StreamMilestoneId =
  | 't0_concept'
  | 't1_isolated'
  | 't2_rigged'
  | 't3_one_mechanic'
  | 't4_one_arena'
  | 't5_full_loop'
  | 't6_ship';

export interface CreationStreamMilestone {
  id: StreamMilestoneId;
  order: number;
  labelFr: string;
  previewFr: string;
  playableCriteriaFr: string;
  studioTab: string;
}

export const CREATION_STREAM: readonly CreationStreamMilestone[] = [
  {
    id: 't0_concept',
    order: 0,
    labelFr: 'T+0 Planche interactive',
    previewFr: 'Silhouette + lanes cliquables',
    playableCriteriaFr: 'Référence importée, intent contract verrouillé',
    studioTab: 'extraction',
  },
  {
    id: 't1_isolated',
    order: 1,
    labelFr: 'T+1 Sujet détouré',
    previewFr: 'Personnage isolé alpha, fond transparent',
    playableCriteriaFr: '02_cutouts validé, IoU ≥ pass',
    studioTab: 'extraction',
  },
  {
    id: 't2_rigged',
    order: 2,
    labelFr: 'T+2 Corps manipulable',
    previewFr: 'Rig bones + idle anim',
    playableCriteriaFr: '04_rig + 05_animation, Corps preview OK',
    studioTab: 'assets',
  },
  {
    id: 't3_one_mechanic',
    order: 3,
    labelFr: 'T+3 Une mécanique',
    previewFr: 'Lane snap OU auto_attack en sim',
    playableCriteriaFr: '1 système GDL actif en engine headless',
    studioTab: 'scene',
  },
  {
    id: 't4_one_arena',
    order: 4,
    labelFr: 'T+4 Une arène',
    previewFr: '1 vague + hazard',
    playableCriteriaFr: 'scene.veloria wave 1 jouable',
    studioTab: 'scene',
  },
  {
    id: 't5_full_loop',
    order: 5,
    labelFr: 'T+5 Boucle complète',
    previewFr: 'Waves + draft + boss',
    playableCriteriaFr: 'GDL complet + QA pass',
    studioTab: 'build',
  },
  {
    id: 't6_ship',
    order: 6,
    labelFr: 'T+6 Export',
    previewFr: 'HTML5 / Godot bundle',
    playableCriteriaFr: 'Export gates OK',
    studioTab: 'build',
  },
] as const;

export interface StreamProgress {
  milestoneId: StreamMilestoneId;
  status: 'pending' | 'active' | 'done';
  detailFr: string;
}

export interface CreationStreamAssessment {
  milestones: StreamProgress[];
  currentId: StreamMilestoneId;
  alwaysPlayableUrl: string | null;
}

export function assessCreationStream(
  snap: GameProjectSnapshot,
  previewUrl?: string | null,
): CreationStreamAssessment {
  const hasRef = (snap.asset_sources?.length ?? 0) > 0;
  const hasCutout = snap.assets.some((a) => a.status !== 'concept');
  const hasRig = snap.assets.some((a) => ['review', 'approved'].includes(a.status));
  const hasMechanic = (snap.scenes?.length ?? 0) > 0 || Boolean(snap.project.metadata?.mechanics);
  const hasArena = snap.builds.length > 0 || snap.project.status === 'producing';
  const hasLoop = snap.assets.some((a) => a.status === 'approved');
  const hasShip = snap.builds.some((b) => b.status === 'ready');

  const flags: Record<StreamMilestoneId, boolean> = {
    t0_concept: hasRef,
    t1_isolated: hasCutout,
    t2_rigged: hasRig,
    t3_one_mechanic: hasMechanic,
    t4_one_arena: hasArena,
    t5_full_loop: hasLoop,
    t6_ship: hasShip,
  };

  let currentId: StreamMilestoneId = 't0_concept';
  const milestones: StreamProgress[] = CREATION_STREAM.map((m) => {
    const done = flags[m.id];
    let status: StreamProgress['status'] = done ? 'done' : 'pending';
    if (!done && m.id === currentId) status = 'active';
    return { milestoneId: m.id, status, detailFr: done ? 'Jouable' : m.playableCriteriaFr };
  });

  const firstOpen = CREATION_STREAM.find((m) => !flags[m.id]);
  if (firstOpen) {
    currentId = firstOpen.id;
    for (const ms of milestones) {
      if (ms.milestoneId === currentId) ms.status = 'active';
    }
  }

  return {
    milestones,
    currentId,
    alwaysPlayableUrl: previewUrl ?? null,
  };
}
