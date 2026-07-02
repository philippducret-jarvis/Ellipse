import type { GameProjectAsset, UserIntent } from '@ellipse/shared';

export function extractTitle(prompt: string): string {
  const compact = prompt.trim().replace(/\s+/g, ' ');
  if (!compact) return 'Untitled Ellipse Project';
  const words = compact.split(' ').slice(0, 7).join(' ');
  return words.length >= 12 ? words : `${words} Prototype`;
}

export function pickCameraMode(intent: UserIntent): 'side_view' | 'top_down' | 'third_person' | 'isometric' {
  if (intent.dimension === '3d') return 'third_person';
  if (intent.genre === 'puzzle') return 'isometric';
  if (intent.genre === 'rpg') return 'top_down';
  return 'side_view';
}

export function pickRuntime(intent: UserIntent): 'ellipse_web_2d' | 'ellipse_photo_3d' {
  if (intent.dimension === '3d' || intent.source_images.length > 0) return 'ellipse_photo_3d';
  return 'ellipse_web_2d';
}

export function buildSummary(title: string, intent: UserIntent): string {
  const mechanics = intent.mechanics.length > 0 ? intent.mechanics.join(', ') : 'movement, challenge, progression';
  const photoClause =
    intent.source_images.length > 0
      ? ' Uses uploaded source imagery as a structural reference for character fidelity.'
      : '';

  return `${title} is a ${intent.dimension.toUpperCase()} ${intent.genre ?? 'action'} game focused on ${mechanics}.${photoClause}`;
}

export function buildStoryHook(title: string, intent: UserIntent): string {
  const tone = intent.genre ?? 'action adventure';
  const sourceClause =
    intent.source_images.length > 0
      ? 'The main hero keeps the structure and identity of the uploaded photo, grounding the story in a recognizable presence.'
      : 'The hero is an original character shaped directly from the project brief.';

  return `${title} is framed as a ${tone} journey. ${sourceClause} The story should justify why the hero enters the first playable space, who opposes them, and what victory means in the first prototype.`;
}

export function pickAssetKind(role: GameProjectAsset['role'], dimension: UserIntent['dimension']): GameProjectAsset['kind'] {
  if (role === 'ui') return 'ui';
  if (role === 'fx') return 'fx';
  if (role === 'environment') return 'environment';
  if (role === 'prop') return 'prop';
  if (dimension === '3d' || role === 'hero' || role === 'boss') return 'model';
  return 'character';
}
