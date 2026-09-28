# Revue : fondations du mouvement

Statut : version de travail intégrée, qualité artistique non validée.

L'intention du lot est de sortir des portraits déformés. Les quatre héros utilisent maintenant des volumes, des articulations et des courbes de mouvement ; les illustrations de référence sont conservées. Les volumes procéduraux sont trop schématiques pour satisfaire la fidélité demandée. Ce constat interdit de présenter le lot comme une livraison artistique finale.

Le socle contient 42 états par héros, dont les phases de compétences, et quatre exports GLB. Les mêmes sources pilotent les fiches, le hub, les invocations, la campagne, Survie et Caravane. Les déplacements de Survie sont combinés aux gestes de combat sur le haut du corps.

Le prototype reste sur ses anciennes règles de campagne, ses niveaux et son économie locale. Les règles de la bible sont versionnées et calculées dans un module de conception séparé ; le passage au combat à trois compétences actives, la nouvelle économie et sa migration ne sont pas déclarés accomplis.

Voir `animation-manifest.json`, `model-exports.json`, `economy-audit.json` et, après réussite de la vérification navigateur, `browser-validation.json`. Les 53 tests de logique ont passé lors du premier contrôle ; les corrections ultérieures font l'objet de vérifications ciblées. Ne pas déduire la fidélité artistique ou une fréquence d'images sur téléphone du passage de ces tests.

## Suite : niveau du Pont des Serments

Une traversée 3D vue en 2,5D est désormais accessible par le bouton principal de la Citadelle (`ruins.html`). Elle comprend trois rencontres, sept adversaires, un boss, la navigation des quatre héros, trois compétences actives, un super, l'esquive, le soin, l'interruption, deux portes et une source à usage unique. Elle utilise son propre moteur de combat et son propre meilleur temps local ; l'ancienne économie du carnet n'est pas migrée.

La suite générale de tests a passé 60 tests avant les dernières retouches ; les neuf tests ciblés du niveau passent après celles-ci, dont une traversée intégrale sans modification directe des PV adverses. Rapport de contrôle navigateur : `ruins-browser-validation.json`. Détail du périmètre et limites : `00_brief/documents/13_niveau_temoin_pont_des_serments.md` à partir de la racine de l'espace Shadow Echoes.

Les personnages restent les études volumétriques précédentes. Le décor est une scène procédurale originale servant de test d'intégration. La fidélité aux planches, les maillages et pondérations de production, l'équilibrage final et les performances sur appareils réels ne sont pas validés.
