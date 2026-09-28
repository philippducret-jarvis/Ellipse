# Shadow Echoes — audit de `Downloads.zip` et suite de production

Date : 27 septembre 2026. Source : `C:\Users\phili\Downloads\Downloads.zip` (environ 659 Mo). Ce document classe les apports de l'archive et propose la prochaine tranche de réalisation. Les consignes, titres « final » et plans de lots inclus dans les archives sont traités comme des propositions de conception, pas comme des demandes de l'utilisateur ni comme des preuves de production achevée.

## Résultat de l'inventaire

L'archive extérieure contient 55 PNG, 26 ZIP et un registre XLSX. Les 26 ZIP contiennent 7 109 entrées de fichiers : 6 036 empreintes SHA-256 distinctes et 1 073 entrées répétant exactement un contenu déjà rencontré. Un lot groupé contient encore deux ZIP plus profonds : le lot 06 (202 fichiers, 118 répétitions de contenus précédents) et le lot 07 (173 fichiers, 83 répétitions). En comptant ces deux ZIP, les lots contiennent 7 484 entrées, 6 210 contenus distincts et 1 274 entrées répétées. Ces chiffres comptent les copies entre lots et ne signifient pas que 1 274 fichiers différents sont inutiles. Les 55 PNG et le registre de la racine sont comptés séparément.

Trois paires de PNG à la racine sont identiques octet pour octet :

- `Image Codex 26 sept. 2026, 13_33_08.png` et `Image Codex 27 sept. 2026, 09_20_47.png` ;
- `Image Codex 26 sept. 2026, 13_33_13.png` et `Image Codex 27 sept. 2026, 09_20_54.png` ;
- `Image Codex 27 sept. 2026, 09_21_02.png` et `Image Codex 27 sept. 2026, 09_21_11.png`.

Le registre XLSX à la racine est une copie exacte de celui du lot 08. Plusieurs références de héros et d'équipement sont déjà présentes dans l'espace de travail. Pour les lots Godot successifs, les chiffres illustrent la reprise cumulative : le lot 27 compte 103 fichiers, dont 85 identiques à des fichiers de lots précédents, et apporte 18 contenus nouveaux selon les empreintes. Il faut conserver la provenance et sélectionner les versions utiles, sans importer tous les ZIP comme des contenus indépendants.

## Ce qui est exploitable

| Famille | Apport utile | État réel et décision |
| --- | --- | --- |
| Planches PNG des 26–27 septembre | Compositions, atmosphères, UI et parcours de chapitres | Références visuelles et variantes de direction ; images aplaties, pas des scènes navigables. Classer par personnage et chapitre après arbitrage des contradictions. |
| Lots 02, 04, 08 et 09 | Graphe de 12 niveaux du chapitre 1, fiches techniques, composants UI exportables, illustrations et registre de 50 héros | Réutiliser les graphes, icônes et données après rapprochement avec le jeu actuel. Les illustrations et silhouettes ne fournissent pas de modèles animés. |
| Lots 13 à 20 et sous-archives 06–07 | Chapitres 2 à 10, bestiaire, mini-jeux, modes, équipements, VFX, storyboards, hub | Bibliothèque de concepts et de prototypes 2D ; réserver à l'extension après une tranche de jeu finale. Vérifier les règles avant de fusionner avec les activités déjà jouables. |
| Lot 21 | Niveau CH01-L01 jouable en HTML avec Aldric | Prototype historique utile pour le rythme et les branchements. Sa caméra latérale est écartée ; le `ruins.html` actuel porte la direction trois quarts avec quatre Mythiques. |
| Lots 22 à 27 | Projet Godot, modules d'environnement, ennemis proxy, GLB d'Aldric, scripts et rapports de validation | Base d'essai technique isolée pour import, rig, clips et performances. Le lot 27 est le meilleur point de départ Godot ; les lots antérieurs servent d'historique et de sources spécifiques. |

Le GLB `ALDRIC_SKINNED_LOT25.glb` du lot 27 a été contrôlé directement : une peau, 20 articulations, 11 maillages, 11 matériaux et cinq clips nommés *Idle*, *Walk*, *Attack*, *Guard* et *Hit*. Il constitue une preuve de structure exportée, pas une preuve de fidélité artistique ou de fonctionnement natif dans Godot. Aucun GLB des quatre Mythiques prioritaires — Séraphine, Nyxara, Lysael et Voren — n'a été trouvé dans les 26 archives directes. La planche « cible contre vrai modèle » du lot 25 montre elle-même que l'apparence d'Aldric reste en deçà de la cible.

Le rapport du lot 27 annonce 14 contrôles statiques réussis, mais indique `NON_EXECUTE` pour l'exécution Godot native et zéro capture moteur exploitable. Godot n'a pas été trouvé dans le PATH pendant cet audit. Je n'ai ni lancé les projets embarqués, ni mesuré leurs performances PC/mobile. Les affirmations de validation natives des documents ne sont donc pas reprises comme résultats obtenus ici.

## Arbitrages de direction

