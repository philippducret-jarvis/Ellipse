# Roster adulte et production 3D

## Règles d’identité

- Tous les personnages jouables ont 24 ans ou plus.
- La silhouette, le visage, la posture et la palette sont verrouillés avant mesh.
- Chaque concept comporte face, profil, dos, gros plan visage, matériaux, arme,
  sous-couches de vêtement et zones de déformation.
- La sensualité doit survivre à une animation normale : aucune anatomie cassée,
  pose permanente cambrée ou vêtement collé sans logique de construction.
- Chaque tenue dispose d’une variante de pudeur pour territoires/storefronts si
  le conseil de classification l’exige.

## Roster canonique

| ID | Âge | Présentation | Silhouette | Fantaisie vestimentaire |
|---|---:|---|---|---|
| Mira | 27 | femme | athlétique, taille marquée | oracle des marées, voiles ouverts, astrolabe |
| Brann | 34 | homme | très musclé | forgeron torse cuirassé, bras runiques |
| Kael | 29 | homme | longiligne athlétique | chasseur boréal, cape fendue, arc organique |
| Orin | 31 | homme | nageur | duelliste aquatique, soies bleues et bijoux |
| Talia | 24 | femme | petite, sportive | messagère aérienne, jambes libres, ailes textiles |
| Joren | 38 | homme | large et puissant | chevalier lunaire, armure sombre ajustée |
| Phaé | 26 | femme | pulpeuse | herboriste solaire, taille nue contrôlée, lianes |
| Ciro | 30 | homme | fin et élégant | archiviste couture, chemise ouverte et corseterie |
| Lys | 28 | femme | élancée | gardienne du temps, robe fendue et sabliers |
| Noor | 25 | femme | athlétique | porteuse d’aurore, drapés courts et métal rose |
| Vesper | 33 | homme | sculptural | sentinelle du soir, harnais d’armure et cape |
| Saphira | 27 | femme | grande et anguleuse | lame de cristal, transparences minérales |
| Nyx | 29 | femme | grande, statuesque | sorcière du vide, latex fantasy et voile cosmique |
| Ilyra | 26 | femme | souple, courbes marquées | cantatrice, robe de scène et anneaux orbitaux |
| Caelum | 32 | homme | athlétique | lancier impérial, plastron ouvert et cape courte |
| Rhéa | 35 | femme | mature, pulpeuse | oracle maritime, drapé humide stylisé |
| Talos | 42 | homme | colosse | magnétiseur, armure segmentée et cœur exposé |
| Maëlys | 28 | femme | voluptueuse | dompteuse cosmique, corset céleste et fourrure |
| Aster | 24 | femme | royale, fine | héritière du Nexus, robe-armure asymétrique |
| Élya | 27 | femme | danseuse | cantatrice astrale, lignes musicales lumineuses |
| Solveig | 30 | femme | athlétique, grande | valkyrie d’aurore, dos ouvert et plumes de lumière |
| Séraphiel | 36 | homme | très grand, sculptural | juge solaire, armure blanche et poitrine rayonnante |
| Vaelora | 34 | femme | grande, courbes fortes | impératrice du vide, robe noire fendue et couronne |
| Orion | 48 | homme | mature, imposant | architecte, manteau savant et géométrie sacrée |

## Livrables obligatoires par Gardien

### Concept

- `turnaround.png` : face/profil/dos en A-pose ;
- `face-sheet.png` : neutre + 8 expressions ;
- `materials.png` : peau, cheveux, textile, métal, gemmes ;
- `outfit-exploded.png` : couches et accessoires séparés ;
- `weapon-sheet.png` ;
- `color-script.png` : base, éveil, social ;
- validation écrite identité/sensualité/classification.

### Modèle

