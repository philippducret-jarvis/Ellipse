/**
 * GDL — validation pragmatique + valeurs par défaut.
 * Contrat formel : schemas/gdl-1.0.schema.json. Ici : vérifs structurelles
 * rapides (sans dépendance) + normalisation, pour échouer TÔT et clair.
 */

const DEFAULTS = {
  sidescroller: {
    world: { viewport: { w: 1280, h: 720 }, gravity: 2600, floorY: 0.82 },
    heroStats: { hp: 5, speed: 400, jump: 980, damage: 1, attackRange: 120, attackCooldown: 0.45, invuln: 1.0 },
  },
  'vertical-arena': {
    world: { viewport: { w: 720, h: 1280 }, lanes: 3 },
    heroStats: { hp: 6, speed: 520, damage: 1, attackRange: 160, attackCooldown: 0.4, invuln: 0.8 },
  },
};

export function validateGdl(gdl) {
  const errors = [];
  const req = (cond, msg) => { if (!cond) errors.push(msg); };
  req(gdl.gdl === '1.0', `gdl: version attendue "1.0", reçu "${gdl.gdl}"`);
  req(/^[a-z0-9-]+$/.test(gdl.id ?? ''), 'id: kebab-case requis');
  req(typeof gdl.title === 'string' && gdl.title.length > 0, 'title requis');
  req(['sidescroller', 'vertical-arena'].includes(gdl.genre), `genre inconnu: ${gdl.genre}`);
  req(gdl.entities && typeof gdl.entities === 'object', 'entities requis');
  const heroes = Object.values(gdl.entities ?? {}).filter((e) => e.role === 'hero');
  req(heroes.length === 1, `exactement 1 héros requis (trouvé ${heroes.length})`);
  for (const [id, e] of Object.entries(gdl.entities ?? {})) {
    req(e.rig, `entities.${id}.rig requis`);
    req(e.stats && typeof e.stats.hp === 'number', `entities.${id}.stats.hp requis`);
  }
  req(Array.isArray(gdl.levels) && gdl.levels.length >= 1, 'au moins 1 niveau requis');
  for (const lvl of gdl.levels ?? []) {
    req(lvl.arena, `levels.${lvl.id}: arena requis`);
    for (const s of lvl.spawns ?? []) req(gdl.entities?.[s.entity], `levels.${lvl.id}: spawn d'entité inconnue "${s.entity}"`);
  }
  if (errors.length) throw new Error(`GDL invalide :\n  - ${errors.join('\n  - ')}`);
  return true;
}

export function withDefaults(gdl) {
  const d = DEFAULTS[gdl.genre] ?? DEFAULTS.sidescroller;
  const out = {
    seed: 1, palette: [], ui: { hud: ['hearts', 'score', 'progress'], accent: '#e8c05a' }, meta: {},
    ...gdl,
    world: { ...d.world, ...gdl.world, viewport: { ...d.world.viewport, ...(gdl.world?.viewport ?? {}) } },
  };
  for (const e of Object.values(out.entities)) {
    if (e.role === 'hero') e.stats = { ...d.heroStats, ...e.stats };
    e.scale = e.scale ?? (e.role === 'hero' ? 0.24 : 0.2);
  }
  return out;
}
