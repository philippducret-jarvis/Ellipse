# Campagne 2,5D et carnet — état du 27 septembre 2026

La caméra surélevée en trois quarts du Pont des Serments est la direction retenue par l'utilisateur. La vue latérale et le modèle Aldric des archives ne sont pas des cibles de production pour les quatre Mythiques.

## Intégration réalisée

- L'entrée **Campagne** de la Citadelle et les liens de fiche mènent au Pont des Serments. L'ancien `play.html` reste un prototype historique, sans être l'entrée de campagne de la Citadelle.
- Au démarrage, le niveau lit les bonus des quatre Mythiques dans le carnet : niveau, ascension, talents, équipement et reliques. La traversée utilise ces bonus pour les PV, dégâts, soins, boucliers, recharges, énergie et super.
- Une session de campagne est inscrite au lancement. Sa victoire crédite le carnet avec les récompenses de campagne déjà définies, dont l'XP des quatre Mythiques, l'essence, l'or, les sceaux, le premier équipement et la première relique selon l'état du profil. Une défaite ne crédite rien. Une session achevée ou remplacée ne peut être créditée à nouveau par la même fonction.
- Le record de temps reste local et distinct de l'économie ; il peut être conservé même si le carnet est indisponible. Un carnet corrompu n'est pas écrasé par le niveau.
- La fiche **Compétences** affiche désormais les cinq actions réellement jouables (base, trois compétences, super) avec leurs valeurs après bonus. Le Grimoire décrit les sept ennemis, les trois rencontres, l'esquive, les portes et la source du niveau actuel.

## Validation

Les 66 tests Shadow Echoes existants et ajoutés ont réussi après le premier raccord. Après l'alignement des fiches et du Grimoire, les 14 tests ciblés ont réussi. Un contrôle navigateur Chromium a validé la sauvegarde de la session au lancement, le renvoi de l'entrée Campagne vers `ruins.html`, la pause, les commandes clavier et tactiles et l'affichage à 390 px ; un second contrôle a validé la fiche des cinq actions et le Grimoire sur cet écran. L'émulation à 390 px n'est pas une mesure sur téléphone réel.

## Ce qui reste ouvert

Les modèles de personnages et d'ennemis, bien qu'articulés, restent des études volumétriques. Ils ne satisfont pas la finesse des références. Les tenues équipées ne sont pas encore visibles sur les modèles. Les compétences du Pont des Serments ont des valeurs et certains effets différents de l'ancien combat ; la fiche présente désormais les valeurs du niveau jouable, mais l'équilibrage final et les transformations de compétences restent à produire. La sauvegarde actuelle repose sur `localStorage` : elle n'offre pas encore la sécurité transactionnelle d'un serveur pour l'économie finale. Le chapitre complet, les invocations cinématiques finales et le contrôle PC/mobile natif restent aussi à produire.

La prochaine preuve artistique et technique doit porter sur Séraphine dans une courte portion réelle du pont : maillage continu fidèle à sa fiche, rig, attente, déplacement, attaques, compétences, super, réactions, mouvement des cheveux et étoffes, comparaison à la cible dans la caméra 2,5D et mesure sur les appareils visés. La méthode sera ensuite appliquée à Nyxara, Lysael et Voren.
