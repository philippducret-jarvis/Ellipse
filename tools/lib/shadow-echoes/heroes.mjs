/** Lot 01 : seules les raretés Mythique lues sur les fiches sont admises. */
export const HEROES = [
  {
    id: 'seraphine', name: 'Séraphine', title: 'Fleur de l’Abîme', rarity: 'mythique',
    element: 'Lumière obscure', role: 'Assassin', accent: '#ec6379', symbol: '✥',
    quote: 'Même dans les ténèbres, il reste une lumière.',
    description: 'Une lame de cristal écarlate, une couronne de roses et des ronces qui ne laissent aucune échappatoire.',
    reference: 'partie-3/fiche_héroïne_gothique_de_séraphine.png',
    board: 'partie-1/invocation_de_seraphine_fleur_de_l_abîme.png',
    invariants: ['Visage pâle, yeux rubis, cheveux argentés', 'Armure noire à filigranes dorés et étoffes cramoisies', 'Couronne de ronces et roses rouges', 'Lame de cristal rouge, silhouette élancée'],
    skills: [
      { id: 'thorn', name: 'Entaille de ronce', type: 'damage', power: 140, cooldown: 1.2, energyGain: 15, description: 'Inflige 140 dégâts et gagne 15 points d’énergie.' },
      { id: 'bloom', name: 'Floraison abyssale', type: 'bleed', power: 210, dot: 35, duration: 4, cooldown: 8, energyGain: 20, description: '210 dégâts, puis 35 dégâts par seconde pendant 4 secondes.' },
      { id: 'requiem', name: 'Requiem des roses', type: 'damage', power: 720, cooldown: 16, cost: 100, description: 'Dépense 100 points d’énergie pour infliger 720 dégâts.' },
    ],
    stats: { maxHp: 2200, attack: 140, defense: 80 },
  },
  {
    id: 'nyxara', name: 'Nyxara', title: 'Souveraine du Néant', rarity: 'mythique',
    element: 'Ténèbres', role: 'Mage · contrôle', accent: '#bc8aee', symbol: '☽',
    quote: 'Dans chaque ombre se cache une couronne.',
    description: 'Le néant se rassemble dans sa paume. Corbeaux, orbes et malédictions dessinent le territoire de la reine.',
    reference: 'partie-2/fiche_héros_de_nyxara_souveraine_du_néant.png',
    board: 'partie-3/nyxara_souveraine_du_néant.png',
    invariants: ['Longue chevelure noire aux reflets violets', 'Couronne d’or effilée et pierres améthyste', 'Corsage noir, chaînes d’or fines et cape violette', 'Corbeau et orbe du néant ; visage et proportions de la fiche'],
    skills: [
      { id: 'orb', name: 'Orbe du néant', type: 'drain', power: 115, healing: 65, cooldown: 1.5, energyGain: 15, description: '115 dégâts et 65 PV rendus à Nyxara.' },
      { id: 'eclipse', name: 'Éclipse souveraine', type: 'control', power: 190, duration: 3, cooldown: 9, energyGain: 20, description: '190 dégâts. Suspend les attaques de la cible pendant 3 secondes.' },
      { id: 'silence', name: 'Retour au silence', type: 'drain', power: 650, healing: 380, cooldown: 18, cost: 100, description: '650 dégâts et 380 PV rendus à Nyxara. Coût : 100 énergie.' },
    ],
    stats: { maxHp: 2500, attack: 115, defense: 95 },
  },
  {
    id: 'lysael', name: 'Lysael', title: 'Chant des Mondes', rarity: 'mythique',
    element: 'Lumière', role: 'Soutien · soin', accent: '#ddcc8c', symbol: '❋',
    quote: 'Que les mondes s’épanouissent, et que jamais l’espoir ne se tarisse.',
    description: 'Une lumière vivante tissée d’or, de fleurs blanches et de racines. Chaque note protège ceux qui avancent à ses côtés.',
    reference: 'partie-1/fiche_héroïne_mythique_lysael.png',
    board: 'partie-1/lysael_chant_des_mondes.png',
    invariants: ['Cheveux ivoire ondulés, traits doux et couronne de branches', 'Robe ivoire, or végétal, feuillage vert et fleurs blanches', 'Bâton floral à cage lumineuse sphérique', 'Drapés fins, bijoux verts et sandales végétales'],
    skills: [
      { id: 'light', name: 'Racine de lumière', type: 'damage', power: 85, cooldown: 1.4, energyGain: 20, description: '85 dégâts et 20 points d’énergie.' },
      { id: 'harmony', name: 'Harmonie des sources', type: 'heal', healing: 280, cooldown: 8, energyGain: 15, description: 'Rend jusqu’à 280 PV à chacun des quatre héros.' },
      { id: 'worldsong', name: 'Chant des Mondes', type: 'sanctuary', healing: 520, shield: 240, cooldown: 18, cost: 100, description: 'Rend 520 PV et accorde 240 points de bouclier à chacun. Coût : 100 énergie.' },
    ],
    stats: { maxHp: 2700, attack: 85, defense: 110 },
  },
  {
    id: 'voren', name: 'Voren', title: 'Empereur des Cendres', rarity: 'mythique',
    element: 'Feu · Ténèbres', role: 'Guerrier · berserker', accent: '#f1985b', symbol: '♜',
    quote: 'Tout brûle. Et des cendres naît mon empire.',
    description: 'Un souverain de cendre, cuirassé de métal volcanique. Son immense hache ouvre la voie au milieu des braises.',
    reference: 'partie-2/fiche_héros_gothique_de_voren.png',
    board: 'partie-1/voren_empereur_des_cendres.png',
    invariants: ['Longue chevelure argentée, couronne noire embrasée', 'Torse découvert et proportions puissantes de la référence', 'Armure volcanique noire, bordures d’or et fissures de braise', 'Grande hache, cape rouge déchirée et épaulières à pointes'],
    skills: [
      { id: 'axe', name: 'Fendoir impérial', type: 'damage', power: 160, cooldown: 1.7, energyGain: 15, description: '160 dégâts et 15 points d’énergie.' },
      { id: 'ashes', name: 'Décret de cendres', type: 'burn', power: 190, dot: 45, duration: 4, cooldown: 9, energyGain: 20, description: '190 dégâts, puis 45 dégâts de brûlure par seconde pendant 4 secondes.' },
      { id: 'empire', name: 'L’Empire renaît', type: 'fortifiedStrike', power: 620, shield: 480, cooldown: 18, cost: 100, description: '620 dégâts et 480 points de bouclier pour Voren. Coût : 100 énergie.' },
    ],
    stats: { maxHp: 3400, attack: 160, defense: 160 },
  },
];

export const LOT = {
  id: 'mythiques-01', title: 'Les premiers Mythiques',
  scope: 'Séraphine, Nyxara, Lysael et Voren uniquement',
  qualityTarget: 'Fidélité aux designs fournis : identité, proportions, costume, matériaux et finesse.',
  balanceStatus: 'Noms de compétences et valeurs de laboratoire proposés ; équilibrage non définitif.',
  artStatus: 'Bases HD de présentation en revue ; rig et animations de combat à produire.',
  referencePolicy: 'Les chiffres contradictoires des maquettes ne sont pas importés comme règles de jeu.',
};
