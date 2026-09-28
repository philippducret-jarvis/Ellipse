const SLUG = 'echoes-of-the-mushroom-realm';
const ASSET_ROOT = `/workspaces/${SLUG}/03_assets/faithful`;
const AUDIO_ROOT = `/workspaces/${SLUG}/03_assets/audio`;

export const ECHOES_RUNTIME_MODE = 'echoes_engine_pixi';
export const ECHOES_WORLD = Object.freeze({ width: 4096, height: 720, groundY: 632 });

/**
 * Gameplay map authored against the clean strip from tutorial_overview_board.
 * The board reads right-to-left: departure, weapon trial, battlefield, ruins,
 * guardian below the Origin Tree, then the restored refuge.
 */
export function buildEchoesLayout() {
  return {
    width: ECHOES_WORLD.width,
    height: ECHOES_WORLD.height,
    ground_y: ECHOES_WORLD.groundY,
    direction: 'right_to_left',
    spawn: { x: 3880, y: 560 },
    platforms: [
      { x: 0, y: 632, w: 4096, h: 88, type: 'ground' },
      { x: 340, y: 548, w: 228, h: 22, type: 'platform' },
      { x: 735, y: 536, w: 256, h: 22, type: 'platform' },
      { x: 980, y: 472, w: 226, h: 22, type: 'platform' },
      { x: 1250, y: 414, w: 198, h: 22, type: 'platform' },
      { x: 1730, y: 548, w: 264, h: 22, type: 'platform' },
      { x: 2130, y: 510, w: 284, h: 22, type: 'platform' },
      { x: 2760, y: 532, w: 186, h: 20, type: 'altar' },
      { x: 3050, y: 532, w: 186, h: 20, type: 'altar' },
      { x: 3500, y: 560, w: 210, h: 20, type: 'platform' },
    ],
    collectibles: [
      { x: 3650, y: 554, type: 'spore' },
      { x: 3260, y: 520, type: 'memory_shard' },
      { x: 3138, y: 500, type: 'weapon_echo' },
      { x: 2848, y: 500, type: 'weapon_echo' },
      { x: 2450, y: 538, type: 'spore' },
      { x: 2070, y: 480, type: 'memory_shard' },
      { x: 1540, y: 528, type: 'spore' },
      { x: 820, y: 506, type: 'root_essence' },
      { x: 230, y: 538, type: 'checkpoint_seed' },
    ],
    checkpoints: [
      { id: 'departure_gate', x: 3840, y: 556, label: 'Départ' },
      { id: 'weapon_trial', x: 3230, y: 540, label: 'Éveil des armes' },
      { id: 'battlefield', x: 2260, y: 540, label: 'Champ de bataille' },
      { id: 'ruins', x: 1320, y: 532, label: 'Descente dans les ruines' },
      { id: 'origin_tree', x: 620, y: 540, label: 'Arbre-Originel' },
    ],
    hazards: [
      { x: 3310, y: 614, w: 92, h: 18, kind: 'spore_spikes' },
      { x: 2590, y: 614, w: 118, h: 18, kind: 'grave_pikes' },
      { x: 1880, y: 614, w: 152, h: 18, kind: 'root_spikes' },
      { x: 1210, y: 614, w: 106, h: 18, kind: 'toxic_spore_bloom' },
    ],
    enemies: [
      { x: 3440, y: 590, kind: 'sporeling', patrol: 95, speed: 64 },
      { x: 2650, y: 590, kind: 'sporeling', patrol: 90, speed: 70 },
      { x: 2410, y: 590, kind: 'rampore', patrol: 125, speed: 76 },
      { x: 2140, y: 470, kind: 'porteur_sporeal', patrol: 100, speed: 54 },
      { x: 1740, y: 590, kind: 'sporeling', patrol: 88, speed: 72 },
      { x: 1260, y: 590, kind: 'chevalier_fongique', patrol: 118, speed: 58 },
      { x: 1030, y: 590, kind: 'moussu_furieux', patrol: 104, speed: 52 },
      { x: 720, y: 560, kind: 'root_guardian_boss', patrol: 145, speed: 36, hp: 30, boss: true },
    ],
    zones: [
      { id: 'departure', label: 'Départ', x: 3500, y: 0, w: 596, h: 720, theme: 'departure_gate' },
      { id: 'weapon_trial', label: 'Éveil des armes', x: 2700, y: 0, w: 800, h: 720, theme: 'weapon_trial' },
      { id: 'battlefield', label: 'Champ de bataille', x: 1700, y: 0, w: 1000, h: 720, theme: 'battlefield' },
      { id: 'ruins', label: 'Descente dans les ruines', x: 900, y: 0, w: 800, h: 720, theme: 'ruins' },
      { id: 'boss_arena', label: 'Gardien des Racines', x: 300, y: 0, w: 600, h: 720, theme: 'origin_tree' },
      { id: 'echo_refuge', label: 'Refuge des Échos', x: 0, y: 0, w: 300, h: 720, theme: 'afterglow' },
    ],
    goal: { x: 92, y: 548, w: 64, h: 84, kind: 'exit_gate', unlock_flag: 'guardian_defeated' },
  };
}

