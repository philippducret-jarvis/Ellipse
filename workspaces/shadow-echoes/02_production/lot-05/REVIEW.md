# Première édition — bilan de vérification

Les dix activités ont un premier niveau accessible depuis la Citadelle. La campagne reprend l’épreuve des Mythiques en trois phases ; les neuf autres activités ont leurs propres règles et conditions de fin. Les récompenses rejoignent le même carnet local.

## Vérifications accomplies

- 38 tests automatiques de règles : combat, animations, invocations, fragments, bonus de reliques, quêtes, validation du carnet, conditions de victoire/défaite, résolution de 100 puzzles runiques et simulations des jeux d’action.
- Parcours navigateur : hub → invocation d’un héros aléatoire → fragments → élévation → sélection → récompense de quête. Les coûts et résultats sont conservés.
- Victoires obtenues au travers des commandes rendues dans runes, alchimie, expédition, mémoire, dés et pêche. Pas de mutation de simulation pour forcer le résultat.
- Victoires navigateur dans défense de caravane, course, survie et campagne. La campagne communique son résultat depuis l’iframe attendu ; sa récompense et sa relique sont versées une seule fois.
- Équipement de la Lune du Néant sur Nyxara, bonus affiché. Les tests du moteur vérifient l’augmentation réelle de dégâts et de vie des reliques.
- Export JSON, import avec aperçu et confirmation, rejet d’un fichier invalide, persistance après rechargement.
- Sept écrans principaux à 390 pixels sans débordement horizontal. Captures du hub, des Mythiques, de l’invocation, des reliques et de la caravane examinées visuellement ; ajustement des espacements mobiles.
- TypeScript Studio : aucune erreur après ajout du lien principal.
- Édition portable vérifiée sur son propre serveur local : hub, dix accès, ressources chargées et comparateur de références. Correction d’un delta de temps négatif au premier rafraîchissement de l’ancien atelier.

Rapports : `validation.json`, `citadel-browser-report.json` et `citadel-adventures-report.json`. Les captures de test sont dans `tmp/shadow-echoes/citadel-*.png`.

## Ressources et limites

Nouveau décor de citadelle 1536 × 1024 et atlas RGBA 1254 × 1254, générés avec imagegen intégré. L’atlas réunit les six reliques, le convoi, la monture et un spectre. Les images ne sont pas découpées physiquement : les cases sont sélectionnées au rendu. Prompts exacts dans `image-prompts.json`.

Les jeux d’action emploient des déplacements de sprites, des effets et des animations limitées. Les quatre héros ont leurs mouvements actuels, pas encore tous les rigs anatomiques finaux. La campagne conserve son ennemi symbolique provisoire. Les musiques, la campagne étendue, le multijoueur et les services en ligne ne sont pas livrés. Cette première édition est un ensemble jouable et testable, sans approbation automatique de la fidélité finale aux références.
