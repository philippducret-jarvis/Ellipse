import type { WorkspaceTab } from '../store/studio-store.js';

export interface NavTabDef {
  id: WorkspaceTab;
  label: string;
  hint: string;
  icon: string;
}

export interface NavGroupDef {
  id: string;
  label: string;
  tabs: NavTabDef[];
}

/** Navigation projet — ordre = parcours image → jeu (cf. production-journey.ts) */
export const WORKSPACE_NAV: NavGroupDef[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    tabs: [
      {
        id: 'overview',
        label: 'Tableau de bord',
        hint: 'Parcours guidé : étape courante, blockers et liens vers les outils',
        icon: '◉',
      },
      {
        id: 'documents',
        label: 'Brief & design',
        hint: 'GDD, bible narrative, direction artistique — contrat créatif',
        icon: '▤',
      },
    ],
  },
  {
    id: 'fabrique',
    label: 'Chaîne assets',
    tabs: [
      {
        id: 'extraction',
        label: '1. Planches & détourage',
        hint: 'Importer concept art → matting alpha → cutouts isolés (02_cutouts)',
        icon: '✂',
      },
      {
        id: 'assets',
        label: '2. Rig & animation',
        hint: 'Cleanup, rig.json, spritesheets — stages 03→06 par personnage',
        icon: '◈',
      },
      {
        id: 'production',
        label: '3. QA & production',
        hint: 'Gate IoU 07_qa — seuls les assets validés vont dans le jeu',
        icon: '⚙',
      },
      {
        id: 'generate',
        label: 'Génération IA',
        hint: 'Prompt + photo → GDL — enregistré dans le projet après run',
        icon: '✦',
      },
    ],
  },
  {
    id: 'assemblage',
    label: 'Assemblage',
    tabs: [
      {
        id: 'scene',
        label: '4. Scène & GDL',
        hint: 'Layout, spawn, systèmes — assets validés uniquement',
        icon: '▦',
      },
      {
        id: 'build',
        label: '5. Jouer & exporter',
        hint: 'Preview moteur, HTML5/PWA — bloqué si QA échoue',
        icon: '▶',
      },
    ],
  },
  {
    id: 'systeme',
    label: 'Système & ops',
    tabs: [
      {
        id: 'agents',
        label: 'Agents Ellipse',
        hint: '16 agents runtime + équipe factory',
        icon: '◎',
      },
      {
        id: 'workspace',
        label: 'Fichiers projet',
        hint: 'Arborescence disque — 01_inputs → 07_exports',
        icon: '▣',
      },
      {
        id: 'observability',
        label: 'Observabilité',
        hint: 'Télémétrie, provenance, rapports QA',
        icon: '◐',
      },
    ],
  },
];

export const ALL_WORKSPACE_TABS: NavTabDef[] = WORKSPACE_NAV.flatMap((g) => g.tabs);

export function getTabDef(id: WorkspaceTab): NavTabDef | undefined {
  return ALL_WORKSPACE_TABS.find((t) => t.id === id);
}

export const PROJECT_STATUS_FR: Record<string, string> = {
  draft: 'Brouillon',
  planning: 'Planification',
  producing: 'En production',
  review: 'Revue',
  ready: 'Prêt',
  archived: 'Archivé',
};

export const ASSET_STATUS_FR: Record<string, string> = {
  concept: 'Concept',
  source_ready: 'Source prête',
  in_progress: 'En cours',
  review: 'Revue',
  approved: 'Validé',
};

export const SERVICE_LABELS = {
  database: 'Base de données',
  bus: 'Bus agents',
  comfyui: 'Génération GPU',
  up: 'Connecté',
  down: 'Indisponible',
  off: 'Hors ligne',
};

export interface QuickAction {
  id: string;
  label: string;
  hint: string;
  tab?: WorkspaceTab;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const PROJECT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'extract',
    label: '1. Détourer planche',
    hint: 'Importer et isoler le sujet (alpha) — étape obligatoire avant le jeu',
    tab: 'extraction',
    variant: 'primary',
  },
  {
    id: 'assets',
    label: '2. Rig & animation',
    hint: 'Cleanup, rig.json, atlas runtime — stages 03→06',
    tab: 'assets',
    variant: 'secondary',
  },
  {
    id: 'production',
    label: '3. Valider QA',
    hint: 'Gate 07_qa — IoU vs planche, seuls les pass intègrent le GDL',
    tab: 'production',
    variant: 'secondary',
  },
  {
    id: 'scene',
    label: '4. Assembler scène',
    hint: 'Layout GDL avec assets validés uniquement',
    tab: 'scene',
    variant: 'secondary',
  },
  {
    id: 'build',
    label: '5. Jouer / exporter',
    hint: 'Preview et export HTML5 — bloqué si QA projet en échec',
    tab: 'build',
    variant: 'ghost',
  },
  {
    id: 'generate',
    label: 'Génération IA',
    hint: 'Pipeline agents → GDL enregistré dans le projet',
    tab: 'generate',
    variant: 'ghost',
  },
];