export function buildEchoesGdl() {
  const layout = buildEchoesLayout();
  const atlas = {
    menu_keyart: `${ASSET_ROOT}/menu_keyart.jpeg`,
    world_map: `${ASSET_ROOT}/world_map_board.png`,
    boss_reference: `${ASSET_ROOT}/boss_guardian_board.png`,
    echoes_background: `${ASSET_ROOT}/playfield.png`,
    level_01_background: `${ASSET_ROOT}/playfield.png`,
    echoes_hero: `${ASSET_ROOT}/hero.png`,
    hero: `${ASSET_ROOT}/hero.png`,
    sporeling: `${ASSET_ROOT}/enemy_sporeling.png`,
    rampore: `${ASSET_ROOT}/enemy_rampore.png`,
    porteur_sporeal: `${ASSET_ROOT}/enemy_porteur_sporeal.png`,
    chevalier_fongique: `${ASSET_ROOT}/enemy_chevalier_fongique.png`,
    moussu_furieux: `${ASSET_ROOT}/enemy_moussu_furieux.png`,
    root_guardian_boss: `${ASSET_ROOT}/boss_root_guardian.png`,
    boss_phase_1: `${ASSET_ROOT}/boss_root_guardian.png`,
    boss_phase_2: `${ASSET_ROOT}/boss_root_guardian.png`,
    boss_phase_3: `${ASSET_ROOT}/boss_root_guardian.png`,
    platform_ground: `${ASSET_ROOT}/platform_ground.png`,
    platform_float: `${ASSET_ROOT}/platform_float.png`,
    platform_altar: `${ASSET_ROOT}/platform_altar.png`,
  };

  return {
    meta: {
      title: 'Echoes of the Mushroom Realm',
      dimension: '2.5d',
      resolution: [1280, 720],
      version: '1.0.0',
      runtime: ECHOES_RUNTIME_MODE,
      asset_atlas: atlas,
      echoes: {
        direction: 'right_to_left',
        hero: 'L’Écho',
        level: 'Arbre-Originel',
        weapons: ['longsword', 'spore_hammer'],
        boss: 'Gardien des Racines',
        boss_phases: [
          { id: 'phase_1', threshold: 0.7, pattern: 'fouet_racinaire' },
          { id: 'phase_2', threshold: 0.3, pattern: 'invocation_fongique' },
          { id: 'phase_3', threshold: 0, pattern: 'racines_du_reseau' },
        ],
      },
    },
    style: {
      mood: 'fungal dark fantasy',
      palette: ['#09070d', '#16131f', '#4a2a6b', '#8b4bb8', '#54d8e6', '#f0d9a6', '#2b6b5c'],
      reference_assets: [
        `/workspaces/${SLUG}/01_inputs/references/menu_keyart.jpeg`,
        `/workspaces/${SLUG}/01_inputs/references/tutorial_overview_board.png`,
        `/workspaces/${SLUG}/01_inputs/references/hero_echo_front.png`,
        `/workspaces/${SLUG}/01_inputs/references/enemy_family_board.png`,
        `/workspaces/${SLUG}/01_inputs/references/sporeling_detail_board.png`,
        `/workspaces/${SLUG}/01_inputs/references/boss_guardian_board.png`,
      ],
    },
    systems: [
      'input',
      'echoes_platformer',
      'fixed_step_simulation',
      'platformer_physics',
      'camera_follow',
      'enemy_ai',
      'melee_combat',
      'weapon_choice',
      'boss_phases',
      'checkpoints',
      'touch_controls',
      'gamepad',
    ],
    entities: [
      {
        id: 'player',
        type: 'character',
        name: 'L’Écho',
        assets: { sprite: atlas.echoes_hero, frame_count: 1 },
        depth: { plane: 'ground', feet_offset: 0.92 },
        components: [
          { transform: { x: layout.spawn.x, y: layout.spawn.y, scale: 1 } },
          { physics: { body: 'dynamic', gravity: 1650, friction: 0.1 } },
          { platformer_controller: { move_speed: 265, jump_force: 620, coyote_time_ms: 100 } },
          { health: { max: 5, current: 5 } },
          { combat: { damage: 1, attack_speed: 1, range: 92 } },
        ],
      },
    ],
    scenes: [
      {
        id: 'level_01_origin_tree',
        title: 'Niveau 01 — Arbre-Originel',
        entities: ['player'],
        camera: { mode: 'follow_horizontal', follow: 'player', bounds: true, smoothing: 1 },
        background: {
          color: '#05070a',
          mode: 'board_locked_panorama',
          image: atlas.echoes_background,
          layers: [
            { id: 'playfield', image: atlas.echoes_background, scroll_factor: 1, repeat: 'none', sort_group: 'world' },
          ],
        },
        depth: { mode: 'side_scroll', sort_key: 'feet_y', ground_y: layout.ground_y, feet_offset: 0.92 },
        layout,
        spawn: layout.spawn,
      },
    ],
    ui: {
      hud: [
        { type: 'health_bar', bind: 'player.health' },
        { type: 'objective', bind: 'world.active_zone' },
        { type: 'boss_bar', bind: 'root_guardian_boss.health' },
      ],
    },
    narrative: {
      intro: 'L’Écho s’éveille à la porte de l’Arbre-Originel. Traversez le Réseau, choisissez une seule arme et libérez le refuge.',
      quests: [
        {
          id: 'origin_tree_echo',
          title: 'L’Arbre-Originel',
          status: 'active',
          objective: 'Rejoindre l’Arbre-Originel, choisir une arme et vaincre le Gardien des Racines.',
        },
      ],
      dialogues: [],
      npc_routines: [],
    },
    audio: {
      bgm: `${AUDIO_ROOT}/bgm_loop.wav`,
      sfx: {
        attack: `${AUDIO_ROOT}/sfx_hit.wav`,
        hit: `${AUDIO_ROOT}/sfx_hit.wav`,
        hurt: `${AUDIO_ROOT}/sfx_hit.wav`,
        jump: `${AUDIO_ROOT}/sfx_jump.wav`,
        collect: `${AUDIO_ROOT}/sfx_collect.wav`,
        checkpoint: `${AUDIO_ROOT}/sfx_collect.wav`,
        boss_attack: `${AUDIO_ROOT}/sfx_hit.wav`,
      },
    },
  };
}
