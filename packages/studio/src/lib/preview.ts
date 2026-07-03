import type { GameProjectSnapshot } from '@ellipse/shared';

/**
 * URL de la preview jouable d'un projet — UNIQUE source de vérité.
 * Priorité au runtime FORGÉ (vrai jeu généré : campagne, assets, auto-play),
 * sinon l'ancienne preview 07_exports.
 */
export function resolvePreviewUrl(snap: GameProjectSnapshot | null | undefined): string {
  if (!snap) return '';
  const forgeBuild = snap.builds?.find((b) => b.target === 'forge_runtime');
  const path = (forgeBuild?.output_url ?? '07_exports/web/preview.html').replace(/\\/g, '/');
  return `/workspaces/${snap.project.slug}/${path}`;
}
