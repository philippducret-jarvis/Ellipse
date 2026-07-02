import { readStaticText } from './io.mjs';

export function gdlPathForWorkspace(projectSlug, relativePath) {
  return `/workspaces/${projectSlug}/${relativePath.replaceAll('\\', '/')}`;
}

export function buildPreviewGdl({ project, layout, copiedRefs }) {
  return {
    meta: {
      title: project.title,
      dimension: '2d',
      resolution: [1280, 720],
      version: '0.2.0',
    },
    style: {
      mood: 'fungal dark fantasy',
      palette: ['#16131f', '#35243f', '#5a3a72', '#9e4f5c', '#5ec7ef', '#f0d9a6'],
      reference_assets: copiedRefs.map((entry) => entry.url),
    },
    systems: ['input', 'platformer_physics', 'tile_collision', 'animation', 'camera_follow', 'ui'],
    entities: [
      {
        id: 'player',
        type: 'character',
        assets: {
          sprite: gdlPathForWorkspace(project.slug, '01_inputs/references/hero_echo_front.png'),
          frame_count: 1,
          animations: {
            idle: { frames: [0], fps: 1 },
            run: { frames: [0], fps: 1 },
          },
        },
        components: [
          { transform: { x: layout.spawn.x, y: layout.spawn.y, scale: 1 } },
          { physics: { body: 'dynamic', gravity: 980, friction: 0.1 } },
          { platformer_controller: { move_speed: 230, jump_force: 430, coyote_time_ms: 100 } },
          { health: { max: 3, current: 3 } },
        ],
      },
    ],
    scenes: [
      {
        id: 'level_01',
        entities: ['player'],
        background: {
          color: '#120f18',
          image: gdlPathForWorkspace(project.slug, '01_inputs/references/level_test_01_board.png'),
          alpha: 0.62,
        },
        layout,
        spawn: layout.spawn,
      },
    ],
    ui: {
      hud: [
        { type: 'health_bar', bind: 'player.health' },
        { type: 'score', position: 'top-right' },
      ],
    },
  };
}

export async function buildPreviewFiles({ title }) {
  const [html, css, js] = await Promise.all([
    readStaticText('preview', 'template.html'),
    readStaticText('preview', 'template.css'),
    readStaticText('preview', 'template.js'),
  ]);

  return {
    html: html.replaceAll('__TITLE__', title),
    css,
    js,
  };
}
