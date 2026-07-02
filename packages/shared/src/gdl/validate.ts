import type { GameDefinition } from '../index.js';
import { isKnownSystem } from './ir.js';
import { isEngineImplementedSystem } from './mechanics-registry.js';

export interface GdlValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGdl(gdl: GameDefinition): GdlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!gdl.meta?.title) errors.push('meta.title manquant');
  if (!gdl.meta?.dimension) errors.push('meta.dimension manquant');
  if (!Array.isArray(gdl.systems) || gdl.systems.length === 0) {
    warnings.push('Aucun system défini');
  } else {
    for (const sys of gdl.systems) {
      if (!isKnownSystem(sys)) warnings.push(`Système inconnu au catalogue IR: ${sys}`);
      else if (!isEngineImplementedSystem(sys) && sys !== 'input' && sys !== 'animation' && sys !== 'ui') {
        warnings.push(`Système déclaré mais non implémenté engine: ${sys}`);
      }
    }
    const veloria = (gdl.meta as { genre?: string })?.genre === 'survivors_like' ||
      gdl.systems.includes('lane_runner');
    if (veloria) {
      const required = ['lane_runner', 'wave_spawner', 'physics_topdown'];
      for (const r of required) {
        if (!gdl.systems.includes(r)) warnings.push(`Veloria: système recommandé absent — ${r}`);
      }
    }
  }
  if (!Array.isArray(gdl.entities) || gdl.entities.length === 0) {
    errors.push('Aucune entité — spawn joueur impossible');
  } else {
    const player = gdl.entities.find((e) => e.id === 'player');
    if (!player) warnings.push('Entité player absente');
    else {
      const assets = player.assets as { sprite?: string } | undefined;
      if (!assets?.sprite) warnings.push('Sprite joueur non défini');
      else if (assets.sprite.includes('placeholder')) warnings.push('Sprite joueur placeholder');
    }
  }
  if (!Array.isArray(gdl.scenes) || gdl.scenes.length === 0) {
    errors.push('Aucune scène');
  } else {
    const scene = gdl.scenes[0] as { entities?: string[] } | undefined;
    if (!scene?.entities?.includes('player')) {
      warnings.push('Joueur absent de la scène active');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function collectAssetRefs(gdl: GameDefinition): string[] {
  const refs = new Set<string>();
  const walk = (obj: unknown): void => {
    if (obj == null) return;
    if (typeof obj === 'string' && (obj.startsWith('/generated/') || obj.startsWith('/uploads/'))) {
      refs.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(walk);
    }
  };
  walk(gdl);
  return [...refs];
}
