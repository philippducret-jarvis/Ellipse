export type FactoryAgentProfile = {
  id: string;
  name: string;
  role: string;
  competencies: string[];
  outputs: string[];
};

export const FACTORY_AGENT_PROFILES: FactoryAgentProfile[] = [
  {
    id: 'producer',
    name: 'Producer',
    role: 'Cadre le MVP, verrouille les priorites, organise la roadmap et l execution globale.',
    competencies: ['scope du slice jouable', 'priorisation', 'gating de production', 'cadence des iterations'],
    outputs: ['plan de production', 'backlog priorise', 'jalons et ordre des travaux'],
  },
  {
    id: 'game_design',
    name: 'Game Design',
    role: 'Transforme la vision en boucle de jeu, contraintes gameplay et structures de progression.',
    competencies: ['boucle de jeu', 'armes et pouvoir', 'regles de progression', 'lisibilite mobile'],
    outputs: ['game design document', 'mecaniques et regles', 'parametres de runtime'],
  },
  {
    id: 'narrative',
    name: 'Narrative',
    role: 'Formalise le monde, les personnages, l arc du niveau et les iterations lore.',
    competencies: ['story seed', 'naming', 'bible narrative', 'cadres de personnages'],
    outputs: ['narrative bible', 'naming', 'briefs de personnages'],
  },
  {
    id: 'art_direction',
    name: 'Art Direction',
    role: 'Verrouille le rendu cible, la palette, les silhouettes et les references de qualite.',
    competencies: ['style guide', 'coherence visuelle', 'hierarchie de lecture', 'fidelite aux boards'],
    outputs: ['art direction', 'style guide', 'prompts d assets'],
  },
  {
    id: 'asset_direction',
    name: 'Asset Direction',
    role: 'Decoupe le projet en slots d assets, organise les packs et prepare les sorties HD.',
    competencies: ['catalogue d assets', 'packs hero/enemies/props', 'cibles de rendu', 'normalisation'],
    outputs: ['asset slots', 'registries', 'specs d animation'],
  },
  {
    id: 'level_design',
    name: 'Level Design',
    role: 'Convertit les boards de niveau en layouts jouables, zones, collisions et encounters.',
    competencies: ['layout 2D', 'spawn et checkpoints', 'zones et hazards', 'traduction concept -> runtime'],
    outputs: ['layout.json', 'encounters', 'scene notes'],
  },
  {
    id: 'gameplay_programming',
    name: 'Gameplay Programming',
    role: 'Assemble GDL, interactions, controls, objectifs et preview jouable.',
    competencies: ['GDL runtime', 'collisions', 'camera', 'bridge frontend/engine'],
    outputs: ['preview GDL', 'preview web', 'runtime wiring'],
  },
  {
    id: 'animation',
    name: 'Animation',
    role: 'Prepare le mouvement lisible et les packs d animation du hero et des ennemis.',
    competencies: ['idle/run/jump/attack', 'readabilite mobile', 'state coverage', 'motion specs'],
    outputs: ['animation specs', 'briefs de spritesheets', 'packs motion'],
  },
  {
    id: 'qa',
    name: 'QA',
    role: 'Valide le slice, le chemin critique, la lisibilite et les hypotheses de performance.',
    competencies: ['checklists', 'validation preview', 'coherence collision', 'smoke tests'],
    outputs: ['checklists QA', 'rapports de validation', 'criteria de sortie'],
  },
  {
    id: 'build_release',
    name: 'Build Release',
    role: 'Prepare les manifests, exports et artefacts de livraison consultables par l equipe.',
    competencies: ['manifests', 'exports', 'packaging', 'traceabilite projet'],
    outputs: ['preview manifest', 'workspace manifests', 'artefacts exportables'],
  },
];
