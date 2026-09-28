# Shadow Echoes — lot 2 : Les Gardiens

Le deuxième lot utilisateur correspond au dossier technique `02_production/lot-06`. Il complète la première édition de la Citadelle et conserve les quatre héros mythiques et les dix premiers niveaux.

Accès : http://localhost:4273/workspaces/shadow-echoes/07_exports/web/citadel.html

## Parcours personnage

Dans Mythiques, la navigation latérale reprend les rubriques des fiches fournies : **Infos, Équipement, Talents, Ascension, Compétences**. Sélection du héros en haut ; illustration animée et données du héros côte à côte. Sur mobile, les rubriques passent au-dessus de l’illustration.

- Infos : niveau, XP, palier, vie et attaque effectives, bonus de soins et de recharge, choix du héros d’aventure, entraînement.
- Équipement : arme, armure et accessoire, transfert entre porteurs compatibles, amélioration jusqu’à +3, accès aux reliques.
- Talents : trois branches et neuf talents propres au nom de chaque Mythique, trois rangs par talent, détails sélectionnables, prérequis et réinitialisation gratuite.
- Ascension : paliers, ressources requises et XP conservée en réserve.
- Compétences : base, compétence et super, valeurs effectives après bonus de campagne.

Les chiffres des maquettes contradictoires sont des références graphiques, pas des spécifications d’équilibrage. Les valeurs de cette édition sont définies dans les modules de jeu.

## Expérience, niveaux et ascension

Chaque victoire attribue de l’expérience aux personnages ayant commencé l’activité. La campagne récompense les quatre ; les autres activités récompensent le héros choisi au départ. Une défaite ne retire pas de ressources. Un résultat ne peut être encaissé deux fois.

| Activité | XP de héros par victoire | Essences |
| --- | ---: | ---: |
| Campagne | 220 à chacun des quatre | 2 |
| Survie | 160 au héros d’aventure | 1 |
| Expédition | 120 au héros d’aventure | 1 |
| Autres jeux et mini-jeux | 80 au héros d’aventure | 1 |

Le rang Voyageur et l’XP de chaque personnage sont distincts. L’XP nécessaire au niveau suivant vaut `100 + 35 × (niveau − 1)`. Le niveau augmente automatiquement. Le palier initial est 10, puis 20 et 30 après ascension. L’XP obtenue au palier reste stockée et est utilisée dès l’ascension. À niveau 30, elle ne débloque pas d’autre niveau dans cette édition.

| Ascension | Condition | Or | Fragments du héros | Essences | Effet |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Niveau 10 | 300 | 40 | 3 | Plafond 20, +5 % vie et dégâts, +2 points de talent |
| 2 | Niveau 20 | 600 | 80 | 6 | Plafond 30, +5 % vie et dégâts supplémentaires, +2 points |

L’entraînement facultatif consomme 20 fragments et `100 × niveau` or pour compléter l’XP du niveau actuel. Il n’est pas utilisable au palier. Jouer des aventures permet de monter de niveau sans entraînement.

## Talents et équipements

Un point initial, puis un point tous les deux niveaux, et deux par ascension. Les rangs suivants d’une branche demandent le rang 2 du talent précédent, ainsi que le niveau requis. La troisième ligne demande la première ascension. Les effets couvrent dégâts, vie, énergie, recharge, soins, boucliers et puissance du super ; ils sont adaptés aux pouvoirs du héros. Réinitialiser rend tous les points, sans coût.

Neuf équipements : quatre armes personnelles disponibles au départ, trois armures et deux accessoires à forger avec l’or de jeu ou à gagner en aventure. Une pièce ne peut avoir qu’un porteur ; les armes restent réservées au Mythique correspondant. Les améliorations +1/+2/+3 coûtent 60/120/180 or et ajoutent chacune 30 % au bonus initial de la pièce. La pièce améliorée garde son rang lors d’un transfert.

