/**
 * Parcours canonique Ellipse — image concept → asset manipulable → jeu jouable.
 * Source de vérité pour Studio (navigation, boutons, gates).
 *
 * Règle produit : seuls les assets passés par 07_qa (IoU / détourage validé)
 * sont éligibles au runtime GDL. Tout le reste = brouillon, jamais intégré auto.
 */
import type { GameProjectSnapshot } from '../game-factory.js';
import type { AssetStageId } from '../assets/pipeline-stages.js';

export type JourneyStepId =
  | 'brief'
  | 'reference'
  | 'extract'
  | 'refine'
  | 'validate'
  | 'assemble'
  | 'play';

export type JourneyStepStatus = 'locked' | 'ready' | 'active' | 'done' | 'blocked';

/** Onglet Studio cible — string pour éviter dépendance circulaire vers le front. */
export type StudioWorkspaceTab =
  | 'overview'
  | 'documents'
  | 'assets'
  | 'extraction'
  | 'production'
  | 'generate'
  | 'scene'
  | 'build'
  | 'workspace'
  | 'agents'
  | 'observability';

export interface ProductionJourneyStep {
  id: JourneyStepId;
  order: number;
  labelFr: string;
  verbFr: string;
  descriptionFr: string;
  /** Ce qui doit exister pour considérer l'étape terminée */
  exitCriteriaFr: string;
  studioTab: StudioWorkspaceTab;
  workspaceFolders: string[];
  pipelineStages: AssetStageId[];
  /** Artefacts obligatoires (relatifs au pack asset) */
  requiredArtifacts: string[];
}

export const PRODUCTION_JOURNEY: readonly ProductionJourneyStep[] = [
  {
    id: 'brief',
    order: 1,
    labelFr: 'Brief & design',
    verbFr: 'Définir',
    descriptionFr: 'GDD, genre, mécaniques et cast — le contrat créatif du jeu.',
    exitCriteriaFr: 'Au moins un document ou prompt source enregistré.',
    studioTab: 'documents',
    workspaceFolders: ['00_brief', '02_design/specs'],
    pipelineStages: [],
    requiredArtifacts: [],
  },
  {
    id: 'reference',
    order: 2,
    labelFr: 'Planches concept',
    verbFr: 'Importer',
    descriptionFr: 'Images source HD verrouillées — planches, keyart, moodboards. Aucune génération procédurale à ce stade.',
    exitCriteriaFr: 'Références dans 01_inputs/references/ ou asset 01_source.',
    studioTab: 'extraction',
    workspaceFolders: ['01_inputs/references', '01_inputs/uploads'],
    pipelineStages: ['01_source'],
    requiredArtifacts: ['01_source/reference.png', '01_source/source-manifest.json'],
  },
  {
    id: 'extract',
    order: 3,
    labelFr: 'Détourage & découpe',
    verbFr: 'Isoler',
    descriptionFr: 'Matting alpha, segmentation parties — sujet détouré manipulable, pas un crop rectangulaire.',
    exitCriteriaFr: 'cutout-alpha.png avec transparence réelle (02_cutouts).',
    studioTab: 'extraction',
    workspaceFolders: ['03_assets'],
    pipelineStages: ['02_cutouts'],
    requiredArtifacts: ['02_cutouts/cutout-alpha.png', '02_cutouts/segmentation-mask.png'],
  },
  {
    id: 'refine',
    order: 4,
    labelFr: 'Cleanup, rig & animation',
    verbFr: 'Transformer',
    descriptionFr: 'Parts nettoyées, rig.json, spritesheets — passage du raster concept au pack runtime.',
    exitCriteriaFr: 'Stages 03→06 complétés avec atlas et rig exportés.',
    studioTab: 'assets',
    workspaceFolders: ['03_assets'],
    pipelineStages: ['03_cleanup', '04_rig', '05_animation', '06_exports'],
    requiredArtifacts: ['04_rig/rig.json', '06_exports/runtime-manifest.json', '06_exports/atlas.json'],
  },
  {
    id: 'validate',
    order: 5,
    labelFr: 'Gate qualité',
    verbFr: 'Valider',
    descriptionFr: 'IoU vs planche, smoke engine — seuls les assets QA pass entrent dans le jeu.',
    exitCriteriaFr: '07_qa/qa-report.json → passed: true (IoU ≥ seuil).',
    studioTab: 'production',
    workspaceFolders: ['03_assets', '06_qa'],
    pipelineStages: ['07_qa'],
    requiredArtifacts: ['07_qa/qa-report.json'],
  },
  {
    id: 'assemble',
    order: 6,
    labelFr: 'Scène & GDL',
    verbFr: 'Assembler',
    descriptionFr: 'Lier assets validés, layout, systèmes — définition jouable data-driven.',
    exitCriteriaFr: 'GDL runtime avec sprites validés uniquement.',
    studioTab: 'scene',
    workspaceFolders: ['04_scenes', '05_runtime/gdl'],
    pipelineStages: [],
    requiredArtifacts: ['05_runtime/gdl/*.gdl.json'],
  },
  {
    id: 'play',
    order: 7,
    labelFr: 'Jouer & exporter',
    verbFr: 'Livrer',
    descriptionFr: 'Preview moteur, export HTML5/PWA — bloqué si QA projet en échec.',
    exitCriteriaFr: 'preview.html + export sans blockers.',
    studioTab: 'build',
    workspaceFolders: ['07_exports/web'],
    pipelineStages: [],
    requiredArtifacts: ['07_exports/web/preview.html'],
  },
] as const;

