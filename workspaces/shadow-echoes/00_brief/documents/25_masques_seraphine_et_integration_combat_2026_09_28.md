# Séraphine · étude C, suppression du halo en combat

La cible de fidélité reste `03_assets/characters/seraphine/turnaround-v1.png`. Les trois images de l'étude B interprètent cette planche, mais contiennent un fond rouge et gris opaque autour du personnage. La transparence des seuls coins du PNG ne suffisait pas : dans le combat, ce fond formait une carte rectangulaire qui se déplaçait avec Séraphine.

L'étude C conserve sans retouche les images B et leur animation par poses clés. Trois masques de silhouette générés à partir de ces poses (`lookdev/seraphine-{idle,windup,attack}-matte-v3.png`) sont appliqués comme `alphaMap` dans le rendu Three.js, avec un seuil de découpe. Le décor est désormais visible derrière les cheveux et la cape. L'attaque continue d'afficher attente, préparation, frappe puis retour à l'attente, avec une seule pose entière à la fois.

La première preview masquée était `07_exports/web/tactics.html?seraphine=lookdev-v3`. Les études A/B et les anciens GLB sont conservés avec leurs URL respectives.

Une revue plus poussée a ensuite retenu `lookdev-v6` pour l'affichage par défaut de la vue 2,5D. Son attente charge la **vue de face de la planche originale** sans image redessinée ; sa préparation charge la **vue trois quarts de la même planche**. Chaque vue utilise son propre masque de silhouette et un cadrage UV limité à la colonne utile. La frappe est une nouvelle image générée depuis la planche originale, avec un troisième masque. Le paramètre `?seraphine=lookdev-v6&camera=seraphine` cadre la scène sur Séraphine pour contrôler le visage et le costume. Les versions V3/V4/V5 restent disponibles pour comparaison.

Captures de revue conservées dans le dépôt : `02_production/lot-15/seraphine-v6-combat-review.png` et `02_production/lot-15/seraphine-v6-attack-review.png`.

Validation : `node tools/verify-shadow-seraphine-matte.mjs lookdev-v6 focus`, `node tools/verify-shadow-seraphine-lookdev.mjs` et `node tools/verify-shadow-echoes-tactics.mjs`. Les captures de C à V6 sont dans `02_production/lot-15/qa/`. À 1440 × 960, le pixel de fond situé derrière la tête à (505,399) passe de `(175,162,166)` avec B à `(25,23,41)` avec C, ce qui confirme que le fond du décor réapparaît à cet endroit.

**Statut artistique : en revue, non cible finale.** Le masque généré reste approximatif sur les cheveux fins et le tissu. Les images clés ont de légères variations d'identité et ne constituent pas un rig articulé. La silhouette de l'étude B est encore plus large que la vue de face originale. La prochaine fabrication doit utiliser un détourage manuel validé pixel par pixel sur la planche, puis des couches cohérentes pour cheveux, bras, arme et costume, avec contrôle du visage et des accessoires en gros plan et à taille de combat. Les sentinelles et la géométrie proche du pont nécessitent aussi une finition dédiée.
