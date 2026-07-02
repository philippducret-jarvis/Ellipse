/**
 * Jeu livrable final du projet Ellipse — référence production autonome HD 2D.
 * Toute mission de création aboutit à Veloria comme démonstration complète.
 */
export const FLAGSHIP_GAME = {
  id: 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  slug: 'veloria-veille-des-lames',
  title: 'Veloria — Veille des Lames',
  genre: 'survivors_like' as const,
  dimension: '2d' as const,
  orientation: 'portrait' as const,
  cameraMode: 'top_down' as const,
  gdlFile: 'veloria.preview.gdl.json',
  sourcePrompt:
    'Veloria — Veille des Lames : survivors-like portrait dark fantasy. 6 héroïnes, 3 voies, 12 vagues, bénédictions aux vagues 3/6/9, hazards par arène, boss Bourreau du Crépuscule. HD 2D sans GPU 3D.',
} as const;

export const FLAGSHIP_PATHS = {
  workspaceBase: `/workspaces/${FLAGSHIP_GAME.slug}`,
  previewUrl: `/workspaces/${FLAGSHIP_GAME.slug}/07_exports/web/preview.html`,
  gdlUrl: `/workspaces/${FLAGSHIP_GAME.slug}/05_runtime/gdl/${FLAGSHIP_GAME.gdlFile}`,
  manifestUrl: `/workspaces/${FLAGSHIP_GAME.slug}/08_ops/manifests/veloria-workspace.json`,
  deliverableManifestUrl: `/workspaces/${FLAGSHIP_GAME.slug}/08_ops/manifests/flagship-deliverable.json`,
  trainingAuditUrl: `/workspaces/${FLAGSHIP_GAME.slug}/08_ops/manifests/training-audit-report.json`,
} as const;

export function isFlagshipProject(projectIdOrSlug: string): boolean {
  return projectIdOrSlug === FLAGSHIP_GAME.id || projectIdOrSlug === FLAGSHIP_GAME.slug;
}

export function flagshipPreviewUrl(port = 4400, host = 'localhost'): string {
  return `http://${host}:${port}${FLAGSHIP_PATHS.previewUrl}`;
}
