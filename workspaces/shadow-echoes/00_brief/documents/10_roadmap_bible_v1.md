# Shadow Echoes - Roadmap et audit économique de la bible V1

Date : 25 septembre 2026. Statut : proposition de production, pas un engagement de calendrier ni un équilibrage validé.

Avancement complémentaire : `13_niveau_temoin_pont_des_serments.md` décrit la traversée jouable désormais intégrée (navigation 2,5D, compagnons et combat à trois compétences). Elle reste séparée des récompenses et de la progression du carnet. Les références artistiques reçues sont détaillées dans `12_cibles_artistiques_2026_09_25.md` ; leur qualité finale reste à produire.

Mise à jour du périmètre demandée par l'utilisateur : toutes les animations de base des quatre Mythiques entrent dans le premier lot de fondation, y compris leur présence animée sur les fiches. La validation d'un héros témoin sert à régler la méthode ; elle ne permet pas de livrer ce lot en laissant les trois autres sur des portraits figés. État de réalisation et limites : `11_fondations_et_animations.md`.

## Direction retenue pour cette roadmap

Conserver la priorité demandée : Séraphine, Nyxara, Lysael et Voren, avec une qualité artistique comparable aux références fournies. Construire une tranche représentative du jeu final avant de multiplier les contenus. La cible à long terme de la bible comprend 120 missions, trois difficultés, huit modes complémentaires, neuf mini-jeux et 50 héros ; ces volumes ne constituent pas le périmètre du prochain lot.

La bible est une source de conception. Ses propositions chiffrées, choix de moteur et recommandations commerciales ne sont pas assimilés à des instructions de mise en œuvre déjà approuvées.

Sources consultées : bible PDF V1.0 du 24 septembre 2026, 36 pages ; documentation du lot 2 ; modules actuels `heroes.mjs`, `profile.mjs`, `progression.mjs` et `edition-data.mjs`. Les pages 28 et 29 du PDF ont aussi été inspectées visuellement. Les calculs ci-dessous sont arithmétiques ; aucune nouvelle simulation de combat, campagne de joueurs ou mesure sur téléphone n'a été réalisée pour cet audit.

## Point de départ réel

| Domaine | Lot 2 actuel | Cible décrite par la bible |
| --- | --- | --- |
| Personnages | Quatre Mythiques, illustrations animées par maillages/calques | Modèles 3D articulés, vus en 2,5D, animation anatomique et mouvements secondaires |
| Combat de campagne | Groupe sur positions fixes ; base, une compétence, super ; garde | Déplacement, esquive, combo, trois compétences équipées, ultime, IA de compagnons |
| Progression | Niveaux 1-30 ; ascensions à 10 et 20 | Niveaux 1-100 ; passages à 20/40/60/80 et maîtrise finale à préciser |
| Talents | Trois branches de bonus | Branches qui transforment les actions et permettent différents équipements de compétences |
| Équipement | Arme, armure, accessoire, une relique ; améliorations +3 | Six pièces, ensembles 2/4, un artefact majeur et deux échos mineurs |
| Contenu | Une épreuve de campagne et un premier niveau pour chacun des neuf mini-jeux | Campagne complète, variantes, modes secondaires et progression propre à chaque mini-jeu |
| Invocation | Quatre héros déjà disponibles, tirages à 25 %, fragments, trois présentations | Acquisition, raretés, bannières, garanties et historique serveur |
| Sauvegarde | Carnet local et export/import | Comptes, inventaires et transactions autoritaires côté serveur |

Les interfaces, données, parcours et tests existants servent de référence fonctionnelle. Leur présence ne signifie pas que les exigences de production 3D ou d'économie en ligne sont déjà satisfaites.

## Économie : ce qui fonctionne dans la proposition

- Chaque activité possède une ressource principale et une source alternative : cela permet au joueur de choisir ses activités.
- La forge garantit les améliorations jusqu'à +20 sans destruction aléatoire ; les recettes essentielles d'alchimie garantissent le résultat de base.
- Les artefacts peuvent changer le fonctionnement d'une compétence, ce qui donne un intérêt aux objets au-delà des statistiques.
- Les invocations prévoient des probabilités affichées, une garantie Mythique et une protection pour le héros mis en avant.
- Les achats et équipements ne doivent pas modifier les dés, les grilles ou la vitesse compétitive des montures.

## Économie : chiffres vérifiés et problèmes à résoudre

### 1. Coût d'un héros et progression d'une équipe

Les totaux de la page 28 sont arithmétiquement corrects :

