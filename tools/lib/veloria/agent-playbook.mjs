import { HEROES, LEVEL_LADDER, SUPPORTS } from './data.mjs';
import { PROJECT_TITLE } from './constants.mjs';

/**
 * Playbook narratif pour les agents Ellipse — explique la chaîne de prod Veloria
 * comme un briefing qu'un MasterAI peut relire avant d'exécuter un plan.
 */
export function buildAgentPlaybookMarkdown() {
  return `# Veloria — Playbook agents (Veille des Lames)

Ce document explique **comment le jeu a été construit** et ce que chaque agent doit faire pour prolonger la production.

## Vision produit (Producer / Game Design)

**Veloria** est un action-roguelite **mobile vertical** dark fantasy premium :
- 3 voies (lanes), déplacement **gauche/droite** uniquement
- **Auto-attaque** + 3 skills + 1 ultime
- **12 vagues** par run (~3 min), bénédictions entre les paliers
- Méta : gacha, runes, reliques, soutiens, sets d'équipement

**Première tranche jouable livrée** : *Cloître en Ruine* (vagues 1–4, hazard effondrement, héroïne Auréline).

---

## Chaîne de production exécutée

### 1. Références (Art Direction / Asset Direction)
- **12 planches** importées depuis \`01_inputs/references/\`
- Chaque planche verrouille une facette : pitch, hub, héroïnes, gameplay, runes, reliques, soutiens, équipements, environnements
- **Consigne agents** : ne jamais dévier de la palette or / violet / carmin sur fond noir bleuté

### 2. Découpe board → previews (Pipeline / Character Agent)
- **29 assets** extraits par crop déterministe depuis les planches
- Héroïnes, soutiens, ennemis, arènes, hub — chacun dans \`03_assets/.../02_cutouts/\`
- **Consigne Character Agent** : remplacer les previews par spritesheets HD (idle/run/attack) en conservant la silhouette canonique du crop

### 3. Design specs (Narrative / Game Design / Level Design)
- Bible : \`02_design/specs/veloria-concept-bible.md\`
- Rosters JSON : héroïnes, soutiens, ennemis, runes, reliques, sets
- **Consigne Level Agent** : utiliser \`04_scenes/level_01/encounters.json\` comme source de vérité des vagues

### 4. Runtime bundle (Gameplay Programming / Integration)
- \`05_runtime/config/veloria-runtime-bundle.json\` — profil portrait, lanes, roster, méta-systems
- \`04_scenes/level_01/scene-assembly.json\` — assemblage scène + systèmes déclarés
- **Consigne Gameplay Agent** : brancher \`lane_runner\`, \`wave_spawner\`, \`blessing_draft\` sur le GDL (déclarés, preview canvas les simule)

### 5. GDL jouable (Integration / QA)
- \`05_runtime/gdl/veloria.preview.gdl.json\` — scène top-down 720×1280, Auréline, ennemis vagues 1–4, arène ruines
- **Consigne QA Agent** : valider traversabilité des lanes, cap ennemis ≤5, lisibilité mobile

### 6. Preview web (Build / Integration)
- \`07_exports/web/preview.html\` — simulateur lane survival vertical (canvas)
- Ouvrir via \`pnpm dev:stack\` → \`/workspaces/veloria-veille-des-lames/07_exports/web/preview.html\`

---

## Briefs par agent runtime (MasterAI)

| Agent | Mission Veloria |
|-------|-----------------|
| **character** | Spritesheet HD Auréline depuis \`hero__aureline-sacred-lancer\` |
| **decor** | Props cloître : piliers, bannières, autels (\`planches_environnements.png\`) |
| **level** | Étendre layout aux 6 niveaux de \`level-ladder.json\` |
| **gameplay** | Implémenter auto-attaque, skills, draft bénédictions |
| **camera** | Mode \`top_down\` portrait, follow joueur, dead zone étroite |
| **music** | Profil orchestral dark fantasy + tension montante par vague |
| **sfx** | Impacts lame, dash, télégraphe hazard, UI bénédiction |
| **ui** | HUD combat minimal : PV, vague, timer 3 min, 3 skills |
| **qa** | Smoke 30s sur preview + validate GDL |
| **integration** | Export HTML5 + PWA portrait |

---

## Roster héroïnes (pour Character / Narrative)

${HEROES.map((h) => `- **${h.display_title}** — ${h.role_text} (${h.weapon})`).join('\n')}

## Soutiens équipables

${SUPPORTS.map((s) => `- **${s.display_title}** — ${s.trigger}`).join('\n')}

## Échelle des niveaux

${LEVEL_LADDER.map((l, i) => `${i + 1}. **${l.title}** — ${l.hazard}`).join('\n')}

---

## Prochaine itération suggérée (prompt MasterAI)

> Enrichir Veloria niveau 1 : vagues 5–12, boss Bourreau phase 3, draft bénédictions après vagues 3/6/9, sfx combat et musique tension. Conserver lane runner 3 voies et palette premium.
`;
}

export function buildAgentWorkOrders() {
  const now = new Date().toISOString();
  return {
    project: PROJECT_TITLE,
    generated_at: now,
    philosophy:
      'Chaque work order explique au sous-agent POURQUOI la tâche existe dans la fabrique Veloria.',
    orders: [
      {
        agent: 'producer',
        title: 'Verrouiller la tranche verticale slice',
        why: 'Veloria est portrait-first ; toute feature doit tenir en 3 lanes et 3 minutes.',
        deliverables: ['Scope vagues 1-12', 'Checklist mobile 60fps'],
      },
      {
        agent: 'art_direction',
        title: 'Verrou stylistique board-derived',
        why: 'Les 12 planches sont la vérité visuelle ; les crops ne sont que des proxies.',
        deliverables: ['Palette or-violet-carmin', 'Rejet des dérives anime/cyber'],
      },
      {
        agent: 'character',
        title: 'Spritesheet Auréline production',
        why: 'La héroïne par défaut du slice est Auréline — Lancière Sacrée.',
        deliverables: ['idle/run/attack 4 frames', 'Silhouette lance visible à 32px'],
        input: { hero_key: 'aureline', pack: 'hero__aureline-sacred-lancer' },
      },
      {
        agent: 'level',
        title: 'Arène Cloître + ladder 6 niveaux',
        why: 'Chaque niveau a 1 hazard unique et 1 ennemi signature.',
        deliverables: ['layout.json par niveau', 'encounters.json 12 vagues'],
      },
      {
        agent: 'gameplay',
        title: 'Boucle lane survival',
        why: 'Gameplay = gauche/droite + auto-attaque + draft entre vagues.',
        deliverables: ['lane_runner', 'wave_spawner', 'blessing_draft patches GDL'],
      },
      {
        agent: 'integration',
        title: 'Export jouable HTML5 portrait',
        why: 'Livraison locale web + PWA mobile sans infra cloud.',
        deliverables: ['preview.html', 'manifest PWA', 'gdl.json'],
      },
    ],
  };
}
