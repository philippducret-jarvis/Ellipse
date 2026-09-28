# État réel et prochaines étapes

Mise à jour : 29 juillet 2026.

## Résultat acquis

| Lot | Preuve | État honnête |
|---|---|---|
| Documentation normative | 14 documents, contrôles automatisés | complet pour ouvrir la production |
| UX | 31 écrans × 3 variantes | 93 drafts, approbation artistique à faire |
| Direction artistique | 6 planches PNG annotées | cible définie, pas des assets runtime |
| Roster | 24 adultes avec âge, rôle, silhouette, tenue | 24 bases humanoïdes riggées, sculpts d’identité finaux absents |
| Gardiens 3D V3 | 24 `.blend`, 24 GLB, 2 898 997 triangles audités | bases d’intégration, pas des modèles commerciaux finaux |
| Chargements V2 | 96 tenues, 24 armes, 24 artefacts | extraits des mêmes modèles maîtres |
| Invocations V2 | 12 familiers riggés, 8 Orbes, 96 clips | intégrables, silhouettes canoniques à sculpter |
| Actifs de support | 211 GLB procéduraux | complets pour prototypage, finition artistique requise |
| Mira | `.blend`, GLB, rig humanoïde, tenue, arme, artefact, rendu, QA | base V3 intégrable, sculpt final absent |
| Léviathan | `.blend`, GLB, 41 os, 3 clips, rendu, QA | présentation riggée, modèle final absent |
| Runtime V4 | projet Godot 4.7 distinct | fidélité maquettes + interactions PC/mobile |
| Build PC | EXE Windows x86-64 | vertical slice V3, smoke test requis après chaque export |
| Build mobile Web | HTML, WASM, PCK, manifeste | généré, QA navigateur en attente |
| Build Android | preset prêt | SDK/JDK/licences/signature manquants |
| Candidate commerciale | 10 gates | 0/10 vert |

## Ce que le vertical slice permet de juger

- échelle du personnage face à l’arène et à la chambre ;
- lisibilité du lâcher tactile/souris et des fusions ;
- rythme score, combo, dégâts et trois phases du boss ;
- valeur tactique du Puits astral, de l’Ultime et de la Surpuissance ;
- continuité hub → mission → victoire → hub ;
- import réel d’un GLB animé dans le moteur ;
- adaptation du HUD à une fenêtre PC ou verticale.

Il ne permet pas encore de juger correctement le sex-appeal final, la qualité du
visage, les déformations, les cheveux, les matières peau/tissu, l’audio ou la
cinématique. Ces points demandent un sculpt, une retopologie et des animations
de niveau production, pas un empilement de primitives.

## Ordre d’exécution mis à jour

### Étape A — finition du personnage étalon

1. approuver le turnaround final de Mira ;
2. sculpter corps, visage, mains et pieds ;
3. retopologie, UV, PBR peau/tissu/métal ;
4. rig de déformation et 52 expressions ;
5. produire les 30 animations contractuelles ;
6. LOD0/1/2, import Godot, tests PC/mobile ;
7. valider Mira avant de décliner les 23 autres.

### Étape B — vertical slice artistique

1. Brann et Aster selon le standard Mira ;
2. Léviathan trois phases et état brisé ;
3. kit modulaire du Port noyé ;
4. Orbes vivantes Pio à Kori ;
5. VFX de fusion, magie, Ultime et Surpuissance ;
6. audio réactif et retours haptiques ;
7. passe lighting, caméra et performance.

### Étape C — systèmes commercialisables

1. combat déterministe et équilibrage automatisé ;
2. campagne 30 missions et Faille roguelite ;
3. trois activités secondaires au niveau du jeu principal ;
4. roster, équipement, garde-robe et liens ;
5. backend compte/inventaire/taux/achats ;
6. gacha transparent, pity auditable, achats restaurables ;
7. accessibilité, localisation, sécurité et conformité stores.

### Étape D — contenu et sortie

1. convertir les 24 bases de Gardiens en sculpts finaux, puis produire 3 boss, 15 ennemis et 6 lieux ;
2. alpha contenu complet ;
3. bêta appareils et économie ;
4. certification Windows/Android/iOS ;
5. release candidate seulement lorsque les 10 gates sont vertes.

## Décision de qualité

Les 24 bases ne sont pas déclarées commerciales : elles apportent enfin une
topologie, un squelette, des vêtements pondérés, des sockets et des exports
cohérents pour tous les écrans. La prochaine passe artistique doit transformer
Mira en **gold master** approuvé, puis reporter son niveau de sculpt, de visage,
de cheveux, de matières et d’animation sur les 23 autres identités. Le manifeste
et l’audit conservent chaque manque visible.
