# Pipeline 3D — Catalogue V2

Mise à jour : 30 juillet 2026.

## Objectif

Le catalogue V2 remplace les mannequins composés de primitives par une base
humanoïde adulte réelle, morphable et riggée. Il couvre les 24 Gardiens et
prépare la même convention pour les tenues, armes, armures, artefacts,
invocations et objets du hub.

Ce lot est une **base 3D intégrable**, pas une fausse déclaration de modèles
finaux sculptés à la main. Le sculpt de finition, la retopologie finale, les
textures peintes propres à chaque personnage, les LOD définitifs et le jeu
complet d’animations restent des gates de production distinctes.

## Socle validé

- Blender `4.5.10 LTS` ;
- MPFB `2.0.17` ;
- base et actifs système MakeHuman sous `CC0` ;
- robes, combinaisons, armures, gants et armes issus de packs vérifiés ;
- cheveux haute définition `CC-BY`, consignés dans le registre des licences ;
- export `glTF 2.0 GLB` ;
- unités en mètres ;
- squelette `orbes_astra_humanoid_v2` ;
- matériaux PBR à graphe simple, compatibles Godot ;
- clip d’attente `<guardian_id>_Idle_Glamour` ;
- quatre sockets partagés :
  - `socket_weapon_r` ;
  - `socket_artifact_l` ;
  - `socket_back` ;
  - `socket_head_fx`.

## Ordre de fabrication obligatoire

1. créer le corps à partir du profil canonique ;
2. appliquer âge, présentation, taille, poids, musculature et proportions ;
3. appliquer une peau PBR mono-diffuse exportable ;
4. ajouter le rig de jeu ;
5. ajouter yeux, sourcils haute définition, cils, cheveux, dents, langue et chaussures ;
6. ajouter une tenue MPFB ajustée et pondérée, choisie par identité ;
7. appliquer le matériau astral de l’affinité et les variantes d’armure ;
8. ajouter les pièces rigides, bijoux, halo, artefact et arme ;
9. créer les sockets ;
10. poser le personnage avec contraintes IK ;
11. baker la pose dans un clip d’animation, sans modifier le bind pose ;
12. supprimer les helpers MakeHuman avant export ;
13. exporter le GLB ;
14. réimporter le GLB dans une scène vierge ;
15. refuser le modèle si texture, peau, yeux, arme ou pose divergent ;
16. copier uniquement le paquet validé vers le runtime Godot.

## Arborescence

```text
03_assets/3d/catalog_v2/
  guardians/
    <guardian_id>/
      <guardian_id>_source.blend
      <guardian_id>_lod0.glb
      <guardian_id>_preview.png
      qa-report.json
  loadouts/
    <guardian_id>/
      <guardian_id>_outfit_<variant>.glb
      <guardian_id>_weapon_signature.glb
      <guardian_id>_artifact_signature.glb
  summons/
    <summon_id>/
      <summon_id>_source.blend
      <summon_id>_lod0.glb
      qa-report.json
  guardians-v2-report.json
  catalog-audit.json
  logs/
    <guardian_id>.log
```

Les fichiers runtime sont copiés vers :

```text
04_runtime/godot/assets/3d/guardians_v2/<guardian_id>/
04_runtime/godot/assets/3d/loadouts_v2/<guardian_id>/
04_runtime/godot/assets/3d/summons_v2/<summon_id>/
```

Le catalogue consommable par Godot est :

```text
04_runtime/godot/data/guardians_3d_v2.json
04_runtime/godot/data/loadouts_3d_v2.json
04_runtime/godot/data/summons_3d_v2.json
```

## Scripts reproductibles

### Personnage étalon

```powershell
blender.exe --background --python-exit-code 1 `
  --python tools/blender/build_orbes_mira_mpfb_pilot.py -- `
  --project-root "<racine du projet>"
```

### Un Gardien

```powershell
blender.exe --background --python-exit-code 1 `
  --python tools/blender/build_orbes_guardians_v2.py -- `
  --project-root "<racine du projet>" `
  --guardian-id mira `
  --render 1
```

### Roster complet

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File tools/build-orbes-guardians-v2.ps1 `
  -ProjectRoot "<racine du projet>" `
  -BlenderPath "<blender.exe>"
```

Chaque Gardien est construit dans un processus Blender distinct. Cette
isolation empêche la contamination des shape keys, actions et matériaux entre
deux personnages.

### Chargements cohérents

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File tools/build-orbes-loadouts-v2.ps1 `
  -ProjectRoot "<racine du projet>" `
  -BlenderPath "<blender.exe>"
```

Les quatre tenues, l’arme et l’artefact sont extraits du GLB maître de chaque
Gardien. Ils réutilisent donc exactement les mêmes meshes et matériaux.

### Invocations animées

```powershell
blender.exe --background --python-exit-code 1 `
  --python tools/blender/build_orbes_summons_v2.py -- `
  --project-root "<racine du projet>"
```

### Audit global

```powershell
node tools/verify-orbes-3d-catalog-v2.mjs
```

L’audit contrôle les 24 Gardiens, les 144 chargements, les 12 familiers
riggés, les 8 Orbes vivantes, les 211 actifs de support et les textures de
brocart.

## Niveaux de qualité

| Niveau | Contenu | Utilisation autorisée |
|---|---|---|
| `blockout` | primitives, proportions approximatives | test interne uniquement |
| `integration_ready_humanoid_base` | corps réel, peau, visage, rig, tenue pondérée, arme, GLB | intégration et validation gameplay |
| `vertical_slice_art` | sculpt propre, textures dédiées, cheveux finis, animations essentielles | démo publique contrôlée |
| `commercial_final` | retopo/LOD finaux, 52 formes visage, animation complète, QA appareils | candidat commercial |

Le catalogue V2 produit actuellement le second niveau. Aucun rapport ne doit
transformer ce statut en `commercial_final`.

## Contrôles automatiques

Un actif échoue si :

- son GLB ne peut pas être réimporté ;
- des helpers ou volumes techniques deviennent visibles ;
- les matériaux divergent entre Blender et le GLB ;
- la peau utilise plusieurs textures ambiguës sur l’entrée Base Color ;
- le squelette ou les quatre sockets manquent ;
- le clip d’attente manque ;
- le modèle dépasse les budgets contractuels ;
- un personnage n’est pas confirmé adulte ;
- le fichier source, le GLB ou le rapport QA manque.

## Prochaines gates

1. valider visuellement les 24 bases dans une galerie Godot ;
2. transformer les quatre variantes extraites en silhouettes réellement uniques ;
3. baker les vêtements avec poids multi-os et correctifs ;
4. produire LOD1 et LOD2 réels ;
5. ajouter 30 clips contractuels par Gardien ;
6. ajouter les 36 à 52 formes faciales ;
7. effectuer la passe sculpt, cheveux et textures propres à chaque identité ;
8. exécuter les budgets PC et mobile dans une scène de combat réelle.
