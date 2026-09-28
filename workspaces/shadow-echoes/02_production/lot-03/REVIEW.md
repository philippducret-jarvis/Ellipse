# Revue lot 03 — premiers rigs par maillage

## Livrables et provenance

Quatre rigs de huit articulations sur les maîtres RGBA du lot 01. 2 501 sommets et 4 800 triangles par héros. Sept études de mouvement et une pose neutre, atelier de comparaison et raccord aux événements du combat. Toutes les textures maîtres ont conservé leur SHA-256 ; aucune image n’a été générée ou remplacée dans ce lot.

Les régions d’influence ont été placées après inspection des quatre illustrations. Le rig générique du dépôt suppose une pose neutre et des rectangles de découpe ; ce prototype utilise des régions pondérées propres à chaque personnage. Il n’a pas produit de calques anatomiques.

## Validation technique

- Sept tests ajoutés : quatre ensembles de pondérations/poses/limites, retour à la pose initiale, priorités d’animation et entrées invalides.
- Par héros, 248 poses échantillonnées à la construction. Aucun triangle inversé. Rapport d’aire minimal supérieur à 0,64 ; étirement maximal d’arête inférieur à 1,32. Les valeurs détaillées sont dans les fichiers `mesh-qa-v1.json`.
- Comparaison navigateur de la pose neutre au maître produit : recouvrement alpha 99,77 % à 99,86 %, erreur moyenne de couleur de 2,20 à 2,84 sur 255. Les variations restantes comprennent le filtrage et l’anticrénelage du navigateur. Ce contrôle ne mesure pas la fidélité aux références originales de l’utilisateur.
- Les mipmaps ont corrigé un écart de réduction des textures observé sur le premier rendu ; le contenu des maîtres est conservé à sa résolution initiale dans une texture GPU complétée par une marge transparente.
- Parcours atelier : quatre héros, mouvement visible, pose figée, pas à pas, amplitude zéro, articulations, maillage, poids, damier, desktop et mobile 390 px.
- Parcours combat : quatre rigs chargés, compétence raccordée, pose immobile en pause, option de mouvement et préférence système, secours sur illustration lors d’une perte de contexte WebGL puis restauration.
- TypeScript Studio vérifié après ajout du lien du lot 03.
- Régression complète du combat réussie avec les quatre rigs : victoire en 48,2 secondes avec quatre survivants, défaite, reprise, sauvegarde/rechargement et mobile. Rapport `tmp/shadow-echoes/trial-browser-report.json`, aucune erreur navigateur.

Rapport et captures : `tmp/shadow-echoes/motion-browser-report.json`, `motion-desktop.png`, `motion-weights.png`, `motion-mobile.png`.

## Revue visuelle et limites

Les captures ont été examinées avec texture normale, articulations, damier et maillage. Les visages et ornements restent lisibles dans les amplitudes actuelles. L’attaque et l’ultime sont de petites déformations de la pose initiale, pas encore des gestes complets de combat. La partie inférieure des héros reste essentiellement ancrée ; aucun cycle de marche, esquive, changement d’angle ni animation faciale n’est livré.

Les métriques géométriques évitent certaines déformations grossières mais n’excluent pas un étirement local visible des armes, filigranes ou cheveux. Les clips, les bases HD et leur fidélité restent au statut revue. Le dernier clip correspond à un affaiblissement, pas à une chute articulée complète.

## Prochaine production nécessaire

Séparer les éléments qui doivent bouger indépendamment et reconstruire les zones masquées. Priorité à la main/lame de Séraphine et au bras qui la tient, puis au bâton de Lysael et à la hache de Voren. Contrôler ces assemblages et leurs raccords sur le même atelier avant d’augmenter les amplitudes. Le corbeau de Nyxara doit disposer d’un élément indépendant. La cible artistique demeure celle des designs fournis.