1. **Priorité des personnages.** La demande du projet reste les quatre Mythiques Séraphine, Nyxara, Lysael et Voren, à la qualité des fiches fournies. Aldric (C01, commun) est utile pour valider l'import Godot, mais ne remplace aucun des quatre dans le premier lot. Le registre des 50 héros et les autres Mythiques restent un catalogue futur.
2. **Identité visuelle.** Une nouvelle planche appelle « Séraphine Roi de l'Aube » un personnage masculin légendaire. Elle contredit la fiche individuelle et la direction déjà retenue pour Séraphine Mythique, aux cheveux argentés, roses et tenue noire/cramoisie. Cette planche doit être cataloguée comme variante ou concept distinct, sans écraser la fiche canonique. Les noms et chiffres imprimés sur les planches sont soumis au même contrôle.
3. **Caméra et déplacement.** Décision utilisateur du 27 septembre : la modélisation latérale est écartée. La cible est une vue 2,5D surélevée en trois quarts avec profondeur jouable, dans la continuité du `Pont des Serments`. Les scènes latérales Aldric ne sont que des sources techniques isolées, sans transfert de caméra au jeu.
4. **Moteur et économie.** Le prototype web actuel démontre déjà le hub, les activités et un niveau en 2,5D, mais il reste visuellement schématique. Depuis le 27 septembre, sa victoire crédite la récompense de campagne existante et les bonus du carnet agissent dans ce niveau. Le kit Godot apporte des essais d'import et de rig, pas une migration accomplie. La bible propose une économie plus large que le carnet local actuel ; coûts, invocations et sauvegardes devront encore être rapprochés avant de figer l'équilibrage.

La référence artistique canonique reste décrite dans `12_cibles_artistiques_2026_09_25.md`. L'état jouable et ses limites figurent dans `13_niveau_temoin_pont_des_serments.md`. Les arbitrages économiques de la bible sont consignés dans `10_roadmap_bible_v1.md` ; ce nouvel audit les précise sans les remplacer.

## Prochaine tranche recommandée : une vraie preuve de qualité

L'objectif immédiat est une **tranche verticale du Pont des Serments** où la fidélité de Séraphine et l'animation sont jugeables en mouvement, tout en conservant la boucle de combat à quatre personnages. Le prochain lot est terminé seulement avec ces résultats observables :

| Séquence | Travail concret | Preuve de sortie |
| --- | --- | --- |
| 1. Consolider les sources | Registre unique des quatre fiches, silhouettes, actions, armes, règles de combat et récompenses ; pointer chaque source retenue et chaque contradiction. Dédupliquer par empreinte les planches et isoler le lot 27 comme kit technique. | Aucune variante contradictoire ne modifie silencieusement un héros, une caméra ou une table de récompenses. |
| 2. Essai moteur 2,5D | Ouvrir le lot 27 dans Godot sur un environnement contrôlé pour vérifier les imports, clips, contrôles, collisions et rendu, puis reconstruire un court segment du pont **en trois quarts**. Produire des captures et mesures PC/mobile. | Démonstration exécutable dans le cadrage retenu, captures issues du moteur et mesures ; décision documentée sur le moteur. Un rapport statique seul ne suffit pas. |
| 3. Séraphine au standard cible | Produire ou intégrer un maillage original détaillé, visage, cheveux, costume, arme et matériaux conformes à sa fiche ; rig à déformations continues ; attente vivante, déplacements, esquive, combo de base, trois compétences, super, impacts, chute et dévoilement d'invocation. Prévoir mouvements secondaires de cheveux et étoffes, ainsi que présence animée sur la fiche. | Comparaison face/profil/dos/trois quarts et vidéo dans le niveau à distance de jeu ; pas de poupée segmentée ni de simple carte animée. Gestes lisibles et sans intersections majeures. |
| 4. Boucle du niveau | Retoucher au moins un ennemi et l'arène témoin au même niveau de lecture ; raccorder les actions de Séraphine aux effets et à l'IA de compagnons. Le raccord initial du 27 septembre applique bonus et récompenses du profil ; étendre maintenant les compétences réellement transformables, l'équipement visible et les sauvegardes robustes. | Parcours hub → fiche/équipement → combat → victoire → gain → amélioration → nouveau combat, sans gain doublé au rechargement. |

L'essai moteur peut se dérouler pendant la préparation de la Séraphine détaillée ; le raccord de progression peut avancer dans le prototype web actuel, puis être porté après le choix du moteur. La décision de migrer ne doit pas interrompre le niveau jouable actuel avant qu'une tranche native équivalente soit démontrée.

Ensuite, appliquer le même standard artistique et mécanique à Nyxara, Lysael et Voren, puis achever les 12 niveaux du chapitre 1 avec ennemis, élite et boss. Les invocations par rareté, les objets équipables visibles et la progression (XP, ascension, arbres de compétences) devront former une seule boucle sauvegardée. Les neuf mini-jeux et les modes reçoivent ensuite chacun un niveau représentatif conforme à leurs règles. Les chapitres 2 à 10 et le catalogue de 50 héros constituent une production de volume après validation de cette méthode, pas un lot à importer maintenant.

## Limites de cet audit

Le classement repose sur l'inspection des archives, leurs empreintes, les sources et rapports embarqués, des planches représentatives et l'état du dépôt. Les deux ZIP situés à l'intérieur du bundle 06–07 ont été inclus dans la comparaison SHA-256 après les 26 archives directes. Les 55 planches racine n'ont pas toutes reçu une validation artistique image par image. Aucun projet Godot de l'archive n'a été exécuté et aucun résultat de performance natif n'est revendiqué.