export interface JourneyStepProgress {
  id: JourneyStepId;
  status: JourneyStepStatus;
  detailFr: string;
}

export interface JourneyAssessment {
  steps: JourneyStepProgress[];
  currentStepId: JourneyStepId;
  blockersFr: string[];
  eligibleAssetCount: number;
  draftAssetCount: number;
}

function assetQaPassed(asset: GameProjectSnapshot['assets'][number]): boolean {
  return asset.status === 'approved';
}

/** Évalue la progression du parcours à partir du snapshot projet (Studio). */
export function assessProductionJourney(snap: GameProjectSnapshot): JourneyAssessment {
  const assets = snap.assets ?? [];
  const eligible = assets.filter(assetQaPassed);
  const draft = assets.filter((a) => !assetQaPassed(a));

  const hasBrief =
    (snap.prompts?.length ?? 0) > 0 ||
    (snap.documents?.length ?? 0) > 0 ||
    Boolean(snap.project.source_prompt?.trim()) ||
    Boolean(snap.project.summary?.trim());
  const hasReference = (snap.asset_sources?.length ?? 0) > 0 || assets.length > 0;
  const hasExtract = assets.some((a) => a.status !== 'concept');
  const hasRefine = assets.some((a) => ['in_progress', 'review', 'approved'].includes(a.status));
  const hasValidate = eligible.length > 0;
  const hasGdl = (snap.scenes?.length ?? 0) > 0 || (snap.builds?.length ?? 0) > 0;
  const hasPlay = snap.builds.some((b) => b.status === 'ready' || b.target === 'html5');

  const flags: Record<JourneyStepId, boolean> = {
    brief: hasBrief,
    reference: hasReference,
    extract: hasExtract,
    refine: hasRefine,
    validate: hasValidate,
    assemble: hasGdl,
    play: hasPlay,
  };

  const blockersFr: string[] = [];
  if (assets.length > 0 && eligible.length === 0) {
    blockersFr.push(
      `${draft.length} asset(s) en brouillon — aucun n’a passé la gate 07_qa. Le jeu ne peut pas intégrer de « pixel soup ».`,
    );
  }
  if (hasReference && !hasExtract) {
    blockersFr.push('Planches importées mais pas encore détourées (02_cutouts manquant).');
  }
  if (hasExtract && !hasRefine) {
    blockersFr.push('Cutouts présents mais rig/exports runtime absents (stages 03→06).');
  }

  let currentStepId: JourneyStepId = 'brief';
  const steps: JourneyStepProgress[] = PRODUCTION_JOURNEY.map((step) => {
    const done = flags[step.id];
    let status: JourneyStepStatus = 'ready';
    if (done) status = 'done';
    else if (blockersFr.length && step.id === 'validate') status = 'blocked';

    const detailFr = done
      ? 'Terminé'
      : status === 'blocked'
        ? 'Bloqué — corriger la QA'
        : step.exitCriteriaFr;

    return { id: step.id, status, detailFr };
  });

  const firstOpen = PRODUCTION_JOURNEY.find((s) => !flags[s.id]);
  if (firstOpen) currentStepId = firstOpen.id;

  for (const step of steps) {
    if (step.id === currentStepId && step.status !== 'done') {
      step.status = 'active';
    } else if (!flags[step.id] && step.status === 'ready') {
      const prev = PRODUCTION_JOURNEY.find((s) => s.order === getJourneyStep(step.id).order - 1);
      if (prev && !flags[prev.id]) step.status = 'locked';
    }
  }

  return {
    steps,
    currentStepId,
    blockersFr,
    eligibleAssetCount: eligible.length,
    draftAssetCount: draft.length,
  };
}

export function getJourneyStep(id: JourneyStepId): ProductionJourneyStep {
  const step = PRODUCTION_JOURNEY.find((s) => s.id === id);
  if (!step) throw new Error(`Étape parcours inconnue: ${id}`);
  return step;
}
