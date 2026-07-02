/**
 * Catalogue normatif des sous-agents Ellipse — ORDRE-002
 * Source unique : registry, manifest Cortex, Studio, planification.
 */
export type AgentDomain = 'visual' | 'visual_3d' | 'world' | 'design' | 'audio' | 'quality';
export type AgentStatus = 'active' | 'stub';

export const DOMAIN_LABELS: Record<AgentDomain, string> = {
  visual: 'Visuel 2D',
  visual_3d: 'Visuel 3D',
  world: 'Monde & niveau',
  design: 'Game design',
  audio: 'Audio',
  quality: 'Qualité & export',
};

export const AGENT_CATALOG = [
  {
    id: 'character',
    name: 'Le Héros',
    icon: '🦸',
    domain: 'visual',
    role: 'Sprites personnage — photo → spritesheet',
    phase: 1,
    status: 'active',
    workLabel: 'Personnage jouable',
    capabilities: [
      'Lot 0 : extraction éléments visuels (tête, torse, base, accents)',
      'Photo → spritesheet 4 frames + recouvrement layers',
      'Héros procédural SVG si aucune photo',
      'Extraction palette + manifest lot0_manifest.json',
      'Patches GDL sprite, layers, base_sprite, palette',
      'Détection ComfyUI pour Phase 2',
    ],
    outputs: [
      'player_sheet.png',
      'player_layered_sheet.png',
      'element_*.png',
      'lot0_manifest.json',
      'GDL /entities/0/assets/sprite + layers',
    ],
    triggers: ['Toujours inclus dans le plan'],
  },
  {
    id: 'decor',
    name: 'Le Décorateur',
    icon: '🌄',
    domain: 'visual',
    role: 'Props, tilesets, arrière-plans 2D',
    phase: 1,
    status: 'active',
    workLabel: 'Décors & arrière-plans',
    capabilities: [
      'Tileset 4 tuiles généré (sharp)',
      'Fond 1280×720 aligné palette',
      'Style extrait depuis photo référence',
      'Parallax et tileset en GDL scène',
    ],
    outputs: ['decor_tileset.png', 'background.png', 'GDL /scenes/0/background'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'animation',
    name: 'Le Mouvement',
    icon: '🏃',
    domain: 'visual',
    role: 'Animations idle, walk, run, jump — state machines',
    phase: 1,
    status: 'active',
    workLabel: 'Animations personnage',
    capabilities: [
      'Animations Lot 0 synchronisées au spritesheet extrait',
      'Presets idle, run, jump, attack',
      'Machine à états (move, stop, jump)',
      'Frames + layer_bindings depuis manifest Lot 0',
      'Patch GDL assets/animations + animation_state + frame_count',
    ],
    outputs: ['GDL animations + state machine + animation_lot0'],
    triggers: ['Photo héros uploadée'],
  },
  {
    id: 'level',
    name: "L'Architecte",
    icon: '🏗️',
    domain: 'world',
    role: 'Layout niveau, collisions, spawns, parallax',
    phase: 1,
    status: 'active',
    workLabel: 'Niveau & plateformes',
    capabilities: [
      'Layout procédural par genre (platformer, runner, RPG)',
      'Plateformes, spawn, collectibles, goal',
      'Export JSON level_01 sur disque',
      'Patch GDL scène layout + spawn',
    ],
    outputs: ['level_01.json', 'GDL /scenes/0/layout'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'mesh_3d',
    name: 'Le Sculpteur',
    icon: '🗿',
    domain: 'visual_3d',
    role: 'Modèles 3D, mesh photo→3D, glTF',
    phase: 2,
    status: 'active',
    workLabel: 'Modèle 3D héros',
    capabilities: [
      'Lot 0 : mesh billboard texturé depuis photo (glTF)',
      'Texture hero_texture.png extraite de l\'image',
      'Lecture manifest Lot 0 si déjà généré',
      'Stub glTF si aucune photo',
      'Prêt pour weights TripoSR locaux (Phase 2)',
    ],
    outputs: ['hero.glb', 'hero_texture.png', 'GDL /entities/0/assets/model'],
    triggers: ['Prompt ou intent « 3D »'],
  },
  {
    id: 'lighting',
    name: "L'Éclairagiste",
    icon: '💡',
    domain: 'visual_3d',
    role: 'Éclairage scène 3D, ambient, ombres',
    phase: 2,
    status: 'active',
    workLabel: 'Éclairage 3D',
    capabilities: [
      'Presets ambient + directional par mood/genre',
      'Ombres et time_of_day configurables',
      'Patch GDL /scenes/0/lighting',
    ],
    outputs: ['GDL lighting'],
    triggers: ['Jeu 3D activé'],
  },
  {
    id: 'camera',
    name: 'Le Cadreur',
    icon: '🎬',
    domain: 'world',
    role: 'Caméra follow, bounds, cinématiques',
    phase: 1,
    status: 'active',
    workLabel: 'Caméra & cadrage',
    capabilities: [
      'Modes side_scroll et third_person',
      'Follow joueur, bounds, dead zone',
      'Intro pan si prompt cinématique',
      'Patch GDL /scenes/0/camera',
    ],
    outputs: ['GDL camera'],
    triggers: ['3D ou feature cinématique'],
  },
  {
    id: 'gameplay',
    name: 'Le Game Designer',
    icon: '🎮',
    domain: 'design',
    role: 'Mécaniques, systems, triggers GDL',
    phase: 1,
    status: 'active',
    workLabel: 'Mécaniques de jeu',
    capabilities: [
      'Templates 5 genres (platformer, runner, puzzle, RPG, fighting)',
      'Merge non-destructif — préserve sprite généré',
      'Mécaniques Cortex : double saut, collect, ennemis, dash…',
      'Systems, entités, scènes, UI de base',
    ],
    outputs: ['GDL systems, entities, scenes'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'narrative',
    name: 'Le Conteur',
    icon: '📖',
    domain: 'design',
    role: 'Histoire, dialogues, quêtes, branching',
    phase: 1,
    status: 'active',
    workLabel: 'Histoire & quêtes',
    capabilities: [
      'Intro et dialogues procéduraux par genre',
      'Quêtes principales + secondaires (RPG)',
      'Branching narratif configurable',
      'Patch GDL /narrative',
    ],
    outputs: ['GDL narrative (quests, dialogues)'],
    triggers: ['RPG, fighting, mots-clés histoire/dialogue'],
  },
  {
    id: 'music',
    name: 'Le Musicien',
    icon: '🎵',
    domain: 'audio',
    role: 'Musique BGM, ambiance adaptive',
    phase: 2,
    status: 'active',
    workLabel: 'Musique de fond',
    capabilities: [
      'BGM loop WAV procédural (4 notes)',
      'Fichier bgm_loop.wav sur disque',
      'Mood aligné genre + loop adaptive RPG',
      'Patch GDL /audio/bgm',
    ],
    outputs: ['bgm_loop.wav', 'GDL audio/bgm'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'sfx',
    name: "L'Effeteur",
    icon: '🔊',
    domain: 'audio',
    role: 'Effets sonores gameplay (jump, hit, collect)',
    phase: 1,
    status: 'active',
    workLabel: 'Effets sonores',
    capabilities: [
      'SFX WAV procéduraux par event (jump, collect, hit, footstep)',
      'Mapping GDL audio/sfx → URLs générées',
      'Presets fréquence/durée par type',
    ],
    outputs: ['sfx_*.wav', 'GDL audio/sfx'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'ui',
    name: "L'Interface",
    icon: '🖥️',
    domain: 'design',
    role: 'HUD, menus, typographie',
    phase: 1,
    status: 'active',
    workLabel: 'Interface & HUD',
    capabilities: [
      'Barres vie, score, journal quêtes (RPG)',
      'Menus pause et restart',
      'Thème typo par genre (serif RPG / system-ui)',
      'Patch GDL /ui complet',
    ],
    outputs: ['GDL ui (hud, menu, theme)'],
    triggers: ['Toujours inclus'],
  },
  {
    id: 'vfx',
    name: "L'Illusionniste",
    icon: '✨',
    domain: 'visual',
    role: 'Particules, juice, feedback visuel',
    phase: 1,
    status: 'active',
    workLabel: 'Particules & juice',
    capabilities: [
      'Presets jump_dust, collect_spark, hit_flash, land_dust',
      'Bindings events gameplay → effets',
      'Patch GDL /vfx + event_bindings',
    ],
    outputs: ['GDL vfx'],
    triggers: ['Mots-clés particules/effets ou mécanique dash'],
  },
  {
    id: 'qa',
    name: 'Le Testeur',
    icon: '✅',
    domain: 'quality',
    role: 'Validation GDL, smoke test, playability',
    phase: 1,
    status: 'active',
    workLabel: 'Contrôle qualité',
    capabilities: [
      'Validation GDL réelle (entités, scènes, sprite)',
      'Smoke test simulé (systems, spawn)',
      'Échec explicite si GDL invalide',
      'Warnings placeholder / joueur absent',
    ],
    outputs: ['Rapport QA (agent_notes)'],
    triggers: ['Toujours en fin de pipeline'],
  },
  {
    id: 'integration',
    name: "L'Assembleur",
    icon: '🔗',
    domain: 'quality',
    role: 'Assemblage final, export, cohérence refs',
    phase: 1,
    status: 'active',
    workLabel: 'Assemblage & export',
    capabilities: [
      'Vérification refs /generated/ sur disque',
      'Métadonnées export web_preview',
      'Version GDL 1.0.0 + timestamp build',
      'Statut ready ou partial si refs manquantes',
    ],
    outputs: ['GDL /export', 'GDL /meta/version'],
    triggers: ['Après QA — dernière étape'],
  },
] as const;

export type AgentCatalogEntry = (typeof AGENT_CATALOG)[number];
export type AgentType = AgentCatalogEntry['id'];

export const AGENT_IDS = AGENT_CATALOG.map((a) => a.id) as unknown as [
  AgentType,
  ...AgentType[],
];

/** Tous les travaux proposables (libellés utilisateur). */
export const WORK_OFFERINGS = AGENT_CATALOG.map((a) => ({
  id: a.id,
  label: a.workLabel,
  icon: a.icon,
  domain: a.domain,
  domainLabel: DOMAIN_LABELS[a.domain],
}));

export function getAgentCatalogEntry(id: string): AgentCatalogEntry | undefined {
  return AGENT_CATALOG.find((a) => a.id === id);
}

export function agentsByDomain(domain: AgentDomain): AgentCatalogEntry[] {
  return AGENT_CATALOG.filter((a) => a.domain === domain);
}

export function getDomainOrder(): AgentDomain[] {
  return ['visual', 'visual_3d', 'world', 'design', 'audio', 'quality'];
}