- `body_base.blend` ou source DCC équivalente ;
- `head_high.fbx`, `body_high.fbx` ;
- `guardian_lod0.glb`, `lod1.glb`, `lod2.glb` ;
- textures PBR : baseColor, normal, ORM, emissive ;
- cheveux en mèches + cartes optimisées ;
- vêtements réellement construits, épaisseur visible aux bords ;
- arme, accessoires et points d’attache nommés ;
- aucune géométrie intime détaillée sous les vêtements.

### Rig

- squelette humanoïde partagé ;
- twist bones épaules/avant-bras/cuisses ;
- doigts complets ;
- visage : 36 formes minimum, 52 souhaitées ;
- yeux, mâchoire, langue simplifiée ;
- bones secondaires cheveux, poitrine/vêtement, cape et accessoires ;
- volumes correctifs pour épaules, hanches, coudes, genoux ;
- profil physique séparé PC/mobile.

### Animation minimale

- idle calme, idle personnalité, idle séduction non explicite ;
- marche, course, pivot, entrée, sortie ;
- attaque fusion faible/forte/parfaite ;
- compétence, ultime, Surpuissance ;
- parade, impact, rupture, victoire, défaite ;
- trois animations de hub ;
- deux animations de relation ;
- synchronisation lèvres pour français/anglais ou système visème.

## Budgets

| Élément | PC LOD0 | Mobile LOD0 | LOD1 | LOD2 |
|---|---:|---:|---:|---:|
| Triangles personnage | 120 000 | 65 000 | 35 000 | 12 000 |
| Triangles cheveux | 28 000 | 14 000 | 8 000 | 2 500 |
| Matériaux visibles | 8 max | 5 max | 4 | 2 |
| Bones déformants | 160 max | 110 max | 90 | 60 |
| Textures visage | 4K | 2K | 1K | 512 |
| Textures corps/tenue | 2 × 4K | 2 × 2K | 1K | 512 |

Le budget mobile est évalué avec deux Gardiens complets au premier plan et le
troisième en LOD1. Les textures utilisent ASTC ; PC utilise BC7/BC5.

## Tenues

Chaque Gardien possède à terme :

1. **Combat** : silhouette canonique, fournie avec le personnage ;
2. **Éveil** : ajout de lumière et accessoires, obtenue par progression ;
3. **Soirée céleste** : tenue glamour achetable directement ;
4. **Saison** : thème limité mais retour programmé et date annoncée.

Une tenue ne modifie jamais les statistiques. Les variantes couleur partagent
mesh et matériaux paramétriques.

## Contrôle qualité 3D

Un modèle échoue si :

- il ne respecte pas le turnaround ;
- il présente clipping visible pendant une animation livrée ;
- les yeux, coudes ou épaules se déforment de façon non anatomique ;
- il dépasse le budget sans dérogation mesurée ;
- il manque LOD, collisions, thumbnails ou métadonnées ;
- les textures contiennent artefacts génératifs, texte incohérent ou signature ;
- la sensualité repose sur un angle caméra impossible à maintenir en jeu.

## Outillage et catalogue réellement disponibles

Le pipeline local utilise maintenant Blender 4.5.10 LTS, MPFB 2.0.17,
l’exporteur glTF 2.0 natif, Godot 4.7 et un audit automatisé des GLB. Les
portraits restent la cible d’identité visuelle, tandis que les actifs runtime
suivants sont disponibles :

- 24 bases humanoïdes adultes riggées, avec une animation d’attente et quatre sockets ;
- 96 variantes de tenue extraites des mêmes personnages maîtres ;
- 24 armes et 24 artefacts liés aux mêmes identités ;
- 12 familiers riggés totalisant 96 clips d’animation ;
- 8 Orbes vivantes et 211 actifs procéduraux de support ;
- 4 bases couleur de brocart astral.

Ces actifs portent le statut `integration_ready`, pas `commercial_final`. Les
sculpts d’identité, la retopologie finale, les LOD1/LOD2, les cartes PBR
complètes, les expressions faciales et les animations de combat restent des
gates obligatoires. Le rapport exécutable est
`03_assets/3d/catalog_v2/catalog-audit.json`.
