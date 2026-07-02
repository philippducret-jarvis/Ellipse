export interface NarrativePack {
  intro: string;
  quests: { id: string; title: string; status: string; objective: string }[];
  dialogues: { id: string; speaker: string; text: string; next?: string }[];
}

const INTROS: Record<string, string[]> = {
  platformer: [
    'Un héros entre en scène. Chaque plateforme rapproche du trésor.',
    'Sautez, explorez, survivez — le niveau ne pardonne pas.',
  ],
  runner: ['La course ne s\'arrête jamais. Esquivez, collectez, survivez.'],
  rpg: ['Une quête ancienne vous appelle. Parlez aux villageois, explorez le monde.'],
  puzzle: ['Chaque pièce a sa place. Réfléchissez avant d\'agir.'],
  fighting: ['Le ring vous attend. Maîtrisez vos coups, dominez l\'adversaire.'],
};

export function generateNarrative(
  genre: string,
  prompt: string,
  branching = false,
): NarrativePack {
  const pool = INTROS[genre] ?? INTROS.platformer!;
  const intro = pool[Math.abs(hash(prompt)) % pool.length]!;

  const quests = branching
    ? [
        {
          id: 'main',
          title: 'Quête principale',
          status: 'active',
          objective: extractObjective(prompt) ?? 'Atteindre la fin du niveau',
        },
        {
          id: 'side_collect',
          title: 'Collectionneur',
          status: 'available',
          objective: 'Collecter tous les objets cachés',
        },
      ]
    : [{ id: 'main', title: 'Objectif', status: 'active', objective: extractObjective(prompt) ?? intro }];

  const dialogues = [
    { id: 'intro', speaker: 'narrator', text: intro, next: branching ? 'guide_1' : undefined },
    ...(branching
      ? [
          {
            id: 'guide_1',
            speaker: 'guide',
            text: 'Bienvenue, héros. Votre première quête vous attend.',
          },
        ]
      : []),
  ];

  return { intro, quests, dialogues };
}

function extractObjective(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  if (lower.includes('collect')) return 'Collecter tous les objets';
  if (lower.includes('chat') || lower.includes('chien')) return 'Terminer l\'aventure avec votre compagnon';
  if (lower.includes('ninja')) return 'Maîtriser le dojo et vaincre les ombres';
  return null;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
