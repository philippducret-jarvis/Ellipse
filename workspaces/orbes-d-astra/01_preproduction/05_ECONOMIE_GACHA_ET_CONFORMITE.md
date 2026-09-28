# Économie, gacha et conformité

> Ce document est une spécification produit, pas un avis juridique. Une revue par
> conseil spécialisé reste une porte obligatoire avant commercialisation.

## Principes

- Un personnage est complet dès sa première acquisition.
- Les doublons accélèrent ou diversifient, ils ne réparent pas un kit incomplet.
- Les coûts réels sont affichés à côté de toute monnaie premium.
- Le pity, la garantie et l’historique sont visibles avant invocation.
- Les costumes majeurs sont vendus directement.
- Aucun achat pendant un écran de défaite ou de frustration immédiate.
- Aucun bouton “gratuit” si une dépense est possible derrière.

## Monnaies

| Monnaie | Source | Usage | Achat |
|---|---|---|---|
| Éclats | missions, activités | progression commune | non |
| Essence | boss, doublons | ascension et constellation | non |
| Sceaux | événements | boutique événement | non |
| Astrites | quêtes, pass, achat | invocation/cosmétique | oui |
| Billet d’invocation | récompenses | bannière désignée | non direct |

Les Astrites achetées et gagnées sont comptabilisées séparément si une juridiction
ou une règle de remboursement l’exige, mais l’interface affiche le total et la
ventilation.

## Bannière personnage proposée

- R : 75 %
- SR : 20 %
- SSR : 5 %
- soft pity SSR à 65 ;
- hard pity à 80 ;
- SSR vedette : 50 % au premier SSR ;
- après perte du 50/50, prochain SSR garanti vedette ;
- pity et garantie transférés vers la bannière personnage suivante ;
- un personnage limité revient dans un délai public maximal de 12 mois ;
- historique exportable des 180 derniers tirages.

Ces valeurs sont hypothèses à valider par simulation économique et tests de prix.

## Doublons

- premier exemplaire : personnage complet ;
- doublon 1–5 : nœud de Constellation horizontal ;
- au-delà : Essence + monnaie universelle ;
- la monnaie universelle permet de remplacer un doublon ;
- aucun mode n’exige Constellation > 0 pour les récompenses principales.

## Budgets de récompense

- tutoriel : un SR choisi parmi trois, pas aléatoire ;
- première semaine : assez de ressources pour 30 invocations ;
- activité hebdomadaire : 5 à 8 invocations ;
- pity atteignable en 8 à 12 semaines sans paiement, à ajuster après simulation ;
- aucune énergie payante pour la campagne principale ;
- énergie éventuelle limitée au farming répétable, avec stock maximal explicite.

## Boutique

- costume premium : prix direct ;
- pack : détail de chaque élément et économie réelle, pas de remise fictive ;
- battle pass : piste gratuite visible, missions cumulables ;
- plafond de dépense optionnel dans les paramètres ;
- rappel mensuel et historique d’achat ;
- confirmation supplémentaire au-dessus d’un seuil configurable.

## Classification et stores

Apple exige l’affichage des probabilités avant l’achat de contenu virtuel aléatoire :
`https://developer.apple.com/app-store/review/guidelines/`.

Les résolutions européennes sur la protection des consommateurs demandent notamment
une information claire sur les achats aléatoires et l’équivalent en monnaie réelle :
`https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=oj:JOC_2023_214_R`.

Avant soumission :

- afficher les taux par rareté et par item vedette ;
- afficher l’équivalent monétaire à chaque achat ;
- fournir politique de remboursement, confidentialité et suppression de compte ;
- interdire marché secondaire et conversion en argent ;
- ne pas cibler les mineurs ;
- vérifier pays par pays les restrictions de loot boxes ;
- prévoir une build “achat direct uniquement” pour territoires à risque ;
- remplir questionnaires PEGI/IARC/ESRB avec captures réelles ;
- auditer les règles Apple et Google à la date de soumission.

## Télémétrie responsable

Mesurer :

- compréhension, rétention, difficulté et plantages ;
- taux de pity, distribution réelle, erreurs de paiement ;
- abandon après achat pour détecter regret et friction.

Ne pas utiliser :

- ciblage individuel de “gros payeurs” ;
- modification cachée des taux ;
- offres basées sur vulnérabilité ou série d’échecs ;
- notifications culpabilisantes ;
- faux joueurs ou faux compteurs sociaux.

## Service gacha

Le serveur est autoritaire :

1. reçoit bannière, quantité et idempotency key ;
2. vérifie solde et version de table ;
3. verrouille la transaction ;
4. tire avec CSPRNG ;
5. applique pity/garantie ;
6. écrit inventaire et journal append-only ;
7. retourne résultat signé ;
8. expose preuve d’audit interne et métriques agrégées.

Toute incohérence de taux bloque automatiquement la bannière.

