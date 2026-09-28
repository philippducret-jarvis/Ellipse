# Séraphine — prochaine tranche de qualité en 2,5D

Décision du projet : le jeu reste en caméra surélevée trois quarts, avec déplacement et profondeur réels. Le prototype latéral Aldric n'est pas une cible de personnage ou de niveau.

## Constat vérifié

Les quatre exports `volume-v1/hero.glb` contiennent chacun 42 clips, mais **zéro peau pondérée et zéro maillage skinné**. Les formes sont attachées à des articulations par morceaux. Cette structure permet les gestes de laboratoire, pas les déformations continues requises par les fiches artistiques. Le GLB Aldric du lot 27 possède bien une peau et 20 articulations, mais seulement cinq clips, un modèle visuellement schématique et une identité hors des quatre Mythiques prioritaires. Il reste un témoin technique, sans import dans le jeu.

Le contrôle reproductible est dans `tools/audit-shadow-echoes-hero-assets.mjs`. Son résultat pour les quatre héros se trouve dans `02_production/lot-08/hero-asset-gate.json`. L'[atelier des modèles](../../07_exports/web/asset-lab.html) présente la fiche cible face au GLB animé en trois quarts, indique les métriques de peau, articulations et clips, et permet d'ouvrir un fichier GLB local sans l'ajouter au jeu. Le test technique ne juge pas à lui seul la qualité artistique.

## Ordre de production recommandé

1. **Séraphine, modèle maître.** Construire un maillage continu avec visage, mains, cheveux argentés, couronne de roses, armure noire à filigranes, étoffes cramoisies et lame rouge fidèles à sa planche individuelle. Placer l'origine aux pieds, Y vers le haut et le personnage vers +Z pour l'intégration dans le Pont. Séparer les accessoires rigides sans fragmenter le corps aux articulations.
2. **Rig et déformations.** Une peau pondérée avec articulations du tronc, tête, épaules, coudes, poignets, doigts utiles, hanches, genoux et chevilles ; contrôle des plis aux épaules, hanches et genoux. Les mèches et pans de tissu doivent réagir aux actions et revenir au repos sans traverser le corps.
3. **Animations indispensables dans le vrai modèle.** Reprendre les noms des 42 états déjà utilisés par le jeu. Valider d'abord attente vivante, regard, marche, course, esquive, trois coups de base, impacts, chute, trois compétences, super et dévoilement d'invocation ; compléter les transitions et états secondaires avant la validation de livraison. Les clips doivent cibler les articulations de la peau, pas seulement déplacer des groupes rigides.
4. **Comparaison en situation.** Importer le GLB dans l'atelier, comparer face, profil, dos et trois quarts à la fiche, puis le jouer dans une portion réelle du Pont avec un ennemi, les effets et l'éclairage aube/nuit. Corriger les intersections et la lisibilité à la taille de jeu. Mesurer ensuite temps de chargement, fluidité et mémoire sur des appareils PC/mobile nommés.
5. **Généralisation.** Une fois Séraphine validée à cette qualité, appliquer le même contrat à Nyxara, Lysael et Voren. Ensuite seulement, augmenter le nombre de niveaux et de mini-jeux afin que chaque ajout respecte le même standard.

## Critère de sortie

La tranche est acceptée quand le GLB passe le contrôle de peau et de clips, que ses mouvements restent crédibles dans la fiche et le niveau trois quarts, et qu'une comparaison visuelle à la planche ne montre plus la silhouette schématique actuelle. L'aspect du visage, des cheveux, du costume et de la lame est jugé dans une capture et une courte séquence de jeu, pas à partir du seul nombre de sommets. Le raccord aux équipements visibles, aux invocations par rareté et aux autres scènes suit ce premier personnage maître.
