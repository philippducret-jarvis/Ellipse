# Shadow Echoes — changement de méthode pour Séraphine

## Pourquoi

La comparaison V4.1 / planche montre qu'un modèle construit par volumes procéduraux ne restitue pas la silhouette, la coiffure, la coiffe, les ornements ni les couches de costume de Séraphine. Les 72 articulations et les 42 clips prouvent une structure technique, pas la fidélité artistique. La V2 reste la version de combat par défaut et les candidats V3/V4/V4.1 sont conservés pour comparaison.

## Nouveau point de départ

La planche `03_assets/characters/seraphine/turnaround-v1.png` devient la source directe du rendu. Avec l'outil intégré **imagegen**, une découpe transparente de la vue de face a été produite dans `03_assets/characters/seraphine/lookdev/seraphine-front-cutout-v1.png` (1024 × 1536, alpha vérifié). Le prompt demandait d'extraire uniquement la pose frontale, de préserver le visage, la chevelure argentée, la couronne d'épines, le corset noir et rouge, la jupe asymétrique, les bottes et la lame rouge, puis de retirer le fond et les autres vues sans simplifier les détails. Le fichier est dérivé de la planche ; il n'est **pas une copie pixel par pixel**. Les différences restent visibles dans l'atelier et devront être corrigées avant la livraison artistique.

Une première pose clé de frappe a été générée avec **imagegen** à partir de la découpe frontale, en conservant l'identité et le costume : `03_assets/characters/seraphine/lookdev/seraphine-basic-attack-key-v2.png`. Une seconde passe de suppression du fond a été demandée à imagegen ; la transparence a été vérifiée hors du corps et de l'arme. La V1 de cette pose est conservée à côté de la V2. Une pose de préparation distincte, `03_assets/characters/seraphine/lookdev/seraphine-basic-windup-key-v1.png`, a ensuite été générée à partir de l'attente et de la frappe : lame ramenée à l'épaule, cheveux et costume soulevés avant le coup, fond transparent. Ces trois poses ont été générées séparément et peuvent différer dans leurs détails ; elles ne forment pas encore une animation articulée.

La nouvelle page `07_exports/web/seraphine-lookdev.html` confronte la planche aux trois poses à taille atelier et à taille de combat, sur fond neutre ou dans l'ambiance du jeu. On peut inspecter préparation et frappe séparément ou lire la séquence. Le combat tactique accepte `?seraphine=lookdev-v1` : Séraphine est affichée sur un plan 2,5D transparent dans la scène volumétrique. Le maillage de son image est déformé par zones pour la respiration, les cheveux et les pans extérieurs du costume, sans repeindre la texture. L'attaque de base passe par attente → préparation → frappe → attente. Une seule image entière est visible à chaque instant pour supprimer les silhouettes fantômes produites par le fondu précédent. L'anticipation, le déplacement de frappe et un arc d'énergie effilé sur la cible relient les poses. La progression tient compte du nombre d'images réellement rendues pour que les étapes ne disparaissent pas quand la scène ralentit. Ce mode est une **revue visuelle** : les raccords entre images distinctes restent abrupts, les pièces du costume ne sont pas encore séparées et il manque les compétences, les supers et les autres angles. Le mode tactique ordinaire et les anciens rigs ne sont pas remplacés.

## Suite de production contrôlée

1. Corriger le candidat fixe par comparaison frontale de la forme du visage, des mèches, des roses, de l'armure, de la taille, des ouvertures de jupe et de l'arme. Utiliser les vues profil, dos et trois quarts de la planche pour vérifier la cohérence ; une image ne fournit pas la géométrie cachée.
2. Séparer de manière contrôlée les pièces à animer : tête/visage, cheveux arrière et avant, torse, chaque bras, lame, pans avant et arrière, bottes. Préserver les détails et compléter les parties occultées. Le simple plan entier ne doit pas servir aux actions finales.
3. Construire une profondeur 2,5D pour ces pièces et des poses clés d'attente, déplacement, attaque de base, compétences, super et réactions. Contrôler les coutures et les occultations en mouvement dans la caméra du combat.
4. Si une rotation libre du personnage est requise, produire une sculpture/retopologie/UV/PBR manuelle depuis les quatre vues, puis valider ses rendus sous les mêmes lumières. La fidélité sous tous les angles ne peut être garantie par une seule découpe frontale.

**Critère avant propagation :** identité et silhouette convaincantes côte à côte avec la planche en gros plan et à taille de combat ; pas de parties plates ou de coutures visibles en animation ; attaques lisibles. Nyxara, Lysael et Voren restent hors de ce chantier tant que le procédé n'a pas satisfait cette revue pour Séraphine.

## Contrôles

`node tools/verify-shadow-seraphine-lookdev.mjs` vérifie l'alpha des trois poses, la page de comparaison et sa lecture, l'affichage à taille de combat, le chargement dans l'arène, les étapes préparation et frappe, l'arc sur la cible et l'absence de chevauchement des trois silhouettes. Captures : `02_production/lot-14/qa/`. Le test tactique existant contrôle l'absence de régression des règles, de la sauvegarde et de la vue mobile.
