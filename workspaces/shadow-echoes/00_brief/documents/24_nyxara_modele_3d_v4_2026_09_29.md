# Shadow Echoes — Nyxara, modèle 3D jouable v4

## Ce qui est livré

Dossier : `03_assets/characters/nyxara/model3d-v4/`

| Élément | Détail |
|---|---|
| GLB | `nyxara_lod0.glb` (146 k triangles, 30.0 Mo), `nyxara_lod1.glb` (39 k, 14.4 Mo, textures 1024), `nyxara_lod2.glb` (13 k, 5.5 Mo, textures 512) |
| Rig | 55 os au nommage UE, poids de peau MakeHuman conservés, tissus et cheveux pondérés par proximité ou par hauteur |
| Animations | 12 clips : `idle_neutral`, `idle_glamour`, `idle_personality`, `walk`, `run`, `hit_light`, `hit_heavy`, `skill_cast`, `ultimate_cast`, `victory`, `defeat`, `hub_greeting` |
| Meshes | `nyx_body`, `nyx_costume`, `nyx_lattice`, `nyx_jewelry`, `nyx_face`, `nyx_hair`, `nyx_cloth`, `nyx_props` |
| Source | `nyxara_source.blend`, `manifest.json`, `export-report.json`, `renders/` (six vues Cycles) |
| Textures | peau (couleur, métal/rugosité, normale), iris, cartes de cheveux, filet, tissu, orbe : générées par `tools/blender/nyxara/nyx_textures.py`, intégrées dans les GLB |
| Scripts | `tools/blender/nyxara/` (voir son `README.md`), reconstruction complète en une chaîne de commandes |

Le budget de référence du dépôt (120 k triangles personnage + 28 k cheveux au LOD0, 35 k au LOD1, 12 k au LOD2) est respecté à environ 10 % près sur chaque niveau.

## Méthode

Le point de départ du chantier a été le constat du document 23 : un modèle par volumes procéduraux ne restitue pas la fiche. Ce modèle repart donc d'un corps humanoïde réel :

1. le maillage MakeHuman complet du dépôt (`mpfb-mira-diagnostic.blend`, 13 380 quads, UV, poids de rig de jeu) ;
2. des cibles macro féminines et des proportions par sections (taille, hanches, jambes longues, membres affinés) ;
3. le costume construit **sur la surface du corps** : coques de dentelle, filet de mailles, gants, escarpins, treillis d'or projeté, filets de bord ;
4. tête : yeux mesurés sur l'ouverture réelle des paupières, maquillage projeté, couronne, boucles d'oreilles, chevelure en rubans ;
5. tissus paramétriques (cape à deux couches, jupe fendue, manche drapée) à ourlet violet déchiré ;
6. accessoires : corbeau, orbe du néant, chaînes et gemmes ;
7. pose héroïque de la planche (bras droit levé, talons cuits dans la géométrie) et animations procédurales.

## Apport de la v2

La v1 n'avait que des couleurs unies. La v2 ajoute des textures PBR générées par code et cuites depuis la géométrie : peau (teinte, rougeurs, pores fins, maquillage et lèvres peints à l'endroit exact des repères 3D), iris détaillés, cartes de cheveux à mèches fines, filet noir à mailles régulières, tissu à trame. Le rendu passe de « prototype en couleurs unies » à un personnage crédible en gros plan.

## Apport de la v3

Passe ciblée sur les écarts les plus visibles avec la planche (comparaison : `renders/comparaison_planche.png`) :

- visage : paupières supérieures abaissées (regard mi-clos), tête légèrement renversée, peau plus chaude, éclairage latéral ;
- cheveux : volume au sommet (la calotte n'est plus visible) et frange en travers du front ;
- costume : filigrane d'or organique en cellules sur le torse et les bras, améthystes aux nœuds et pendeloques, gemmes aux croisements du treillis des jambes, bonnets en dentelle ;
- cape et jupe déchiquetées en lanières de longueurs inégales à pointes violettes ;
- orbe noire à croissant violet lumineux ;
- présentation : rendu AgX et halo lumineux au compositing (n'affecte pas le GLB).

Les trois niveaux respectent les budgets du dépôt (148 k / 40 k / 13 k triangles).

## Apport de la v4

- Correction d'un bug de la texture de peau : une valeur invalide dans le calcul du maquillage des yeux noircissait la peau des jambes, du ventre et des bras depuis la v2.
- Bas en filet ajouré avec dentelle florale par zones ; filet opaque du ventre retiré : la peau est visible sous le filigrane d'or, comme sur la planche.
- Cheveux éclaircis vers le violet ; éclairage de présentation violet plus lumineux.

## Écarts avec la cible (fidélité non approuvée)

`fidelity_approved` reste **faux**. Ce qui est reconnaissable : silhouette en sablier, couronne dorée à pointes, chevelure sombre à reflets violets, filet de chaînes d'or, gants à griffes, corbeau, orbe, longue cape à ourlet violet, escarpins. Ce qui manque encore par rapport à la planche :

- **Visage** : générique, sans sculpt d'identité ni peinture de texture.
- **Matières** : textures procédurales crédibles, mais pas peintes à la main ; le métal et les gemmes restent des matériaux simples.
- **Cheveux** : rubans plats ; la planche montre des mèches fines et désordonnées. Le passage à des cartes texturées est nécessaire.
- **Costume** : moins de chaînes pendantes et de dentelle florale que la planche.
- **Tissus** : statiques, sans os secondaires ni simulation.
- **Animation** : 12 clips sur 30, procéduraux et non nettoyés ; pas de formes faciales.

## Gates ouverts

Sculpt d'identité et 52 formes faciales ; cheveux en cartes ; os secondaires (cheveux, cape, jupe) ; 18 animations restantes ; import dans Godot et dans le moteur web du jeu (non testé : ces outils ne sont pas disponibles dans l'environnement de production).

## Contrôles effectués

- Relecture des trois GLB dans Blender : 55 os, 12 actions, 8 meshes skinnés par niveau (LOD2 sans le treillis, retiré volontairement).
- Aperçu de chaque animation avant export ; les sens de rotation ont été corrigés après cette revue.
- Le rapport chiffré est `export-report.json`.
