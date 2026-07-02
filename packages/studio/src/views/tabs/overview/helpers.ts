import type { GameProjectSnapshot } from '@ellipse/shared';
import type { WorkflowCatalogResponse } from '../../../api/client.js';
import { PROJECT_STATUS_FR } from '../../../i18n/fr.js';

const TASK_STATUS_FR: Record<string, string> = {
  pending: 'En attente',
  ready: 'Prêt',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Échec',
  blocked: 'Bloqué',
};

export function buildTaskSummary(snap: GameProjectSnapshot): { label: string; value: string }[] {
  const taskCounts = new Map<string, number>();
  for (const task of snap.tasks) {
    taskCounts.set(task.status, (taskCounts.get(task.status) ?? 0) + 1);
  }

  const statusSplit =
    [...taskCounts.entries()]
      .map(([status, count]) => `${count} ${TASK_STATUS_FR[status] ?? status}`)
      .join(' · ') || 'aucune';

  return [
    { label: 'Genre', value: snap.project.genre ?? 'hybride' },
    { label: 'Dimension', value: snap.project.dimension.toUpperCase() },
    { label: 'Moteur cible', value: snap.project.target_runtime },
    { label: 'Caméra', value: snap.project.camera_mode },
    { label: 'Tâches', value: String(snap.tasks.length) },
    { label: 'Assets', value: String(snap.assets.length) },
    { label: 'Documents', value: String(snap.documents.length) },
    { label: 'Répartition tâches', value: statusSplit },
  ];
}

export function buildWorkflowSummary(catalog: WorkflowCatalogResponse | null) {
  return {
    count: catalog?.workflows.length ?? 0,
    runtimes: catalog
      ? [...new Set(catalog.workflows.map((workflow) => workflow.runtime))].join(' · ')
      : 'chargement…',
    masterSurface: 'contrats + workflows',
    currentTarget: 'mobile 2D / 2,5D',
  };
}

export function projectStatusFr(status: string): string {
  return PROJECT_STATUS_FR[status] ?? status;
}
