# Lot 03 — Atelier du mouvement

## Résultat

Quatre premiers rigs par maillage pour Séraphine, Nyxara, Lysael et Voren. Chacun comporte huit articulations : ancrage, buste, tête, bras principal, arme/main, deux zones de tissu et second bras. Le rendu utilise 2 501 sommets pondérés et 4 800 triangles par héros. Les articulations et zones d’influence sont placées manuellement pour les poses propres à chaque illustration.

Les maîtres RGBA du lot 01 restent inchangés, vérifiés par SHA-256. Aucune nouvelle illustration n’a été générée pour ce lot. Le maillage déforme ces textures dans le navigateur. Un filtrage avec mipmaps limite le scintillement des ornements lors de la réduction, en complétant la texture avec une marge transparente sans redimensionner son contenu initial.

## Études de mouvement

Pose neutre, attente, attaque, compétence, ultime, impact, garde et affaiblissement. Le dernier mouvement est une étude de réaction à la défaite, pas une chute anatomique complète. Les attaques et ultimes utilisent des courbes et amplitudes adaptées aux héros ; le bâton de Lysael reçoit une amplitude particulièrement limitée.

Ces clips sont raccordés aux événements réels de l’épreuve. Une ultime a priorité sur une attaque de base ; un héros à terre conserve son état. La simulation conserve ses règles et ses valeurs. L’option « Héros animés » désactive les déformations. La préférence système de réduction des mouvements désactive par défaut ces animations ; l’utilisateur peut ensuite choisir de les activer. La pause de combat fige la pose. Une perte de contexte WebGL affiche l’illustration fixe jusqu’à la restauration du moteur graphique.

## Atelier de revue

Adresse : http://localhost:4273/workspaces/shadow-echoes/07_exports/web/motion.html

Dans Ellipse : Shadow Echoes → « Atelier du mouvement — lot 03 ». L’épreuve propose également un lien vers cet atelier.

L’atelier affiche côte à côte le maître fixe et le rendu du maillage. Il permet de sélectionner les quatre héros et huit clips, lire en boucle, ralentir à ½ ou ¼, parcourir une chronologie, avancer de 1/30 s, diminuer l’amplitude, afficher articulations, maillage et poids d’une articulation, et contrôler l’alpha sur un damier. La fiche d’origine et les données du rig restent accessibles.

## Portée de la validation

Les vérifications techniques portent sur la normalisation des poids, l’identité de la pose neutre, l’absence d’inversion de triangles aux poses échantillonnées et la continuité des transitions. Chaque rig reçoit un rapport `mesh-qa-v1.json` dans son dossier de personnage. L’erreur de position de la pose neutre doit rester sous 0,005 pixel source. Les contrôles limitent l’étirement des arêtes à 1,35 et le rapport d’aire minimal à 0,6 sur les échantillons.

Ces seuils sont des garde-fous de déformation, pas une preuve de fidélité artistique. Le test de restitution compare le rendu neutre au maître RGBA produit au lot 01 ; il ne compare pas le personnage aux planches originales de l’utilisateur. Les comptes rendus continuent d’indiquer `fidelity_approved: false`.

## Limites artistiques

Il s’agit de régions d’influence sur une illustration entière, pas de bras, mains ou armes détourés sur des calques indépendants. Le maillage ne reconstruit pas les faces cachées. Les changements d’angle, les grandes rotations de membres, les pas, esquives et attaques amples demandent encore des éléments séparés et des poses supplémentaires. Les armes peuvent légèrement se déformer aux raccords ; leur rigidité, les visages et les filigranes restent à examiner. Le corbeau de Nyxara n’a pas de squelette indépendant.

Le travail actuel ne remplace donc pas la séparation anatomique annoncée. Il fournit une première étude de mouvement réutilisable et mesurable, avec une cible de qualité inchangée.

## Reproduire

- `pnpm shadow:motion` : reconstruire l’épreuve, l’atelier, les quatre rigs et leurs rapports techniques.
- `pnpm shadow:test` : vérifier combat et animation.
- `pnpm shadow:verify-motion` : vérifier le rendu réel, l’atelier, le raccord aux événements et le secours graphique dans le navigateur.
- `pnpm shadow:verify-trial` : vérifier de nouveau la boucle victoire/défaite.

Sources : `tools/lib/shadow-echoes/rig-data.mjs`, `rig-motion.mjs`, `rig-renderer.mjs`, `motion-app.mjs`. Les PNG HD restent les maîtres ; les JSON `mesh-rig-v1.json` et `mesh-qa-v1.json` sont reconstruits depuis les sources.
