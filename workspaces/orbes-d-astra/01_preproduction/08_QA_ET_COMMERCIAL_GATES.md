# QA et portes commerciales

## Définition des sévérités

- **P0** : perte d’argent/données, faille sécurité, achat erroné, crash généralisé.
- **P1** : progression bloquée, mission impossible, inventaire incohérent.
- **P2** : mécanique ou rendu nettement dégradé.
- **P3** : défaut cosmétique sans impact fonctionnel.

Une release candidate contient 0 P0, 0 P1 et une liste acceptée de P2.

## Porte gameplay

- règles couvertes par tests unitaires ;
- simulation déterministe vérifiée sur 10 000 seeds ;
- aucun soft lock en 100 heures automatisées ;
- télégraphies de boss reconnues par 80 % des testeurs ;
- les trois rôles d’escouade ont une décision utile ;
- aucune mission n’exige un héros précis non prêté ;
- difficulté Histoire, Normale et Maître terminables.

## Porte art 3D

- tous modèles listés dans manifeste ;
- LOD, textures et rigs valides ;
- clipping inspecté sur matrice d’animations ;
- expressions et lèvres lisibles ;
- éclairage peau cohérent sur les trois régions ;
- aucune partie du corps sexualisée par déformation ou cadrage accidentel ;
- mode réduction flash validé ;
- 30/60 FPS selon cible.

## Porte UI

- 360×800 à 4K ;
- safe areas et encoches ;
- clavier, souris, tactile et manette ;
- navigation sans souris ;
- tailles 100/125/150 % ;
- contraste et signaux non colorimétriques ;
- langue française sans troncature ;
- confirmation claire avant toute dépense.

## Porte économie

- 10 millions de tirages simulés par bannière ;
- taux observés dans intervalle attendu ;
- pity/garantie/carry testés aux frontières ;
- transactions idempotentes ;
- restauration des achats ;
- devise réelle affichée ;
- historique et support ;
- build territoriale alternative ;
- revue juridique signée.

## Porte performance

- PC minimum : 60 FPS p95 dans combat cible ;
- mobile cible : 30 FPS p99 sans thermal shutdown sur 20 minutes ;
- aucun hitch > 100 ms après warmup ;
- mémoire sans croissance sur 30 missions ;
- téléchargement résumable ;
- temps cold start < 12 s mobile et < 8 s PC cible.

## Porte sécurité

- secrets absents du client ;
- trafic TLS et certificats ;
- validation serveur de l’inventaire ;
- rate limit et anti-replay ;
- journaux d’administration ;
- suppression/export du compte ;
- audit dépendances et pentest avant monétisation.

## Porte contenu

- 30 missions et 3 boss complets ;
- aucun placeholder visible ;
- provenance/licence de chaque asset ;
- sous-titres et crédits ;
- localisation revue humainement ;
- calendrier de 8 semaines préparé sans contenu fictif.

## Matrice de devices minimale

- Windows 10/11, GPU minimum et recommandé ;
- Android bas/milieu/haut, Vulkan ;
- iPhone minimum supporté et génération récente ;
- ratio 16:9, 19.5:9, tablette 4:3, ultrawide PC ;
- tactile 60/120 Hz ;
- manettes Xbox/PlayStation reconnues.

## Critères “commercialisable”

Le terme est interdit dans les rapports tant que toutes les portes suivantes ne
sont pas vertes :

1. gameplay ;
2. contenu ;
3. art 3D ;
4. performance ;
5. backend/achats ;
6. conformité ;
7. accessibilité ;
8. sécurité ;
9. support/live ops ;
10. certification stores.

