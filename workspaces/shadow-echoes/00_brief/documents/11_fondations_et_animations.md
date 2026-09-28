# Premier lot de la bible : fondations et animation des quatre Mythiques

Version de travail du 25 septembre 2026. Le périmètre demandé intègre désormais les animations de base des quatre héros dès ce premier lot. La validation artistique reste ouverte : le lot n'est pas présenté comme terminé au niveau des illustrations de référence.

Les nouvelles cibles reçues pendant le lot sont importées et consultables dans `07_exports/web/targets.html`. Elles remplacent les anciennes images comme références de comparaison principales dans l'atelier. Voir `12_cibles_artistiques_2026_09_25.md` pour les critères visuels et les écarts encore à combler.

## Ce qui peut être essayé

- Fiches dans la Citadelle : les héros sont des volumes articulés, avec respiration, regard, changement d'appui, clignement des yeux et mouvements secondaires des cheveux et étoffes. Glisser sur le personnage permet de le tourner. Quatre boutons déclenchent salut, attaque, pouvoir et victoire.
- Bibliothèque `07_exports/web/motion-3d.html` : quatre héros, 42 états d'animation chacun, sélection par famille, vitesse, pause, répétition, rotation et comparaison à la référence.
- Campagne, Survie et Caravane : les héros utilisent le nouveau rendu. Les commandes de base, compétence, super, impact et défaite sont raccordées aux gestes. En Survie, les jambes courent pendant le déplacement, y compris lorsqu'une attaque joue sur le haut du corps ; le personnage tourne vers sa direction de déplacement.
- Hub et invocations : même représentation articulée. L'attribution des fragments continue d'être effectuée avant la présentation ; le rendu ne modifie pas la récompense.
- Les réglages de réduction du mouvement et la pause restent pris en compte.

## Bibliothèque de base

| Famille | États |
| --- | --- |
| Présence | Respiration ; regard et changement d'appui |
| Déplacement | Marche ; course ; arrêt ; demi-tour ; deux pas latéraux ; quatre esquives |
| Combat | Trois attaques de combo ; préparation ; garde ; impact léger et lourd |
| Compétences | Préparation, lancement et retour pour chacune des trois compétences |
| Ultime | Rassemblement ; libération ; maintien ; réception |
| Réactions | Chute ; à terre ; résurrection ; soin ; bénédiction ; interaction |
| Présentation | Victoire ; défaite ; sélection ; dévoilement |

Les 42 états comprennent des phases de compétence et d'ultime : ils ne représentent pas 42 pouvoirs différents. Les courbes sont écrites en code et partagent une base avec des variantes selon les rôles. Toutes les possibilités de la bibliothèque ne sont pas encore des commandes du combat du lot 2 : les trois compétences actives et les esquives de campagne nécessitent la future refonte du gameplay.

## Modèles et fichiers réutilisables

Chaque héros possède 17 articulations principales, des mains avec doigts attachés, des vêtements et mèches secondaires, ainsi qu'une arme ou un objet de rôle en volume. Le rendu ne projette pas le portrait sur le corps.

Les modèles sont des maillages attachés rigidement à une hiérarchie articulée. Ce premier passage n'est pas un corps avec peau continue et pondération anatomique professionnelle. Les silhouettes, visages et habits restent schématiques et n'atteignent pas la finesse demandée ; les modèles ont été explicitement marqués comme études de volume.

Exports GLB, avec les 42 animations échantillonnées à 30 Hz :

- `03_assets/characters/seraphine/volume-v1/hero.glb`
- `03_assets/characters/nyxara/volume-v1/hero.glb`
- `03_assets/characters/lysael/volume-v1/hero.glb`
- `03_assets/characters/voren/volume-v1/hero.glb`

Ces exports permettent de reprendre la hiérarchie et les courbes dans une chaîne 3D. Les modèles du navigateur sont générés depuis les mêmes sources. Les effets magiques de gameplay restent séparés des GLB. La bibliothèque Three.js 0.179.1 est copiée localement avec sa licence MIT ; aucune dépendance à un CDN au lancement.

Contrôle du 27 septembre : les quatre GLB ont chacun 42 clips, mais **aucun n'a de peau pondérée**. Le rapport reproductible est `02_production/lot-08/hero-asset-gate.json` ; l'atelier `07_exports/web/asset-lab.html` permet de comparer chaque export à sa fiche et d'ouvrir un candidat GLB local. Les trois compétences et l'esquive sont maintenant jouables dans le Pont des Serments en trois quarts ; les remarques plus haut sur la refonte future concernaient l'ancienne campagne à positions fixes.

## Fondations économiques

Le module `tools/lib/shadow-echoes/foundation-rules.mjs` versionne les caps, les règles cibles de combat, les coûts 1-100 et les probabilités. Il sert à la conception et aux calculs, pas à convertir silencieusement les carnets existants.

La distribution exacte du premier Mythique est calculée avec un compteur Épique+ glissant, la renormalisation des raretés admissibles, l'augmentation dès le tirage 66 et la garantie au tirage 80. Sous ces hypothèses, le nombre moyen de tirages jusqu'au premier Mythique depuis des compteurs neufs est d'environ 47,13. Cela ne mesure pas le revenu gratuit, ne prédit pas le temps d'acquisition et ne valide pas une économie commerciale.

Restent à fixer pour fermer le lot 3A : revenus gratuits par semaine/saison, distribution des héros par rareté, coûts des éveils, attribution de l'EXP aux participants, échanges de Médailles et migration des anciennes ressources. Rapport : `02_production/lot-07/economy-audit.json`.

## Vérification et poursuite du lot

Les tests de logique couvrent les poses à plusieurs instants, la hiérarchie anatomique, l'attache des armes, les transitions, les probabilités et les garanties. Le rapport navigateur décrit séparément les parcours réellement vérifiés. Une vue de 390 px ne constitue pas une mesure de performance sur téléphone.

Pour atteindre la qualité cible, la suite de ce même lot doit remplacer les volumes schématiques par une modélisation fidèle aux planches : visages propres à chaque héros, topologie et skinning continus, cheveux et tissus détaillés, matières, armes et ornementation. Les courbes de base doivent ensuite être retouchées sur ces corps, avec ancrage des pieds, contacts des mains et contrôle des intersections. Cette validation artistique précède la production massive des autres niveaux.

Commandes : `node tools/build-shadow-echoes-citadel.mjs`, `node tools/export-shadow-echoes-volume.mjs`, `node tools/audit-shadow-echoes-foundation.mjs`, `node --test tools/lib/shadow-echoes/*.test.mjs`, `node tools/verify-shadow-echoes-volume.mjs`.
