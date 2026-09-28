# Architecture de cohérence V6 — Convergence

## Décision de reprise

La version précédente mélangeait deux produits incompatibles :

- des maquettes raster séduisantes mais figées ;
- des écrans Godot fonctionnels mais visuellement pauvres et sans continuité de données.

La V6 supprime cette séparation dans le parcours principal. Les images deviennent des couches artistiques non interactives. Les informations, boutons, jauges, sélections, règles et zones de jeu sont des contrôles Godot natifs placés au-dessus. Une même source de données alimente tous les écrans.

## Sources de vérité

### Personnages

`04_runtime/godot/data/guardians.json` est le registre canonique des 24 gardiens adultes.

Chaque entrée définit :

- identifiant et nom public ;
- âge, rareté, rôle et élément ;
- titre, faction et compétence signature ;
- accent chromatique ;
- chemin vers l’unique illustration de référence.

Le hub, la collection, le gacha, la fiche, l’équipement, la garde-robe, le lien, le combat et les activités chargent ce même fichier. La sélection courante est conservée par `main.gd` et transmise à chaque module.

### Navigation

`04_runtime/godot/data/screen_graph.json` décrit 31 écrans et 90 routes explicites. Tous les écrans sont atteignables depuis le titre. Les variantes PC et mobile partagent les mêmes destinations et le même état.

### Direction visuelle

Le système repose sur :

- fonds illustrés plein écran ;
- verre noir bleuté semi-transparent ;
- filets or, cyan, violet ou rose selon la fonction ;
- typographie crème à hiérarchie courte ;
- portraits détourés par cadrage, jamais utilisés comme captures d’écran complètes ;
- contrôles natifs avec états survolé, pressé et désactivé.

La carte des failles utilise `astral-world-map-v1.png` comme atlas, puis place six destinations natives au-dessus des cités illustrées.

## Modules interactifs

### Hub et collection

- Hub PC : destinations, personnage actif, mission prioritaire, activités et bandeau des 24 gardiens.
- Hub mobile : personnage actif, mission et grille tactile pleine largeur.
- Collection PC : dossier, scène personnage, bannière gacha et bandeau des 24 gardiens.
- Collection mobile : scène et fiche en deux zones, puis bandeau horizontal tactile.
- Un clic sur un gardien met à jour tous les écrans suivants.

### Combat de convergence

Boucle jouable :

1. cliquer ou toucher la chambre pour lâcher une Orbe ;
2. laisser la gravité et les collisions rapprocher les Orbes ;
3. fusionner deux Orbes de même rang ;
4. maintenir un combo inférieur à 2,4 secondes ;
5. remplir Magie et Surpuissance ;
6. briser le cœur du Léviathan avant le débordement.

Pouvoirs :

- `Q` / Puits astral : attire toutes les Orbes vers le centre pour 35 % de Magie ;
- `E` / Ultime : purge jusqu’à huit Orbes et inflige une rupture majeure pour 100 % de Magie ;
- `R` / Surpuissance : augmente toutes les Orbes d’un rang et endommage le boss pour 100 % de Surpuissance.

Défaite : quatre Orbes présentes dans la zone rouge.  
Victoire : cœur astral à 0 %.

### Danse des constellations

- quatre pistes ;
- commandes `A`, `S`, `K`, `L` ou quatre boutons tactiles ;
- fenêtres Juste, Bien et Parfait ;
- une erreur remet le combo à zéro ;
- objectif : 9 000 points avant la fin.

### Chasse astrale

- cibles mobiles temporisées ;
- clic ou toucher direct ;
- cible dorée à valeur triple ;
- Vision astrale qui agrandit et ralentit les cibles ;
- les tirs perdus et cibles manquées interrompent le combo.

### Atelier des tenues

- trois matières : Soie astrale, Cristal prismatique et Or céleste ;
- huit contraintes à résoudre dans le bon ordre ;
- chaque réussite augmente le multiplicateur ;
- une erreur retire 250 points sans bloquer la partie ;
- l’indice révèle la prochaine matière.

## Adaptation PC et mobile

Le mobile n’est pas une réduction homothétique du PC :

- suppression des panneaux secondaires non essentiels pendant le jeu ;
- chambre et pistes verticales agrandies ;
- boutons tactiles répartis sur toute la largeur ;
- collection recomposée en deux zones au lieu de trois colonnes ;
- carte illustrée verticale avec fiche régionale sous l’atlas ;
- même identifiant de gardien et même illustration sur les deux formats.

## Validation automatique

`tools/verify-orbes-v6-consistency.mjs` contrôle :

- 24 personnages uniques et adultes ;
- 24 illustrations présentes ;
- 31 écrans uniques ;
- validité des 90 routes ;
- accessibilité des 31 écrans depuis le titre ;
- consommation du registre canonique par le catalogue, le combat et les activités ;
- 31 captures PC ;
- 17 captures mobiles ;
- présence de contrôles reliés ;
- quatre boucles jouables.

Le smoke test de gameplay vérifie de manière déterministe :

- drop d’Orbe, Puits astral, Ultime et Surpuissance ;
- note parfaite au jeu de rythme ;
- destruction d’une cible dorée ;
- résolution complète de l’atelier.

## État honnête

Cette version est une tranche verticale jouable et compilée, pas un jeu commercial terminé.

Acquis :

- cohérence visuelle et fonctionnelle du parcours principal ;
- 24 personnages disponibles dans une source commune ;
- navigation complète ;
- quatre boucles interactives ;
- export Windows et paquet mobile web.

Restent nécessaires pour une production commerciale :

- modèles 3D finalisés, riggés et animés pour les 24 gardiens ;
- animations faciales, doublage et VFX personnalisés ;
- contenu de campagne, ennemis et boss supplémentaires ;
- équilibrage long terme, sauvegarde serveur et télémétrie ;
- backend gacha sécurisé, paiements et conformité régionale ;
- SDK Android, signature et validation sur appareils physiques ;
- tests utilisateurs, performance, accessibilité et certification boutique.

