# Shadow Echoes — faisabilité du développement de A à Z

> Décision du 27 septembre 2026 : la caméra latérale évoquée dans les hypothèses initiales est écartée. La direction active est une vue 2,5D surélevée en trois quarts. Les quatre GLB du premier lot restent des études sans peau pondérée ; voir `16_modele_seraphine_tranche_qualite_2026_09_27.md`.

## Réponse

Je peux prendre en charge la conception détaillée, la programmation, l’intégration des ressources, les outils de contenu, les sauvegardes, les tests, l’optimisation et la préparation de builds. Le travail doit être conduit par étapes vérifiables, en commençant par une tranche jouable.

Je ne peux pas garantir à partir de ces images seules un résultat commercial de grande ampleur, une fidélité parfaite en mouvement ou une production entièrement autonome. Le rendu final dépendra des ressources réellement produites, de la puissance disponible, des essais sur appareils et des validations artistiques.

## Socle Ellipse constaté

Le dépôt dispose d’un Studio, d’un catalogue de projets sur disque, d’un moteur et de pipelines de production. La section Shadow Echoes utilise le format workspace existant. Ces outils offrent un point de départ ; les mécaniques propres au jeu restent à implémenter et à valider.

L’affichage 2.5D et la caméra latérale du manifeste restent des hypothèses de cadrage. Depuis le lot 02, une simulation web spécifique à Shadow Echoes alimente une épreuve jouable avec quatre illustrations RGBA, décor et effets. Un build de prototype est déclaré via l’entrée preview standard ; il ne constitue pas encore le moteur d’action final avec rigs, déplacements et collisions.

## Architecture proposée

Décrire héros, compétences, équipements, missions et tables de récompenses dans des données versionnées. Séparer simulation du combat, présentation, interface et sauvegarde. Étendre les contrats GDL et le moteur Ellipse uniquement lorsque le prototype démontre les besoins. Vérifier la compatibilité avant de reprendre un système d’un autre jeu du dépôt.

Prévoir une sauvegarde versionnée, des migrations et une récupération après fichier invalide. Si des services en ligne sont retenus, les récompenses et transactions doivent être validées côté serveur ; une sauvegarde locale ne suffit pas à une économie en ligne.

## Travail réalisable ici

- Règles et documents de conception ; données de héros et missions.
- Code du combat, IA, progression, inventaire, talents, invocations et mini-jeux.
- Interfaces, import des assets, outils de vérification et intégration audio.
- Tests des règles critiques, parcours complets, profilage et corrections.
- Builds pour les plateformes dont la chaîne de compilation est disponible.

## Ce qui nécessitera une participation extérieure

Tes choix artistiques et de périmètre, puis tes retours de jeu. La création d’assets avancés peut demander des outils supplémentaires, du matériel ou des artistes. Les comptes éditeur, signatures, appareils de test, services payants et publication sur les boutiques nécessitent les accès et décisions correspondants. L’exploitation d’un jeu en ligne reste un travail continu après la sortie.

## Vérifications à prévoir

Dégâts et statuts, temporisations, ciblage, récompenses uniques, probabilités d’invocation, sauvegarde/reprise, navigation et performances sur le matériel cible. Fixer des seuils mesurables au cadrage ; ne pas annoncer de fréquence d’images ou de date de livraison sans prototype et mesures.

## Prochaine étape proposée

Mise à jour du 24 septembre 2026 : Séraphine, Nyxara, Lysael et Voren disposent de bases HD, d’un banc de compétences et d’une épreuve jouable en trois phases. La suite artistique reste la fidélité fine, les rigs et les animations ; l’épreuve permet de les contrôler avec les compétences fonctionnelles. Le Gardien Cendrelame reste une proposition de mission ultérieure.
