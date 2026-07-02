/**
 * Cortex — heuristiques déterministes (classifieur par mots-clés).
 *
 * Filet de sécurité toujours disponible (aucune dépendance externe). Sert aussi de
 * fallback quand le pont open-weights ou le modèle Ellipse sont indisponibles, et de
 * baseline de comparaison pour évaluer le modèle from-scratch.
 *
 * Scope 2D / 2.5D : `detectDimension` distingue `2d`, `2.5d` (depth/parallax) et `3d`.
 */
import type { UserIntent } from '@ellipse/shared';

export const GENRE_KEYWORDS: Record<string, string[]> = {
  platformer: ['platformer', 'plateforme', 'saut', 'jump', 'mario', 'sonic'],
  rpg: ['rpg', 'quête', 'quest', 'aventure', 'exploration', 'donjon', 'dungeon'],
  puzzle: ['puzzle', 'casse-tête', 'réflexion', 'logique', 'match'],
  runner: ['runner', 'infinite', 'endless', 'course', 'fuyez', 'escape'],
  fighting: ['combat', 'fighting', 'versus', 'bagarre', 'arena', 'duel'],
};

export const MECHANIC_PATTERNS: { id: string; patterns: string[] }[] = [
  { id: 'double jump', patterns: ['double jump', 'double saut', 'triple saut'] },
  { id: 'collect', patterns: ['collect', 'collection', 'pièce', 'coin', 'gemme'] },
  { id: 'score', patterns: ['score', 'points', 'high score'] },
  { id: 'health', patterns: ['health', 'vie', 'hp', 'cœur', 'heart'] },
  { id: 'enemy', patterns: ['enemy', 'ennemi', 'monstre', 'boss', 'slime'] },
  { id: 'power-up', patterns: ['power-up', 'powerup', 'bonus', 'boost'] },
  { id: 'dash', patterns: ['dash', 'charge', 'sprint'] },
  { id: 'wall jump', patterns: ['wall jump', 'saut mural'] },
];

export const NARRATIVE_KEYWORDS = ['histoire', 'story', 'quête', 'dialogue', 'narratif', 'intrigue', 'lore', 'roman'];
export const VFX_KEYWORDS = ['particule', 'particle', 'effet', 'explosion', 'juice', 'spark', 'flash'];
export const CINEMATIC_KEYWORDS = ['cinémat', 'cinematic', 'caméra', 'camera', 'cutscene', 'plan séquence'];
/** Indices d'une scène 2.5D : profondeur / parallaxe sur base 2D (pas de vraie 3D). */
export const TWO_HALF_D_KEYWORDS = ['2.5d', '2,5d', 'parallax', 'parallaxe', 'profondeur', 'depth', 'isométrique', 'isometric'];

export const MOOD_KEYWORDS: Record<string, string[]> = {
  dark: ['sombre', 'dark', 'horror', 'effrayant'],
  retro: ['rétro', 'retro', 'pixel', '8-bit', '16-bit'],
  cute: ['mignon', 'cute', 'kawaii', 'chibi'],
  epic: ['épique', 'epic', 'légende', 'heroic'],
};

export const SUBJECT_KEYWORDS: Record<string, string[]> = {
  cat: ['chat', 'cat', 'félin', 'kitten'],
  dog: ['chien', 'dog', 'canin'],
  ninja: ['ninja', 'shinobi', 'samurai'],
  robot: ['robot', 'mecha', 'cyborg'],
  wizard: ['magicien', 'wizard', 'sorcier', 'mage'],
};

export type Dimension = '2d' | '2.5d' | '3d';

export function detectGenre(lower: string): string {
  for (const [g, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return g;
  }
  return 'platformer';
}

export function detectMechanics(lower: string): string[] {
  const found: string[] = [];
  for (const { id, patterns } of MECHANIC_PATTERNS) {
    if (patterns.some((p) => lower.includes(p))) found.push(id);
  }
  return found;
}

export function detectDimension(lower: string, sourceImages: string[]): Dimension {
  if (lower.includes('3d') || lower.includes('three dimensional')) return '3d';
  if (TWO_HALF_D_KEYWORDS.some((k) => lower.includes(k))) return '2.5d';
  if (sourceImages.length > 0 && ['modele', 'model', 'tourne', 'rotation', 'rig'].some((k) => lower.includes(k))) return '3d';
  return '2d';
}

export function detectNarrative(lower: string, genre: string): boolean {
  return NARRATIVE_KEYWORDS.some((k) => lower.includes(k)) || genre === 'rpg' || genre === 'fighting';
}

/** Parse déterministe complet prompt → UserIntent. */
export function parseFallbackIntent(prompt: string, sourceImages: string[] = []): UserIntent {
  const lower = prompt.toLowerCase();
  const genre = detectGenre(lower);
  const mechanics = detectMechanics(lower);
  const dimension = detectDimension(lower, sourceImages);
  const features = {
    narrative: detectNarrative(lower, genre),
    vfx: VFX_KEYWORDS.some((k) => lower.includes(k)) || mechanics.includes('dash'),
    cinematic: CINEMATIC_KEYWORDS.some((k) => lower.includes(k)) || dimension === '3d',
  };
  return { raw_prompt: prompt, genre, dimension, mechanics, source_images: sourceImages, features };
}

/** Enrichissement contextuel (notes Cortex) : mood, sujets, difficulté. */
export function analyzePrompt(prompt: string): {
  mood?: string;
  subjects: string[];
  difficulty: 'easy' | 'normal' | 'hard';
} {
  const lower = prompt.toLowerCase();
  let mood: string | undefined;
  for (const [m, keys] of Object.entries(MOOD_KEYWORDS)) {
    if (keys.some((k) => lower.includes(k))) { mood = m; break; }
  }
  const subjects: string[] = [];
  for (const [sub, keys] of Object.entries(SUBJECT_KEYWORDS)) {
    if (keys.some((k) => lower.includes(k))) subjects.push(sub);
  }
  const difficulty =
    lower.includes('hard') || lower.includes('difficile') ? 'hard'
    : lower.includes('facile') || lower.includes('easy') ? 'easy' : 'normal';
  return { mood, subjects, difficulty };
}
