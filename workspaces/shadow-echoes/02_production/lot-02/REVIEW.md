# Revue du lot 02 — Épreuve des Échos

## Livré

Une boucle jouable de combat de groupe, à partir des quatre Mythiques et des douze compétences du lot 01. Trois phases enchaînées, attaques annoncées, interruption, garde, dégâts périodiques, soin, bouclier, ultimes, pause, victoire/défaite et nouvelle tentative. Un Sceau des Quatre et les records de victoire sont conservés localement ; aucun système commercial ou monnaie n’est ajouté.

Le bouton standard de preview Ellipse et un lien dédié ouvrent l’épreuve. L’API du Studio reconnaît un build web ready, 160 ressources (155 références, quatre bases de héros, un décor) et six documents. Le statut de build indique que le prototype est accessible, pas que l’art est finalisé.

## Vérifications

- Quinze tests de simulation réussis : règles héritées du laboratoire, garde et recharge, interruption sans dégâts résiduels, pause, chronologie stable à des pas différents, défaite terminale, victoire des trois phases, transitions uniques et sauvegarde invalide.
- Stratégie de test : victoire en 45,05 s avec quatre survivants. Sans utilisation des compétences spéciales et de la garde : défaite à 75,95 s lors de la troisième phase. Ces mesures décrivent ces stratégies déterministes, pas une estimation du temps d’un nouveau joueur ni un équilibrage définitif.
- Parcours navigateur : interruption réelle via les boutons, pause et sélection, victoire des trois phases, enregistrement unique, reprise après rechargement, clavier, viewport 1440 px et mobile 390 px, préférence de mouvement réduit, sauvegarde invalide, défaite sans récompense et nouvelle tentative. Aucun échec HTTP ni erreur JavaScript détecté.
- Intégration Studio : lien du lot 02 et chargement de l’épreuve dans la preview intégrée vérifiés. Une course entre réponses asynchrones a été corrigée : le chargement initial ne remplace plus la sélection utilisateur, et une réponse d’un projet quitté ne remplace plus le projet ouvert.
- Vérification TypeScript du Studio réussie.
- Captures desktop, mobile, briefing et victoire examinées. Les signaux ont été déplacés pour dégager le visage des héros sur ordinateur ; les libellés ont été séparés du bas de l’arène.

Scripts : `tools/lib/shadow-echoes/battle.test.mjs` et `tools/verify-shadow-echoes-trial.mjs`. Rapport navigateur : `tmp/shadow-echoes/trial-browser-report.json`.

## Revue artistique

Le décor image_gen correspond à la famille visuelle de la référence : cathédrale gothique, arcades, pierre détaillée, lune cramoisie, bannières et éclairages de braseros. Les quatre PNG RGBA d’origine du lot 01 sont réutilisés sans transformation destructive. Les interfaces sont du texte et des composants interactifs, séparés du décor.

Le rendu conserve les détails des illustrations, mais les mouvements actuels restent ceux de sprites entiers. Le symbole runique adverse est un objet procédural temporaire. Aucune fidélité finale, découpe anatomique, rig ou animation articulée n’est validée par cette livraison. Les effets sonores sont des signaux synthétiques optionnels, sans musique ni voix.

## Prochaine étape de production artistique

La priorité reste de rendre les quatre Mythiques fidèles en mouvement : arrêter les variantes canoniques déjà documentées, corriger les écarts, préparer membres/cheveux/capes/armes, construire et tester les rigs, puis substituer les animations d’attente, attaque, compétence, impact et chute aux déplacements de sprites. Cette épreuve fournit désormais le terrain pour les vérifier avec les compétences réelles. La campagne et les systèmes d’équipement restent ultérieurs.