| Ressource | Un héros de 1 à 100 | Quatre héros, coûts additionnés |
| --- | ---: | ---: |
| Or | 2 850 000 | 11 400 000 |
| EXP | 1 078 000 | 4 312 000 |
| Essences | 465 | 1 860 |
| Pierres | 130 | 520 |

Ces totaux excluent équipements, artefacts, talents et éveils. La somme d'EXP des quatre héros ne permet pas de calculer un temps de jeu : il faut préciser si une victoire donne l'EXP à chacun, la partage entre participants ou produit des objets d'EXP distribuables. Le dernier segment, 81-100, représente environ 65 % de toute l'EXP d'un héros. Il convient de le réserver à une maîtrise tardive si l'on veut que le joueur puisse varier son équipe pendant l'histoire.

Recommandation : équilibrer le temps pour constituer une équipe de quatre utile, puis le temps pour perfectionner un héros. Séparer l'ascension, alimentée par des ressources de jeu, de l'éveil par doublons/fragments. Le prototype utilise encore des fragments dans l'ascension : il faudra une conversion explicite des anciennes sauvegardes.

### 2. Énergie et disponibilité du jeu

Une unité toutes les huit minutes produit au maximum 180 unités par jour, à condition de ne pas rester au plafond. La réserve de 120 se remplit en 16 heures. À 12 unités par activité au palier III, cela représente 15 entrées par jour sur la régénération seule, réparties entre toutes les activités concernées, et 10 entrées depuis une réserve pleine.

À définir : quelles activités consomment cette énergie, leur coût réel selon la durée, la dépense en cas de défaite, les quotas des mini-jeux et les gains hors quota. Cumuler énergie, nombre de tentatives et rendement décroissant sur la même activité serait particulièrement contraignant.

Recommandation : conserver un entraînement rejouable, limiter les récompenses avec une règle visible, et tester une réserve permettant une session quotidienne sans perte de régénération. Par exemple, 180 au lieu de 120 couvre 24 heures avec le rythme proposé ; cela reste un réglage à tester.

### 3. Invocations et revenus gratuits

Les taux de base totalisent bien 100 %. Au prix proposé de 160 cristaux :

- Un Mythique garanti en 80 tirages au plus représente 12 800 cristaux depuis un compteur neuf.
- Le héros de bannière, après éventuel échec du premier 50/50, demande au plus 160 tirages, soit 25 600 cristaux, si la garantie reste applicable sur la bannière visée.
- Ce sont des plafonds de tirages, pas des moyennes et pas des prix en euros.

Le revenu gratuit manque. À titre de sensibilité uniquement, 20 tirages gratuits par mois représentent quatre mois de budget pour 80 tirages et huit mois pour 160 ; 60 par mois représentent environ 1,3 et 2,7 mois. Ces exemples ne constituent pas une prévision ni un taux de revenu recommandé.

Avant intégration, spécifier :

- revenus récurrents par semaine et saison, séparés des récompenses uniques de lancement ;
- report des compteurs entre bannières et distinction permanente/événementielle ;
- compteur Épique+ commun aux tirages unitaires et x10 ;
- priorité entre garantie Épique+, augmentation Mythique et hard pity ;
- distribution de chaque héros à l'intérieur d'une rareté, conversion des doublons et coût des six éveils ;
- devenir des fragments excédentaires et accès aux fragments universels ;
- prix des produits seulement après validation de la progression gratuite.

La renormalisation Épique+ est significative : avec les taux de base proposés, limiter un tirage aux trois rangs supérieurs donne une probabilité Mythique de 1,2 / (18 + 7 + 1,2), soit environ 4,58 % sur ce tirage garanti. Le taux effectif global doit donc intégrer cette garantie et la montée du pity ; il n'est pas simplement 1,2 %.

Pour la tranche à quatre Mythiques, conserver une bannière de test clairement identifiée. Une bannière commerciale à cinq raretés exige un catalogue réellement disponible dans ces cinq raretés. La présentation cinématique doit suivre le résultat et sa rareté ; elle ne doit pas laisser croire qu'une animation plus longue augmente la chance.

### 4. Ressources, inflation et rattrapage

Le prototype vend un sceau d'invocation pour 150 or. Reporter directement ce taux dans la nouvelle économie serait incohérent : les 12 000 or d'une victoire de Survie au palier III permettraient 80 achats de sceaux. Les anciens sceaux, les nouveaux tickets et les cristaux doivent avoir une migration distincte, sans assimilation implicite.

Le jackpot des dés à 100 000 or ne peut pas être évalué sans sa fréquence et son quota. Comparer l'espérance des gains par minute, par énergie et par jour, avec les dépenses correspondantes. Le meilleur jeu pour obtenir une ressource doit rester identifiable sans rendre tous les autres inutiles.

