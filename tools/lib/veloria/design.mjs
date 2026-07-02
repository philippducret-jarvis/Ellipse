import { join } from 'node:path';
import {
  BOSSES,
  ENEMIES,
  EQUIPMENT_SETS,
  HEROES,
  LEVEL_LADDER,
  PREP_MANIFEST,
  PRODUCTION_RULES,
  RELICS,
  RUNES,
  SUPPORTS,
  SUMMONS,
} from './data.mjs';
import { DESIGN_ROOT, OPS_ROOT } from './constants.mjs';
import { writeJson, writeText } from './io.mjs';

function toMarkdownList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

export async function buildDesignSpecs() {
  const conceptBible = `# Veloria — Concept Bible

## Positionnement
Veloria est un action-roguelite mobile **vertical**, premium, dark fantasy, pensé pour des runs courtes de trois minutes. Le jeu vise la lisibilité maximale: une héroïne à l'écran, trois lanes, peu d'ennemis simultanés, un seul hazard fort par arène.

## Boucle coeur
1. Choisir une héroïne.
2. Entrer en run sur une arène compacte.
3. Survivre à 12 vagues avec déplacement gauche / droite.
4. Choisir une bénédiction après les paliers de vague.
5. Affronter un élite puis un boss lisible.
6. Récupérer ressources, reliques, runes et progression de compte.

## Axes de direction
- Fantasy classique sombre, élégante, premium.
- Contrastes or / ivoire / violet / carmin sur fond noir bleuté.
- Silhouettes lisibles à distance, VFX clairs, UI légère.
- Hub circulaire compact et modulaire.
- Production mobile-first: 3 lanes, 3 à 5 ennemis, arènes courtes, props réutilisables.

## Roster jouable
${HEROES.map((hero) => `- **${hero.display_title}** — ${hero.role_text}, ${hero.weapon}`).join('\n')}

## Soutiens
${SUPPORTS.map((support) => `- **${support.display_title}** — déclencheur: ${support.trigger}`).join('\n')}

## Ennemis et boss
${ENEMIES.map((enemy) => `- **${enemy.display_title}** — ${enemy.role_text}`).concat(BOSSES.map((boss) => `- **${boss.display_title}** — ${boss.role_text}`)).join('\n')}

## Niveaux
${LEVEL_LADDER.map((level) => `- **${level.title}** — hazard: ${level.hazard}, ennemi principal: ${level.enemy}`).join('\n')}

## Règles de production
${toMarkdownList(PRODUCTION_RULES.pillars)}
`;

  await writeText(join(DESIGN_ROOT, 'veloria-concept-bible.md'), conceptBible);
  await writeJson(join(DESIGN_ROOT, 'hero-roster.json'), HEROES);
  await writeJson(join(DESIGN_ROOT, 'support-roster.json'), SUPPORTS);
  await writeJson(join(DESIGN_ROOT, 'enemy-roster.json'), { enemies: ENEMIES, bosses: BOSSES });
  await writeJson(join(DESIGN_ROOT, 'environment-ladder.json'), LEVEL_LADDER);
  await writeJson(join(DESIGN_ROOT, 'runes-catalog.json'), RUNES);
  await writeJson(join(DESIGN_ROOT, 'relics-catalog.json'), RELICS);
  await writeJson(join(DESIGN_ROOT, 'summons-catalog.json'), SUMMONS);
  await writeJson(join(DESIGN_ROOT, 'equipment-sets.json'), EQUIPMENT_SETS);
  await writeJson(join(DESIGN_ROOT, 'production-rules.json'), PRODUCTION_RULES);
  await writeJson(join(OPS_ROOT, 'veloria-prep-manifest.json'), PREP_MANIFEST);

  return {
    design_files: [
      'veloria-concept-bible.md',
      'hero-roster.json',
      'support-roster.json',
      'enemy-roster.json',
      'environment-ladder.json',
      'runes-catalog.json',
      'relics-catalog.json',
      'summons-catalog.json',
      'equipment-sets.json',
      'production-rules.json',
    ],
  };
}
