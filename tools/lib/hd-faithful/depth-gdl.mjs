/**
 * Helpers GDL depth/parallax — Echoes, Veloria, agents Level/Decor.
 */

const ECHOES_INTEGRATED_BASE = '/workspaces/echoes-of-the-mushroom-realm/03_assets/integrated/scene';

/** Couches parallax Echoes (side-scroll 2304×720). */
export function buildEchoesParallaxLayers(integratedManifest) {
  const layers = integratedManifest?.scene?.layers;
  if (layers) {
    return [
      layers.far && { id: 'far', image: layers.far.asset, scroll_factor: layers.far.parallax ?? 0.18, sort_group: 'background' },
      layers.mid && { id: 'mid', image: layers.mid.asset, scroll_factor: layers.mid.parallax ?? 0.42, sort_group: 'background' },
      layers.playfield && { id: 'playfield', image: layers.playfield.asset, scroll_factor: 1, repeat: 'none', sort_group: 'world' },
      layers.foreground && { id: 'foreground', image: layers.foreground.asset, scroll_factor: 1.12, alpha: 0.92, sort_group: 'foreground' },
    ].filter(Boolean);
  }
  return [
    { id: 'far', image: `${ECHOES_INTEGRATED_BASE}/parallax_far.png`, scroll_factor: 0.18, sort_group: 'background' },
    { id: 'mid', image: `${ECHOES_INTEGRATED_BASE}/parallax_mid.png`, scroll_factor: 0.42, sort_group: 'background' },
    { id: 'playfield', image: `${ECHOES_INTEGRATED_BASE}/playfield.png`, scroll_factor: 1, sort_group: 'world' },
    { id: 'foreground', image: `${ECHOES_INTEGRATED_BASE}/foreground_glow.png`, scroll_factor: 1.12, alpha: 0.92, sort_group: 'foreground' },
  ];
}

export function buildEchoesDepthSpec(layout) {
  return {
    mode: 'side_scroll',
    sort_key: 'feet_y',
    ground_y: layout.ground_y ?? layout.world_size?.height ?? 720,
    feet_offset: 0.92,
  };
}

export function buildEchoesCameraSpec() {
  return { mode: 'follow_horizontal', bounds: 'clamp', smoothing: 1 };
}

/** Scène GDL Echoes avec profondeur complète. */
export function buildEchoesSceneGdl(layout, integratedManifest) {
  return {
    id: 'level_01',
    entities: ['player'],
    background: {
      color: '#120f18',
      mode: 'integrated_panorama',
      layers: buildEchoesParallaxLayers(integratedManifest),
    },
    depth: buildEchoesDepthSpec(layout),
    camera: buildEchoesCameraSpec(),
    layout: {
      width: layout.world_size?.width ?? layout.width,
      height: layout.world_size?.height ?? layout.height,
      ground_y: layout.ground_y,
      spawn: layout.spawn,
      platforms: layout.platforms.map(({ x, y, w, h, type }) => ({ x, y, w, h, type })),
      collectibles: layout.collectibles,
      checkpoints: (layout.checkpoints ?? []).map(({ x, y, label }) => ({ x, y, label })),
      hazards: (layout.hazards ?? []).map(({ x, y, w, h, kind }) => ({ x, y, w, h, kind })),
      enemies: (layout.enemies ?? []).map(({ x, y, kind, patrol, speed }) => ({ x, y, kind, patrol, speed })),
      zones: (layout.zones ?? []).map(({ id, label, x, y, w, h, theme }) => ({ id, label, x, y, w, h, theme })),
      goal: layout.goal ? { x: layout.goal.x, y: layout.goal.y } : undefined,
    },
    spawn: layout.spawn,
  };
}

/** Couches Veloria — arène intégrée fixe + HUD scroll 0. */
export function buildVeloriaArenaBackground(integratedManifest, fallbackImage) {
  const arena = integratedManifest?.scene?.combat_arena?.asset;
  const image = arena ?? fallbackImage;
  return {
    color: '#07060a',
    mode: 'integrated_arena',
    layers: [{ id: 'arena', image, scroll_factor: 0, sort_group: 'world' }],
  };
}

export function buildVeloriaDepthSpec(layout) {
  return {
    mode: 'lane_perspective',
    sort_key: 'feet_y',
    horizon_y: 110,
    ground_y: layout.ground_y ?? 973,
    scale_range: [0.5, 1.12],
    feet_offset: 0.92,
    lane_parallax_shift: 22,
  };
}

export function buildVeloriaCameraSpec() {
  return { mode: 'top_down', follow: 'player', bounds: true, smoothing: 0.14 };
}

/** Patch scène Veloria existante avec depth + background layers. */
export function patchVeloriaSceneDepth(scene, integratedManifest) {
  return {
    ...scene,
    background: buildVeloriaArenaBackground(integratedManifest, scene.background?.image),
    depth: scene.depth ?? buildVeloriaDepthSpec(scene.layout ?? {}),
    camera: scene.camera ?? buildVeloriaCameraSpec(),
  };
}
