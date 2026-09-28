# GDD commercial — Orbes d’Astra V2

## Genre et perspective

- Genre : action-puzzle RPG 3D de collection.
- Plateau : physique 2.5D dans une arène 3D.
- PC : paysage 16:9, plateau central, Gardiens latéraux, boss en profondeur.
- Mobile : portrait prioritaire, plateau sur les 62 % centraux, boss en haut,
  compétences au pouce en bas.
- Moteur cible : Godot 4 ou runtime WebGPU/Three.js après prototype comparatif.

## Boucle de 20 secondes

1. Prévisualiser les deux prochaines Orbes.
2. Viser horizontalement et choisir un lâcher normal ou chargé.
3. Corriger une fois la trajectoire pendant la chute.
4. Fusionner deux Orbes identiques.
5. Convertir la fusion en attaque du Gardien actif.
6. Réagir à la télégraphie du boss.
7. Déclencher une compétence ou changer de Gardien.

## Boucle de mission

1. Choisir trois Gardiens, une Relique d’escouade et un Familier.
2. Lire objectifs, éléments recommandés et attaques annoncées.
3. Jouer trois phases de 60 à 120 secondes.
4. Remplir la condition de victoire avant rupture du plateau.
5. Recevoir expérience de compte, matériaux déterministes et monnaie.
6. Améliorer une compétence, une relation ou une pièce cosmétique.

## Boucle hebdomadaire

- progresser dans la campagne ;
- terminer les contrats de trois factions ;
- tenter la Faille roguelite ;
- affronter le boss de Convergence ;
- jouer les activités de lien des Gardiens ;
- gagner une sélection hebdomadaire de monnaie d’invocation.

## Composition d’escouade

Une escouade contient :

- **Avant-garde** : présent dans l’arène, transforme les fusions en attaques ;
- **Contrôle** : compétence de plateau, défense ou manipulation ;
- **Résonance** : passif et réaction élémentaire.

Le changement de Gardien a un délai de 8 secondes. Une esquive parfaite ou une
cascade ×4 réduit ce délai. Les trois barres d’ultime sont indépendantes.

## Orbes et chaîne de fusion

| Rang | Nom | Fonction ajoutée |
|---:|---|---|
| 1 | Pio | unité légère, rebond élevé |
| 2 | Lumi | crée une étincelle élémentaire |
| 3 | Séla | active le talent de l’Avant-garde |
| 4 | Kori | projette un éclat vers le boss |
| 5 | Hélio | brise un segment d’armure |
| 6 | Auriel | déclenche la réaction d’escouade |
| 7 | Gaïa | stabilise temporairement la ligne de rupture |
| 8 | Astra | attaque Nexus et récompense de maîtrise |

Deux rangs identiques fusionnent. Trois Orbes identiques en contact pendant la
même fenêtre créent une **Fusion parfaite** : rang supérieur, onde de poussée et
charge bonus. Une chaîne de fusions en moins de 2,4 secondes augmente le combo.

## Entrées joueur

### PC

- souris : visée ;
- clic gauche : lâcher ;
- maintenir puis relâcher : chute chargée ;
- A/D ou flèches : correction aérienne ;
- 1/2/3 : changer de Gardien ;
- Q/E/R : compétences ;
- Espace : ultime ;
- Maj : Surpuissance si la seconde jauge est pleine.

### Mobile

- glisser horizontalement : visée ;
- toucher : lâcher ;
- maintenir : charge ;
- glisser pendant la chute : correction ;
- trois portraits : changement ;
- boutons de compétence à portée du pouce ;
- vibration distincte pour fusion, danger et parade.

## Combat de boss

Chaque boss possède :

- barre de vie et jauge de rupture ;
- trois phases avec modification de silhouette ;
- deux attaques de plateau, une attaque d’escouade, une punition anti-attente ;
- télégraphie visuelle ≥ 900 ms et signal sonore unique ;
- fenêtres de vulnérabilité produites par les fusions ;
- attaque finale évitable par une condition de maîtrise, jamais par hasard.

Exemple — Léviathan des Marées :

1. **Marée orbitale** pousse toutes les Orbes vers un bord.
2. **Graine abyssale** ajoute une Orbe parasite à purifier.
3. **Chant de noyade** bloque une compétence jusqu’à une Fusion parfaite.
4. Rupture : fusionner deux Kori Eau ou déclencher une réaction Foudre.

## Modes de jeu

### Campagne — Route du Nexus

30 missions au lancement : tutoriels intégrés, combats, survies contrôlées et
boss. Une mission a un objectif combat, une contrainte de plateau et trois étoiles
de maîtrise. La progression ne dépend pas du score brut.

### Faille variable — Roguelite

Run de 20 à 30 minutes, cinq salles et un boss. Après chaque salle, choisir un
modificateur parmi trois. Tous les Gardiens possédés sont normalisés au niveau de
la Faille afin de limiter le pay-to-win.

### Convergence — Boss hebdomadaire

Boss avec règles fixes pendant sept jours. Classement par paliers de contribution,
pas par rang unique. Les récompenses principales sont atteignables sans paiement.

### Duels d’échos

Défi asynchrone contre un plateau enregistré, sans achat d’énergie et avec niveau
normalisé. Ce mode reste hors lancement tant que l’anti-triche n’est pas validé.

## Activités secondaires

### Danse des constellations

Jeu de rythme à quatre pistes utilisant les animations et thèmes des Gardiens.
Objectif : synchroniser les glyphes, déclencher un duo et gagner des matériaux de
lien. Durée : 2 minutes. Difficultés : Histoire, Normal, Maître.

### Chasse astrale

Galerie de tir 3D dans l’Observatoire. Le Gardien vise des anomalies et protège
des Orbes civiles. Les cibles changent selon l’élément et apprennent les timings
utiles du combat principal.

### Atelier des tenues

Puzzle spatial déterministe : placer motifs, gemmes et constellations sur une
grille de couture pour fabriquer des teintures, accessoires et variantes. Aucune
récompense aléatoire payante.

## Relations et sensualité

Chaque Gardien possède cinq rangs de lien obtenus par usage, missions personnelles
et choix de dialogue. Les rangs débloquent :

1. profil et pose d’accueil ;
2. conversation privée ;
3. animation sociale dans le hub ;
4. mission personnelle ;
5. tenue de prestige et scène de confiance.

Les scènes restent suggestives et émotionnelles, sans contenu sexuel explicite.
Les choix ne simulent jamais un consentement acheté.

## Contenu de lancement

- 12 Gardiens finalisés et 12 suivants au stade production validée ;
- 3 régions : Rade des Étoiles, Forge du Soleil mort, Royaume derrière la Nuit ;
- 6 lieux de hub visitables ;
- 30 missions, 3 boss, 15 types d’ennemis ;
- 3 activités secondaires ;
- 36 reliques, 12 Familiers, 48 costumes/variantes couleur ;
- 90 minutes de musique adaptative ;
- français et anglais au lancement.

