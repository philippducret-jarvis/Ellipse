/**
 * AssetFamilyPipeline (Lot 3b) — fabrique réutilisable d'assets HD **sans GPU**.
 *
 * Une seule entrée pour toutes les familles (héros, ennemis, props, …) : génère un `AssetSpec`
 * vectoriel déterministe (style-lock palette + seed), le rastérise en PNG CPU au profil cible,
 * et renvoie les métadonnées d'artefact prêtes pour un `TaskResult` d'agent.
 */
import { join } from 'node:path';
import type { AssetSpec, RuntimeProfileId } from '@ellipse/shared';
import { generateAssetSpec, type AssetFamily } from './procedural-specs.js';
import { writeAssetSpecPng } from './rasterize.js';

export interface AssetFamilyInput {
  id: string;
  family: AssetFamily;
  palette: string[];
  outputDir: string;
  seed?: number;
  fileName?: string;
  width?: number;
  height?: number;
  profile?: RuntimeProfileId;
  /** Préfixe d'URL publique (sert le PNG via le serveur de preview). */
  urlBase?: string;
}

export interface AssetFamilyResult {
  id: string;
  family: AssetFamily;
  spec: AssetSpec;
  pngPath: string;
  url: string;
  width: number;
  height: number;
  profile: RuntimeProfileId;
  seed: number;
}

export async function produceAssetFamily(input: AssetFamilyInput): Promise<AssetFamilyResult> {
  const seed = input.seed ?? 1;
  const profile: RuntimeProfileId = input.profile ?? 'mid';
  const spec = generateAssetSpec({
    id: input.id,
    family: input.family,
    palette: input.palette,
    seed,
    width: input.width,
    height: input.height,
  });

  const fileName = input.fileName ?? `${input.id}.png`;
  const pngPath = join(input.outputDir, fileName);
  await writeAssetSpecPng(spec, pngPath, { profile });

  const url = `${input.urlBase ?? ''}/${fileName}`.replace(/\/+/g, '/');
  return {
    id: input.id,
    family: input.family,
    spec,
    pngPath,
    url,
    width: spec.width,
    height: spec.height,
    profile,
    seed,
  };
}

/** Produit un cast complet (héros + ennemis + props) avec la même palette (cohérence visuelle). */
export async function produceAssetCast(
  families: { id: string; family: AssetFamily; seed?: number }[],
  opts: { palette: string[]; outputDir: string; profile?: RuntimeProfileId; urlBase?: string },
): Promise<AssetFamilyResult[]> {
  return Promise.all(
    families.map((f) =>
      produceAssetFamily({
        id: f.id,
        family: f.family,
        seed: f.seed,
        palette: opts.palette,
        outputDir: opts.outputDir,
        profile: opts.profile,
        urlBase: opts.urlBase,
      }),
    ),
  );
}
