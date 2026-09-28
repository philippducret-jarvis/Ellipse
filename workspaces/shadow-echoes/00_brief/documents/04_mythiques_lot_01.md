# Lot 01 — héros mythiques

## Instruction de production du 23 septembre 2026

L’utilisateur demande de commencer uniquement par les héros mythiques et confirme que la qualité des designs fournis est la cible du projet. Le lot est lancé. La cible ne doit pas être remplacée par une esthétique simplifiée pour annoncer une livraison plus rapide.

## Périmètre du lot

Séraphine, Fleur de l’Abîme ; Nyxara, Souveraine du Néant ; Lysael, Chant des Mondes ; Voren, Empereur des Cendres. La mention Mythique a été lue sur chacune de leurs fiches. Ce premier groupe ne prétend pas recenser tous les mythiques des archives. Séraphiel et Kaelor, lus Légendaire sur les fiches examinées, ne sont pas produits dans ce lot.

## Travail livré dans cette première passe

- Quatre nouvelles bases HD de personnages entiers, en PNG RGBA 1024 × 1536, produites avec image_gen à partir des références. Chaque fichier est conservé dans 03_assets/characters sous le dossier du héros.
- Quatre définitions de héros : identité, rôle, élément, références, critères visuels et statut de production.
- Douze compétences exécutables dans un banc de simulation : dégâts, saignement, brûlure, contrôle, drain, soins et boucliers. Les noms et valeurs des compétences sont des propositions de prototype, distinctes des valeurs affichées dans les maquettes.
- Atelier local avec sélection des héros, comparaison des fiches originales et nouvelles bases, zoom, essais de compétences, pause, réinitialisation et journal d’effets.
- Rapports techniques sur dimensions, transparence et empreintes des fichiers. Ces contrôles ne valent pas validation artistique.

## Contrat de qualité

Conserver le visage, les proportions, la silhouette, le costume, les ornements, la palette et les matières propres à chaque design. La référence originale garde autorité. Les ornements et les drapés reconstruits par génération peuvent diverger ; la première passe reste au statut revue.

Valider successivement la fidélité sur image fixe, le détourage sur fonds clairs et sombres, les articulations, les mouvements, puis le rendu à l’échelle réelle du combat. La fidélité en mouvement ne peut pas être déduite d’un beau portrait.

## Étapes restant dans la production des héros

- Corriger les écarts repérés en comparaison directe, notamment bijoux, ronces, couronnes, visages et drapés.
- Nettoyer le détourage et isoler cheveux, cape, armes et membres sans trous aux articulations.
- Construire les rigs et réaliser attente, déplacement, attaque, compétence, ultime, impact et défaite.
- Intégrer ces animations dans une mission et contrôler lisibilité, fluidité et fidélité à la référence.

Aucun modèle 3D, rig final ou personnage animé prêt au combat n’est déclaré livré. Le banc de compétences est un outil de développement des règles, et non une représentation de l’animation finale.

## Ouvrir et reproduire

Dans le Studio : Shadow Echoes → lien « Atelier des mythiques — lot 01 » dans les actions rapides. Le serveur local dédié utilise http://127.0.0.1:4314/.

Commandes disponibles à la racine du dépôt : pnpm shadow:lot01, pnpm shadow:serve et pnpm shadow:test. Le manifeste et les prompts sont conservés dans 02_production/lot-01.
