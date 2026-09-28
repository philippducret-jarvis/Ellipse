# Plan de production par portes

Les durées sont des ordres de grandeur pour une petite équipe expérimentée. Elles
ne constituent pas un engagement tant que ressources humaines et budget ne sont
pas définis.

## Lot 0 — Préproduction et vérité technique

**Objectif :** savoir exactement ce qui est construit.

Livrables :

- GDD, règles, économie et classification ;
- roster et inventaires 3D ;
- maquettes PC/mobile ;
- prototype comparatif Godot/WebGPU ;
- budget, staffing et risques ;
- tests de fun papier et prototype gris.

Sortie :

- aucune règle critique `TBD` ;
- moteur choisi sur benchmark ;
- une maquette approuvée par flux ;
- un Gardien et un boss réalisables dans les budgets.

## Lot 1 — Vertical slice “combat vrai”

Contenu :

- Mira, Brann et Aster en 3D final ;
- un Familier ;
- Léviathan en 3D avec trois phases ;
- arène Rade des Étoiles ;
- plateau physique final ;
- trois compétences, trois ultimes et Surpuissances ;
- briefing, combat, résultat et sauvegarde ;
- PC + mobile tactile.

Sortie :

- 15 minutes de contenu représentatif ;
- 60 FPS PC / 30 FPS mobile cible ;
- zéro portrait étiré ou placeholder ;
- test fun atteint les seuils du document vision ;
- une mission jouable 20 fois sans soft lock.

## Lot 2 — Boucle méta

- hub visitable ;
- roster, équipement, relations ;
- progression de compte ;
- économie locale simulée ;
- invocation sans achat réel ;
- boutique factice pour UX test ;
- tutoriel complet.

Sortie :

- parcours nouveau joueur de 45 minutes ;
- données de progression versionnées ;
- aucune impasse monétaire ;
- UX testée sur cinq tailles d’écran.

## Lot 3 — Production contenu lancement

- 12 Gardiens finalisés ;
- 3 boss, 15 ennemis, 3 régions ;
- 30 missions ;
- Faille roguelite ;
- trois activités secondaires ;
- 24 costumes directs et 24 variantes ;
- musique, SFX, voix d’effort ;
- localisation FR/EN.

Sortie :

- contenu complet du lancement ;
- performance et mémoire dans budgets ;
- aucune licence ou provenance manquante.

## Lot 4 — Services et monétisation

- compte, cloud save, inventaire ;
- gacha autoritaire audité ;
- reçus Apple/Google/PC ;
- calendrier et compensation ;
- télémétrie avec consentement ;
- contrôle parental/dépense ;
- build sans loot boxes pour territoires requis.

Sortie :

- tests de charge ;
- simulation de millions de tirages conforme ;
- réconciliation achats à 100 % ;
- audit sécurité et juridique.

## Lot 5 — Alpha

- feature complete ;
- instrumentation complète ;
- groupe externe fermé ;
- équilibrage de la campagne ;
- correction UX et accessibilité.

Critères :

- crash-free sessions ≥ 99 % ;
- progression terminable sans paiement ;
- aucun bug bloquant P0 ;
- tutoriel compris par ≥ 80 %.

## Lot 6 — Bêta / soft launch

- Android dans un petit nombre de territoires autorisés ;
- cohortes, rétention, économie, température mobile ;
- support et processus de compensation ;
- validation des prix et de la cadence.

La décision de lancement ne repose pas sur la rétention seule : fun, regret
d’achat, plaintes, stabilité et équité sont des métriques de porte.

## Lot 7 — Release candidate

- contenus gelés ;
- conformité stores ;
- PEGI/IARC/ESRB ;
- politique de confidentialité et CGU ;
- sauvegarde/migration vérifiées ;
- plan rollback ;
- campagne marketing conforme aux assets réels.

## Dépendances critiques

1. Installer et verrouiller Blender/Godot/FFmpeg.
2. Choisir moteur après benchmark.
3. Finaliser Mira avant les 23 autres.
4. Valider un boss complet avant la campagne.
5. Valider le fun avant backend commercial.
6. Valider économie avant intégration IAP.

## Estimation de charge indicative

| Domaine | Charge indicative |
|---|---:|
| Design/production | 12–18 mois-personne |
| 24 personnages 3D + tenues | 70–120 mois-personne |
| Animation/VFX | 35–60 mois-personne |
| Lieux/ennemis/boss | 45–80 mois-personne |
| Client/engine/UI | 45–75 mois-personne |
| Backend/live ops | 20–35 mois-personne |
| Audio/localisation | 12–20 mois-personne |
| QA/certification | 30–50 mois-personne |

Une personne seule ne peut pas produire rapidement cette cible au niveau commercial.
Le plan doit donc soit financer une équipe, soit réduire le lancement à 6–12
Gardiens et une région.

