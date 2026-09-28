# Lot 02 — L’Épreuve des Échos

## Ce qui est jouable

Une épreuve de combat d’équipe en trois phases, avec Séraphine, Nyxara, Lysael et Voren. Les douze compétences du lot 01 sont réutilisées dans une simulation commune. Les attaques de base sont assistées par défaut ; le joueur gère les compétences spéciales, ultimes, interruptions et la garde de groupe.

L’Écho du seuil vise un héros ; l’Écho du chœur frappe le groupe ; le Cœur des Échos alterne les deux et gagne 30 % de dégâts sous 50 % de vie. Chaque attaque est annoncée avant l’impact. Nyxara peut annuler une attaque annoncée. La garde réduit les dégâts de 65 % pendant trois secondes, avec douze secondes de recharge. Entre les phases, les survivants récupèrent 15 % de leur vie maximale. Aucun soin ne ressuscite les héros tombés.

L’épreuve peut être gagnée, perdue et recommencée. La victoire conserve un Sceau des Quatre, le nombre de victoires, le meilleur temps et le meilleur nombre de survivants. Ce bilan local n’est pas un inventaire ni une économie de jeu. Une sauvegarde invalide est ignorée ; un stockage indisponible est signalé sans bloquer le combat. La sauvegarde dépend du navigateur et de l’adresse utilisés. Utiliser l’adresse du Studio pour conserver le même carnet.

## Accès

Dans Ellipse : Shadow Echoes → « Jouer l’Épreuve des Échos — lot 02 » ou « Jouer la preview ».

Adresse principale : http://localhost:4273/workspaces/shadow-echoes/07_exports/web/play.html

Le serveur autonome sur le port 4314 donne également accès au même chemin. L’atelier et son comparateur restent accessibles via « Collection des Mythiques ».

## Commandes

- Flèches gauche/droite : changer de héros.
- 1, 2, 3 : compétence de base, compétence spéciale, ultime.
- Espace : garde de groupe.
- P ou Échap : pause. Les compétences restent bloquées pendant la pause, le changement de héros reste possible.
- Boutons tactiles/clics disponibles pour chaque action.

Quitter l’onglet suspend automatiquement la simulation ; la reprise reste manuelle. Il n’y a pas de rattrapage des dégâts après suspension de l’ordinateur. Les sons synthétiques sont désactivés par défaut et activables dans la barre supérieure. Les préférences de réduction des animations du système sont respectées.

## Direction artistique et limites actuelles

Le décor HD a été généré avec l’outil intégré image_gen à partir de la référence « ruines_de_l_aube_sous_la_lune_rouge.png ». La nouvelle plaque conserve l’architecture gothique, la lune rouge, les matières de pierre, les bannières et les braseros ; elle ne contient ni interface ni personnage peints. Le prompt exact est conservé dans `02_production/lot-02/image-prompts.json`.

Les héros utilisent leurs bases RGBA du lot 01, sans dégrader leurs fichiers maîtres. Les déplacements à l’attaque sont de légers mouvements de l’illustration entière, accompagnés d’effets procéduraux. Ce ne sont pas des animations articulées. L’adversaire est une manifestation runique procédurale de test, pas le Gardien Cendrelame final. Ce lot valide une boucle de combat, pas la direction artistique finale ni un niveau d’exploration d’action.

La cible de fidélité aux designs fournis reste inchangée. Reste à produire : corrections fines des héros, séparation des éléments, rigs, animations articulées, déplacements/esquive, collisions, ennemis illustrés/animés, audio final, campagne et vraie progression d’équipement. Aucun nouveau héros non mythique n’a été ajouté.

## Reproduction

`pnpm shadow:lot01` reconstruit l’atelier. `pnpm shadow:trial` reconstruit l’épreuve et son entrée preview Ellipse. Les deux scripts conservent les fichiers sources du workspace ; la reconstruction du lot 01 ne rétrograde pas le statut jouable du lot 02.

`pnpm shadow:test` vérifie les simulations ; `pnpm shadow:verify-trial` vérifie le parcours navigateur avec le Studio lancé. Les captures et le rapport de navigateur sont écrits dans `tmp/shadow-echoes/`.
