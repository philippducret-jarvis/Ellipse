/**
 * Rastérisation CPU d'un `AssetSpec` : SVG vectoriel → PNG, à n'importe quelle densité (Lot 3a).
 *
 * Ferme la boucle « HD sans GPU » : la spec vectorielle (résolution-indépendante) est rendue
 * en SVG pur (`renderAssetSpecToSvg`, shared) puis rastérisée par `sharp` sur CPU. Aucun GPU,
 * aucune diffusion neurale. La densité (`scale` / `pixelRatio`) vient du profil cible.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';
import {
  renderAssetSpecToSvg,
  TEXTURE_BUDGETS,
  type AssetSpec,
  type RuntimeProfileId,
} from '@ellipse/shared';

export interface RasterizeOptions {
  /** Densité explicite. Sinon dérivée du profil. */
  scale?: number;
  /** Profil cible (low/mid/high) → pixelRatio + plafond de texture. */
  profile?: RuntimeProfileId;
}

function resolveScale(spec: AssetSpec, opts: RasterizeOptions): number {
  const budget = opts.profile ? TEXTURE_BUDGETS[opts.profile] : null;
  let scale = opts.scale ?? budget?.pixelRatio ?? 1;
  // Respect du plafond de texture du profil.
  if (budget) {
    const longest = Math.max(spec.width, spec.height) * scale;
    if (longest > budget.maxTextureSize) scale = budget.maxTextureSize / Math.max(spec.width, spec.height);
  }
  return scale;
}

/** Rend l'`AssetSpec` en PNG (buffer), prêt à être atlasé ou écrit. */
export async function rasterizeAssetSpecToPng(
  spec: AssetSpec,
  opts: RasterizeOptions = {},
): Promise<Buffer> {
  const scale = resolveScale(spec, opts);
  const svg = renderAssetSpecToSvg(spec, { scale });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Rend et écrit le PNG sur disque (crée les dossiers parents). */
export async function writeAssetSpecPng(
  spec: AssetSpec,
  outPath: string,
  opts: RasterizeOptions = {},
): Promise<string> {
  const buf = await rasterizeAssetSpecToPng(spec, opts);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return outPath;
}
