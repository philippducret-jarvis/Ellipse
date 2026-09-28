# Reprise visuelle Godot V3 — décision et état vérifiable

Mise à jour : 29 juillet 2026.

## Décision

La première build Godot est rejetée comme référence visuelle. Elle validait
l’export et la physique, mais son boss en primitives, ses capsules de personnages,
sa chambre opaque et son décor plat ne pouvaient pas soutenir une présentation
commerciale.

La V3 remplace cette couche sans masquer l’état réel de la production :

- hub avec matte painting 16:9 intégré au runtime ;
- Port noyé avec profondeur, éclairage et sol sombre ;
- Léviathan GLB à corps continu, 41 os et 3 clips ;
- Mira GLB adulte, 18 os et 3 clips, toujours classée **blockout** ;
- suppression des mannequins-capsules de Brann et Aster ;
- cartes illustrées d’escouade tant que leurs modèles ne sont pas produits ;
- chambre physique transparente, rails et grille lisible ;
- Orbes gemmes, fusion, dégâts, score et phases de boss ;
- Puits astral, Ultime et Surpuissance avec VFX 3D ;
- Surpuissance jouable : dégâts ×2 pendant 10 secondes ;
- gacha local jouable avec taux visibles, coûts, pity 80, simple/décuple et révélation.

## Captures de contrôle

Les captures sont produites automatiquement par le vrai viewport Godot :

- `qa/runtime-hub.png` ;
- `qa/runtime-gacha.png` ;
- `qa/runtime-summon.png` ;
- `qa/runtime-combat.png` ;
- `qa/runtime-ultimate.png` ;
- `qa/runtime-surpuissance.png`.

Elles doivent être régénérées avant chaque export. Une capture manquante bloque la
validation de paquet.

## Vérité de production

Cette reprise est un **vertical slice visuellement présentable**, pas une release
candidate :

- le visage, les cheveux, la peau et les déformations de Mira ne sont pas finaux ;
- Brann et Aster n’ont pas encore de modèles 3D ;
- le Léviathan est un modèle de présentation riggé, pas le boss final trois phases ;
- le gacha est local et ne contient ni achat, ni backend, ni restauration ;
- l’audio, les cinématiques, les LOD complets et le test appareils restent à produire ;
- aucun achat réel ne doit être activé avant audit légal, parental et stores.

## Prochaine porte artistique

La prochaine dépense utile n’est pas d’ajouter vingt autres blockouts. Elle est de
faire approuver puis produire un seul **Mira gold master** : sculpt, retopologie,
UV, textures PBR, skinning, visage, cheveux et LOD. Brann, Aster et le roster ne
passent en production série qu’après validation de ce standard.

