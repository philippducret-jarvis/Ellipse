# Architecture technique et pipeline

## Décision à prendre au Lot 0

Deux prototypes identiques de combat doivent être benchmarkés :

### Option A — Godot 4

- export Windows, Android et iOS ;
- scènes 3D, animation tree, physique et ressources natives ;
- pipeline GLB direct ;
- meilleure base pour un jeu 3D autonome.

### Option B — Three.js/WebGPU

- réutilise le socle web et le déploiement PWA ;
- intégration plus rapide dans Ellipse ;
- coût supérieur pour physique, streaming, animation et builds mobiles natifs.

Critère : retenir le moteur qui tient 60 FPS sur PC cible et 30 FPS stable sur
mobile milieu de gamme avec deux Gardiens, un boss, 40 Orbes et VFX de combo ×6.

## Modules runtime

| Module | Responsabilité |
|---|---|
| `battle-sim` | règles déterministes, seed, événements |
| `orb-physics` | chute, contacts, fusion, contraintes |
| `guardian-combat` | compétences, changement, réactions |
| `boss-runtime` | state machines, télégraphies, phases |
| `presentation-3d` | modèles, animations, caméra, lumière |
| `vfx-audio` | feedback et musique adaptative |
| `ui-shell` | écrans, navigation, accessibilité |
| `progression` | niveau, ascension, relations |
| `economy-client` | inventaire, transactions, cache |
| `content-loader` | bundles, version, téléchargement |
| `telemetry` | événements consentis, performance |
| `save-sync` | snapshots locaux et synchronisation |

La simulation ne dépend jamais du framerate ou d’une animation.

## Backend commercial

Services nécessaires :

- authentification anonyme puis liaison de compte ;
- profil et sauvegarde cloud ;
- inventaire autoritaire ;
- catalogue/version de contenu ;
- transactions et reçus stores ;
- service d’invocation idempotent ;
- événements et calendrier ;
- classement normalisé ;
- support/compensation ;
- télémétrie et crash reports ;
- console d’administration auditée.

Le prototype peut utiliser une implémentation locale, mais aucune build avec achat
réel ne doit faire confiance au client.

## Contrat de modèle 3D

```
03_assets/3d/guardians/<id>/
  source/<id>.blend
  concept/
  exports/<id>_lod0.glb
  exports/<id>_lod1.glb
  exports/<id>_lod2.glb
  textures/pc/
  textures/mobile/
  animations/shared/
  animations/unique/
  thumbnails/
  qa/report.json
  asset.json
```

`asset.json` contient version, auteur, licence, triangle count, matériaux, bones,
blendshapes, animations, hash et statut.

## Nommage

- fichiers et IDs en `snake_case` ASCII ;
- bones préfixés `def_`, `ctl_`, `sec_` ;
- sockets : `socket_weapon_r`, `socket_weapon_l`, `socket_vfx_*` ;
- animations : `<guardian>_<context>_<action>_<variant>` ;
- matériaux : `m_<guardian>_<surface>` ;
- textures : `t_<guardian>_<set>_<map>_<resolution>`.

## Pipeline personnage

1. concept et turnaround approuvés ;
2. sculpt haute définition ;
3. retopologie et UV ;
4. bake normal/AO ;
5. texture PBR ;
6. cheveux et vêtements ;
7. rig partagé + correctifs ;
8. skinning et tests extrêmes ;
9. blendshapes ;
10. animation partagée retargetée ;
11. animations uniques ;
12. LOD et compression ;
13. export GLB ;
14. validation automatique ;
15. revue en moteur sur PC et mobile.

Un service image-vers-3D peut produire un blockout, jamais sauter les étapes 3–15.

## Validation automatisée GLB

- fichier ouvrable et glTF 2.0 valide ;
- aucun chemin absolu ;
- aucune texture manquante ;
- échelle 1 unité = 1 m ;
- personnage face à `-Z`, sol à `Y=0` selon convention moteur retenue ;
- bounding box et taille plausibles ;
- budgets triangles/matériaux/bones ;
- noms uniques ;
- animations non vides et root motion déclaré ;
- aucune clé NaN ;
- LOD cohérents ;
- hash et licence présents.

## Performances

### PC minimum cible

- 1080p, 60 FPS ;
- GPU classe GTX 1060/RX 580 à confirmer ;
- 4 Go VRAM ;
- frame CPU simulation < 4 ms ;
- frame GPU < 13 ms ;
- mémoire totale < 3 Go.

### Mobile milieu de gamme cible

- 720p dynamique, 30 FPS stable ;
- GPU Vulkan/Metal moderne à définir par device matrix ;
- mémoire processus < 1,2 Go ;
- package initial < 500 Mo, contenu streamé ensuite ;
- température et batterie testées sur 20 minutes.

## CI

Chaque commit de contenu déclenche :

- validation schémas/manifests ;
- tests de simulation déterministe ;
- validation GLB ;
- recherche de licences manquantes ;
- build PC et Android smoke ;
- capture de scènes de référence ;
- comparaison visuelle avec seuil ;
- benchmark de 180 secondes ;
- génération d’un rapport signé.

