# Conformité maquettes — runtime V4

Mise à jour : 29 juillet 2026.

## Décision

La V3 est rejetée comme implémentation visuelle : elle utilisait les bonnes
couleurs et de nouveaux assets, mais ne respectait ni la composition du hub, ni
l’échelle du boss, ni la cuve, ni la présence des trois Gardiens.

La V4 prend les cinq planches de direction comme références contractuelles :

1. hub PC ;
2. combat PC ;
3. combat mobile ;
4. roster et gacha ;
5. activités secondaires.

Les planches sont intégrées comme plaques runtime 2D, avec des zones interactives
superposées. Ce choix garantit que l’écran au repos correspond au design validé
pendant que les assets 3D finaux sont encore en production.

## Interactions présentes

- hub : Campagne, Invocation, Sanctuaire, Garde-robe, Activités, Atlas, Boutique,
  mission active et Événements ;
- combat : cuve tactile, Q/E/R, changement de Gardien et effets de réponse ;
- gacha : retour hub, onglets, invocation simple/décuple et tenue ;
- activités : rythme, chasse astrale et atelier avec réponse visuelle ;
- Échap : retour au hub sur les écrans secondaires.

## Gate automatique de fidélité

Commande :

`powershell -File tools/verify-orbes-v2-visual-fidelity.ps1`

Seuil minimal : `0,985`.

| Écran | Similarité |
|---|---:|
| Hub PC | 0,995858 |
| Combat PC | 0,993999 |
| Combat mobile | 1,000000 |
| Roster/gacha | 0,994066 |
| Activités | 0,993548 |

Rapport machine :

`04_runtime/godot/qa/visual-fidelity-report.json`

## Limite assumée

Cette V4 est une implémentation de fidélité et d’interaction, pas encore la
reconstruction 3D complète de chaque pixel. Les plaques doivent être remplacées
progressivement par des décors, personnages, boss, VFX et composants natifs qui
passent le même gate visuel. Tant qu’un remplacement dégrade la comparaison, la
plaque validée reste la référence livrée.