Les Médailles d'Écho nécessitent un vrai barème d'échange, avec plafonds et prix. Sans cela, le filet de sécurité annoncé ne garantit pas l'accès à une ressource que le joueur ne souhaite pas obtenir dans son mini-jeu principal.

Le recyclage des doublons n'est pas une garantie de trouver une pièce précise. Avec 1 % de Mythique par coffre Abîme et des tirages indépendants sans autre garantie, 100 coffres ne donnent qu'environ 63,4 % de chance d'obtenir au moins un Mythique. Prévoir une fabrication ciblée ou un échange cumulatif pour les ensembles et pièces recherchés.

### 5. Équité et lisibilité

Des héros achetables et six éveils modifiant leur kit peuvent donner un avantage compétitif même si les skins ne changent aucune collision. Pour le PvP classé, recommander une normalisation explicite des niveaux, équipements et éveils, ou une autre règle testée et clairement annoncée.

Les ressources sont nombreuses. Les introduire progressivement dans le tutoriel, afficher leurs usages et sources, et éviter de demander simultanément or, points et plusieurs matériaux pour chaque petit changement d'arbre. Tester la réinitialisation gratuite pendant l'alpha pour favoriser l'exploration des builds.

## Arbitrages de cohérence à fermer au premier jalon

| Sujet | Écart ou ambiguïté | Proposition |
| --- | --- | --- |
| Séraphine | Présente dans les références d'invocation mais absente du tableau des dix Mythiques | Conserver Séraphine dans les quatre prioritaires ; corriger le catalogue sans remplacement automatique |
| Équipe 1+3+2 | Six héros nécessaires alors que quatre sont prioritaires | Jouer avec un héros et trois compagnons ; prévoir les interfaces des soutiens, les débloquer avec un catalogue suffisant |
| Ascension au niveau 100 | Le maximum est déjà 100 | Définir ce dernier passage comme maîtrise finale ou réécrire les caps ; préciser le coût de chaque passage |
| Points et Sceaux | 120 points annoncés, mais coûts détaillés de l'arbre absents | Définir quels nœuds coûtent points, Sceaux ou les deux ; tester qu'un arbre complet reste impossible |
| Recharge | Plusieurs plafonds de hâte et réduction coexistent | Définir l'ordre des opérations et la borne finale, commune à l'interface et au combat |
| Mini-jeux | Dés actuels à un dé, puzzle d'extinction, expédition immédiate | Adapter aux cinq dés, à l'alignement de runes et aux expéditions asynchrones de la bible |
| Survie | Prototype à durée fixe | Adapter aux dix vagues, rempart, fuites et choix de bonus temporaires |
| Moteur | Unity 3D proposé dans la bible | Choisir après une scène témoin et un benchmark sur les appareils cibles |

## Roadmap de réalisation

Les lots sont ordonnés par dépendances. Les lettres subdivisent le prochain lot utilisateur ; elles ne correspondent pas aux anciens numéros internes de dossiers.

| Étape | Livraison concrète | Critère de sortie |
| --- | --- | --- |
| Lot 3A - Référentiel et économie | Fiches définitives des quatre héros ; règles de combat ; tables de ressources/coûts ; revenus gratuits ; migration documentée ; cahier artistique avec comparaisons aux références | Aucun coût, compteur ou plafond critique ambigu ; simulation de progression possible avec hypothèses explicites |
| Lot 3B - Qualité visuelle et combat témoin | Un premier héros en vraie 3D vue en 2,5D, décor, ennemis, élite et boss ; déplacement, combo, esquive, trois compétences et ultime ; trois séquences de niveau reliées | Animation articulée, lisibilité en mouvement, sensations de combat et fidélité artistique évaluables dans un exécutable ; performance mesurée sur les cibles |
| Lot 3C - Les quatre Mythiques | Même traitement pour les quatre héros ; IA des trois compagnons ; hub animé ; fiches latérales ; compétences transformables ; XP, ascension et équipement ; une première tranche de progression 1-20 | Boucle hub → équipement → combat → récompense → amélioration complète pour chaque héros ; changements de build visibles en combat |
| Lot 3D - Sauvegarde et économie fiables | Comptes de test, base de données, reprise de session, inventaire, registre des gains/dépenses, tirages et garanties serveur, historique, outils d'équilibrage | Déconnexion et répétition d'une requête ne perdent ni ne doublent un gain ; sauvegardes migrées et restaurables ; invocations de test reproductibles |
| Lot 3E - Première alpha complète | Chapitre 1 de 12 missions, embranchements, élite et boss ; neuf mini-jeux avec chacun un niveau représentatif conforme aux règles ; transitions et bilans ; invocations mises en scène | Chaque activité possède tutoriel, victoire/défaite, récompenses et reprise ; expédition testée hors connexion ; réglages et parcours PC/mobile utilisables |
| Lot 4 - Profondeur et modes | Progression jusqu'à 40 puis 60 selon tests ; ensembles, artefacts et éveil ; premières runs, chasses, salles de donjon et tranche de Tour ; ensuite boss mondial, raid asynchrone, PvP et scénario saisonnier | Une boucle complète validée pour chacun des huit modes, avant multiplication de leurs niveaux ; plusieurs builds viables |
| Lot 5 - Bêta PC/mobile | Optimisation, commandes tactiles, accessibilité, audio, installateur, reprise après incident, instrumentation et tests humains ; économie revue sur données | Objectifs de performance atteints sur appareils nommés ; session prolongée testée ; progression gratuite mesurée ; absence de faille de duplication connue |
| Après bêta - Production du volume final | Chapitres 2-10, variantes Cauchemar/Abîme, extension des mini-jeux et des huit modes, progression 100, nouveaux héros jusqu'au catalogue visé | Chaque ajout respecte le standard artistique et mécanique validé ; coûts de production et d'exploitation suivis |

