# Orbes d’Astra V2 — dossier maître de préproduction

> Statut : **préproduction active — aucune revendication “commercial ready”**

La V1 est conservée comme prototype technique. Elle valide quelques briques
(fusion physique, sauvegarde locale, collection), mais elle ne définit ni la
qualité visuelle, ni l’architecture, ni l’équilibrage de la V2.

## Cible produit

Orbes d’Astra V2 est un **action-puzzle RPG 3D de collection**, jouable sur PC et
mobile. Le joueur compose une escouade de trois Gardiens adultes, fusionne des
Orbes vivantes sur un plateau physique et utilise compétences, réactions
élémentaires et Surpuissances pour vaincre des boss visibles dans l’arène.

Le positionnement « sexy » signifie :

- personnages exclusivement adultes, âge canonique affiché ;
- silhouettes séduisantes et variées, poses assurées, tenues couture fantasy ;
- animations de personnalité, scènes de lien et variantes glamour ;
- aucune nudité explicite, aucun personnage infantilisé, aucune récompense
  sexuelle conditionnée à une dépense.

## Documents normatifs

| Fichier | Décision couverte |
|---|---|
| `00_VISION_ET_PILIERS.md` | Promesse, audience, ton, périmètre |
| `01_GDD_COMMERCIAL.md` | Boucles, modes, contenu, caméra, contrôles |
| `02_REGLES_DETAILLEES.md` | Règles exécutables et cas limites |
| `03_ROSTER_ET_PRODUCTION_3D.md` | 24 Gardiens, rigs, tenues, budgets |
| `04_DIRECTION_ARTISTIQUE_ET_MAQUETTES.md` | Style, UI, écrans PC/mobile |
| `05_ECONOMIE_GACHA_ET_CONFORMITE.md` | Monnaies, pity, achats, garde-fous |
| `06_ARCHITECTURE_ET_PIPELINE.md` | Runtime 3D, fichiers, CI, performances |
| `07_PLAN_DE_PRODUCTION.md` | Lots, dépendances, critères de sortie |
| `08_QA_ET_COMMERCIAL_GATES.md` | Qualité, tests, stores, release |
| `09_ACTIVITES_SECONDAIRES.md` | Règles et buts des activités secondaires |
| `10_ETAT_REEL_ET_PROCHAINES_ETAPES.md` | État vérifié et ordre d’exécution |
| `11_REPRISE_VISUELLE_GODOT_V3.md` | Rejet V1, reprise V3 et vérité de production |
| `12_CONFORMITE_MAQUETTES_RUNTIME_V4.md` | Runtime fidèle, interactions et gate visuel |
| `13_CATALOGUE_UI_INTERACTIF_V5.md` | Couverture fonctionnelle des 31 écrans |
| `14_ARCHITECTURE_COHERENCE_V6.md` | Registre unique, navigation, composition interactive et jeux |
| `manifests/*.json` | Inventaires machine-readable |
| `mockups/*.png` | Maquettes de référence, non assets finaux |

## État de vérité

| Élément | État au démarrage V2 | Exigence avant intégration |
|---|---|---|
| GDD détaillé | incomplet | règles gelées et testables |
| Maquettes | absentes | PC + mobile pour chaque flux critique |
| Personnages 3D | absents | GLB riggé, LOD, textures, expressions |
| Animations | absentes | locomotion, social, combat, ultimes |
| Lieux 3D | absents | greybox validé puis kit modulaire |
| Audio final | absent | musique adaptative, SFX, voix d’effort |
| Backend | absent | compte, inventaire, achats, télémétrie |
| Gacha commercial | prototype local | service autoritaire et audit de taux |
| Accessibilité | partielle | WCAG UI, daltonisme, motion, remapping |
| Builds stores | absents | Windows, Android, iOS, conformité |

## Règle de production

Un élément ne passe en intégration que si son contrat d’entrée est complet :
concept approuvé, dimensions, budget, nommage, variantes, animation, collisions,
LOD, audio/VFX associés et critères d’acceptation. Une image 2D n’est jamais
comptée comme modèle 3D.
