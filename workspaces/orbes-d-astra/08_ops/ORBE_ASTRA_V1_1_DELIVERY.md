# Orbes d’Astra 1.1 — livraison jouable autonome

## Résultat

Orbes d’Astra est livré comme application Windows autonome. Le joueur n’a plus
besoin d’ouvrir Ellipse Studio ou sa fenêtre Preview.

- Exécutable direct : `Orbes-d-Astra.exe`
- Cible : Windows 64 bits
- Mode : application Electron locale autonome
- Plein écran : `F11`
- Sauvegarde : stockage local persistant
- Connexion réseau : non requise pour jouer

## Corrections visuelles

Le portrait aplati provenait du rendu d’une cellule de spritesheet avec une taille
forcée à `600 % × 400 %`. Le ratio de chaque personnage héritait donc du ratio du
conteneur.

La version 1.1 :

1. découpe les 24 personnages en portraits indépendants ;
2. conserve le ratio d’origine avec un cadrage sans étirement ;
3. utilise un cadrage différent pour le hub, les cartes, la galerie et les missions ;
4. affiche le Gardien actif en grand dans l’interface de mission PC ;
5. affiche le personnage et sa magie dans une cinématique plein écran lors des
   ultimes et surpuissances.

## Magies et surpuissance

La charge astrale possède maintenant deux seuils tactiques :

- `100/200` : l’ultime du Gardien peut être déclenché immédiatement ;
- `200/200` : la surpuissance renforce l’ultime, augmente son niveau effectif de
  deux rangs et applique un multiplicateur supplémentaire.

Le joueur choisit donc entre une magie rapide de sécurisation et une attaque plus
rare et beaucoup plus puissante. Les douze familles d’ultimes existantes profitent
du système : gravité, forge, temps, supernova, pluie d’étoiles, ascension, égide,
constellation, écho, éclat, vide et aurore.

## Mini-jeux remplacés

### Chasse aux runes

Épreuve tactile et souris de 30 secondes :

- identifier le Gardien demandé parmi douze portraits ;
- maintenir un combo ;
- suivre les permutations du roster après chaque réussite ;
- atteindre vingt runes avant la fin ;
- pénalité de score en cas d’erreur.

### Forge des comètes

Épreuve rythmique à huit impulsions :

- vitesse croissante ;
- zone de frappe progressivement réduite ;
- trajectoire composée de deux oscillations ;
- score multiplié par le combo ;
- rangs `PARFAIT`, `RÉSONANCE`, `INSTABLE`.

## Compilation

Pipeline complet :

```powershell
corepack pnpm orbes:desktop
```

Étapes automatisées :

1. compilation du moteur ;
2. tests de simulation ;
3. export du jeu et des assets ;
4. génération des 24 portraits ;
5. préparation du runtime autonome ;
6. création de l’EXE Windows portable.

## Validation

- 27 tests moteur de fusion/progression réussis ;
- 1 test d’export orchestrateur réussi ;
- vérification des 24 portraits exportés ;
- vérification de la magie plein écran et de la surpuissance ;
- démarrage réel de l’EXE portable ;
- fenêtre `Orbes d’Astra` détectée comme répondante.

Le binaire n’est pas signé avec un certificat commercial. Windows SmartScreen peut
donc afficher un avertissement lors du premier lancement.