Les six reliques du premier lot restent équipables dans un emplacement distinct. Les multiplicateurs cumulés de vie et dégâts sont plafonnés à ×2. Les bonus sont pris en compte au démarrage du combat. L’équipement ne change pas encore la tenue illustrée du personnage.

## Combats, ennemis et règles

Le Grimoire présente le Veilleur du seuil, la Cantatrice du Néant et le Gardien Cendrelame. Ils occupent les trois phases de campagne : frappe ciblée, attaque de groupe, puis alternance et fureur à 50 % de vie.

**1 : attaque de base ; 2 : compétence ; 3 : super à 100 énergie ; Espace : garde ; P : pause.** Les flèches gauche/droite changent de héros. Les bases assistées sont désactivables. La garde réduit les dégâts de 65 % pendant 3 secondes et recharge en 12 secondes. Nyxara interrompt les charges. Lysael soigne et protège. Les héros tombés ne ressuscitent pas entre les phases ; les survivants récupèrent 15 % de leur vie.

Survie et Caravane disposent aussi de bases, compétences et supers adaptés : soin/réparation avec Lysael, immobilisation avec Nyxara, frappes de zone avec Séraphine et Voren, bouclier sur le super de Voren. Les actions génératrices remplissent la jauge. Les pouvoirs ne sont pas ajoutés aux puzzles, à la pêche ou aux dés, dont les règles restent propres à l’activité. Les règles sont accessibles avant et pendant chaque jeu ; leur ouverture suspend le combat embarqué.

## Invocation et présentation

| Rituel | Coût | Fragments | Durée nominale |
| --- | ---: | ---: | ---: |
| Appel | 1 sceau | 20 | 4,2 s |
| Résonance | 2 sceaux | 45 | 6 s |
| Convergence | 3 sceaux | 75 | 7,8 s |

Les trois scripts traversent sceau, rassemblement, silhouette, dévoilement et résultat. Le nombre de cercles, les constellations, la durée et l’intensité varient avec le rituel ; la couleur suit le Mythique. Probabilité explicite de 25 % pour chacun des quatre, quel que soit le rituel. L’attribution est enregistrée une seule fois avant la scène. Passer ou fermer ne retire ni ne double le résultat ; le héros apparaît dans l’historique.

Les quatre portraits ont des mouvements d’attente, une respiration et des mouvements secondaires. La campagne ajoute déplacements d’action, effets de roses, néant, lumière ou braises, annonces de supers, charges et défaite des ennemis. Les changements de menus, entrées d’activité, cartes, runes et résultats ont une présentation animée. Les options de mouvement et de réduction d’animation sont prises en compte.

**État artistique :** ces animations combinent maillage pondéré, calques articulés pour Séraphine, profondeur de présentation et effets procéduraux. Elles ne constituent pas encore quatre rigs anatomiques complets avec articulations indépendantes de chaque coude, poignet et vêtement. La fidélité finale aux planches et l’animation de niveau production restent à valider ; cette livraison ne les certifie pas.

## Sauvegarde et vérifications

Les anciens carnets sont migrés sans perte de ressources, héros, victoires ou reliques. Les nouveaux champs incluent XP, ascensions, talents, équipement et rangs d’amélioration. Les objets déjà mérités dans l’ancienne édition sont ajoutés à la migration. Export et import restent accessibles dans les paramètres.

Commandes : `pnpm shadow:citadel`, `pnpm shadow:test`, `pnpm shadow:verify-edition`, `pnpm shadow:verify-citadel`, `node tools/verify-shadow-echoes-adventures.mjs`. Les preuves, résultats et limites sont dans `02_production/lot-06/validation.json`. Le test d’ascension utilise un carnet de palier préparé et importé par l’interface ; il ne prétend pas avoir joué toute la progression 1–30 dans le navigateur.

Les deux nouveaux atlas sont enregistrés dans `03_assets/enemies/guardians-v2.png` et `03_assets/items/equipment-atlas-v1.png`. Création par l’outil imagegen intégré ; prompts et références exactes dans `02_production/lot-06/image-prompts.json`.
