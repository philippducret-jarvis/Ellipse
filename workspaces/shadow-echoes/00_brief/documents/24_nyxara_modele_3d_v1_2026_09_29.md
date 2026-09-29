# Shadow Echoes — Nyxara, modèle 3D jouable v1

## Ce qui est livré

Dossier : `03_assets/characters/nyxara/model3d-v1/`

> Les fichiers binaires (trois GLB, `nyxara_source.blend`, rendus) n'ont pas pu être envoyés par Git LFS depuis l'environnement de production (hôte `lfs.github.com` refusé par la politique réseau). Ils ont été remis séparément et doivent être ajoutés à ce dossier ; le manifeste les liste sous `binaries_pending_upload`.

| Élément | Détail |
|---|---|
| GLB | `nyxara_lod0.glb` (145 k triangles, 6,3 Mo), `nyxara_lod1.glb` (43 k, 2,6 Mo), `nyxara_lod2.glb` (12 k, 1,4 Mo) |
| Rig | 55 os au nommage UE, poids de peau MakeHuman conservés, tissus et cheveux pondérés par proximité ou par hauteur |
| Animations | 12 clips : `idle_neutral`, `idle_glamour`, `idle_personality`, `walk`, `run`, `hit_light`, `hit_heavy`, `skill_cast`, `ultimate_cast`, `victory`, `defeat`, `hub_greeting` |
| Meshes | `nyx_body`, `nyx_costume`, `nyx_lattice`, `nyx_jewelry`, `nyx_face`, `nyx_hair`, `nyx_cloth`, `nyx_props` |
| Source | `nyxara_source.blend`, `manifest.json`, `export-report.json`, `renders/` (six vues Cycles) |
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

## Écarts avec la cible (fidélité non approuvée)

`fidelity_approved` reste **faux**. Ce qui est reconnaissable : silhouette en sablier, couronne dorée à pointes, chevelure sombre à reflets violets, filet de chaînes d'or, gants à griffes, corbeau, orbe, longue cape à ourlet violet, escarpins. Ce qui manque encore par rapport à la planche :

- **Visage** : générique, sans sculpt d'identité ni peinture de texture.
- **Matières** : couleurs unies, aucune texture PBR (peau, dentelle, métal, tissu).
- **Cheveux** : rubans plats ; la planche montre des mèches fines et désordonnées. Le passage à des cartes texturées est nécessaire.
- **Costume** : le filet d'or est un treillis régulier, pas le filigrane organique de la planche ; les bords des coques restent anguleux sous les filets.
- **Tissus** : statiques, sans os secondaires ni simulation.
- **Animation** : 12 clips sur 30, procéduraux et non nettoyés ; pas de formes faciales.

## Gates ouverts

Textures PBR ; sculpt d'identité et 52 formes faciales ; cheveux en cartes ; os secondaires (cheveux, cape, jupe) ; 18 animations restantes ; import dans Godot et dans le moteur web du jeu (non testé : ces outils ne sont pas disponibles dans l'environnement de production).

## Contrôles effectués

- Relecture des trois GLB dans Blender : 55 os, 12 actions, 8 meshes skinnés par niveau (LOD2 sans le treillis, retiré volontairement).
- Aperçu de chaque animation avant export ; les sens de rotation ont été corrigés après cette revue.
- Le rapport chiffré est `export-report.json`.
