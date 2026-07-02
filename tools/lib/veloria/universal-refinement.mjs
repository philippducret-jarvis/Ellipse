import { produceRefinedHeroPack } from './hero-refinement.mjs';
import { produceRefinedCharacterPack } from './enemy-refinement.mjs';
import { produceRefinedGenericPack } from './generic-refinement.mjs';
import { produceHdPack } from './hd-factory.mjs';

/**
 * Point d'entrée unique — route le raffinement selon le rôle asset.
 */
export async function refineAsset(asset, options = {}) {
  if (!asset.pack_root) {
    return { asset, skipped: true, reason: 'no_pack_root' };
  }
  if (!asset.preview_file && options.requireCutout !== false) {
    return { asset, skipped: true, reason: 'no_preview_cutout' };
  }

  switch (asset.role) {
    case 'hero':
      return produceRefinedHeroPack(asset, options);
    case 'enemy':
    case 'boss':
      return produceRefinedCharacterPack(asset, options);
    case 'companion':
    case 'environment':
    case 'ui':
    case 'relic':
    case 'armor':
      return produceRefinedGenericPack(asset, options);
    default:
      return produceHdPack(asset, options);
  }
}

export async function refineAllAssets(assets, onProgress) {
  const results = [];
  for (const asset of assets) {
    onProgress?.(asset);
    try {
      results.push(await refineAsset(asset));
    } catch (err) {
      results.push({
        asset,
        error: err instanceof Error ? err.message : String(err),
        failed: true,
      });
    }
  }
  return results;
}