Les premières versions des compétences et du système d'équipement sont nécessaires dès le lot 3B, puis généralisées au lot 3C. Les tables serveur du lot 3D reprennent les règles et schémas du lot 3A ; il faut éviter une seconde économie incompatible. Les niveaux du lot 3E réutilisent le combat et les assets validés aux étapes précédentes.

### Contenu précis de la première alpha

- Quatre Mythiques réellement distincts : locomotion, attentes, attaques, réactions, trois compétences équipables, ultime et dévoilement d'invocation.
- Hub central et fiches avec Infos, Équipement, Talents, Ascension et Compétences ; comparaison avant/après des changements.
- Six emplacements d'équipement, un artefact majeur et deux échos mineurs dans le modèle ; un petit catalogue permettant au moins deux builds testables par héros.
- Chapitre 1 complet avec ennemis de rôles différents, un élite et un boss à phases, choix de route, récompenses sécurisées et règles de reprise.
- Survie à dix vagues avec rempart ; caravane avec checkpoints ; course contre fantômes ; pêche avec tension ; dés à cinq dés et conservation ; mémoire ; alchimie à recette garantie ; runes par alignements ; expédition temporisée côté serveur.
- Cinématiques d'invocation courtes ou longues selon le résultat, passables, avec attribution indépendante de la lecture de l'animation.
- Aucun achat réel nécessaire pour tester l'ensemble. Les taux de la future bannière générale restent dans un environnement de simulation tant que le catalogue ne permet pas son fonctionnement honnête.

## Validation économique à produire avant de figer les chiffres

Simuler des profils gratuits jouant 15, 30 et 60 minutes, ainsi qu'un profil revenant après plusieurs jours. Séparer compte neuf et compte avancé, premières victoires et répétitions, héros principal et équipe complète. Projeter 7, 30 et 90 jours.

Mesurer : temps jusqu'à une première amélioration utile, aux ascensions et au deuxième build ; ressources bloquantes ; minutes imposées par activité ; revenus/dépenses nets ; invocations obtenables et atteinte des garanties. Mesurer aussi les résultats des joueurs moins performants, pas seulement les victoires parfaites.

Pour les tirages, calculer exactement ou simuler les distributions avec compteur Épique+, soft pity, hard pity et garantie du héros mis en avant. Publier taux de base, taux au compteur courant et règle de garantie ; ne pas présenter le modèle de défaite des pages 30-31 comme une probabilité mesurée.

## Calendrier et charge

Pas de date de livraison fiable sans connaître les personnes disponibles, la capacité de production 3D et les appareils visés. La bible prévoit environ 40 clips de base par héros : quatre héros représentent déjà environ 160 clips, avant ennemis, boss et variantes. Les familles de rigs peuvent réduire le travail, mais la fidélité et l'identité de chaque héros doivent rester contrôlées.

Chronométrer la production du premier héros et du niveau témoin, puis estimer les trois autres et le chapitre 1 à partir de ce résultat. Réserver explicitement du temps pour retouches artistiques, QA, optimisation mobile et équilibrage. La version finale nécessite des compétences de modélisation/rig/animation, développement gameplay, interface, backend, audio et test ; une succession d'ajouts d'écrans ne remplace pas ces travaux.

Le prochain objectif livrable est le lot 3A puis 3B : un référentiel cohérent, et une preuve jouable du niveau artistique et du combat attendus. L'objectif de la première alpha est atteint au lot 3E ; les 120 missions et 50 héros restent l'extension de production après validation de cette base.
