# Roadmap mobile 2D HD sans gros GPU

Ce document traduit la vision du PDF Ellisphere et les besoins du projet en une feuille de route executable dans ce depot, sans repartir de zero.

## Positionnement

Le bon axe n'est pas de viser tout de suite un generateur universel 2D/3D, mais une usine a jeux 2D HD mobile/web-first avec:

- generation par prompts et references visuelles
- workspaces strictement isoles par jeu
- pipeline d'assets iteratif et tracable
- runtime leger et testable
- possibilite d'ajouter ensuite la 3D et les exports natifs

Le depot contient deja des briques utiles:

- `packages/orchestrator`: bootstrap projet, backlog, documents, builds
- `packages/pipeline`: photo -> sprite, decor, lot0, mesh stub
- `packages/studio`: UI de pilotage de workspaces
- `packages/db`: stockage metadata projets, assets, variantes et builds
- `docs/`: vision, architecture, pipeline et roadmap initiale

## Lecture strategique

Le PDF recommande une separation nette entre intention produit, fabrication et execution. Cette direction est correcte et deja partiellement visible ici.

Ce que je recommande de garder:

- systeme multi-agents oriente contrats et artefacts
- GDL ou IR declaratif patchable
- stockage metadata en base et binaires hors base
- boucle QA obligatoire avant preview et export

Ce que je ne recommande pas de reecrire tout de suite:

- migration immediate de Fastify vers FastAPI
- replatforming complet du runtime avant d'avoir verrouille le pipeline 2D HD
- dependance centrale a la 3D realiste de personnes

En pratique, la priorite doit etre:

1. fiabiliser le lot mobile 2D HD
2. rendre les workspaces de jeu vraiment exploitables
3. faire monter la qualite et la tracabilite
4. seulement ensuite industrialiser les workers lourds, l'object store et les workflows durables

## Architecture cible pour ce depot

### 1. Couche projet

Un jeu = un workspace = une memoire durable.

Chaque jeu doit avoir:

- son prompt source
- ses iterations
- ses briefs et docs
- son cast et ses references
- ses scenes
- ses exports
- ses rapports QA

Arborescence recommandee:

```text
workspaces/{project-slug}/
  00_brief/
  01_inputs/
  02_design/
  03_assets/
  04_scenes/
  05_runtime/
  06_qa/
  07_exports/
  08_ops/
```

### 2. Couche asset

Pour tenir la promesse "HD sans gros GPU", le pipeline doit privilegier:

- decoupage deterministe d'abord
- upscale local en deuxieme passe
- generation guidee plutot que regeneration complete
- variantes approuvees par asset
- atlas, spritesheets, pivots et collisions documentes

Cela veut dire:

- asset source immuable
- variantes derivees notees
- manifest asset par dossier
- budget texture par plateforme

### 3. Couche scene

Les images de niveau que tu as fournies montrent une direction forte:

- panorama de niveau haute lisibilite
- zones fonctionnelles claires
- declinaisons biome/lumiere/corruption
- compatibilite avec un cast et des skins communs

La bonne approche est donc un niveau fabrique a partir de modules:

- biome guide
- tileset modulaire
- props interactifs
- points d'ancrage de gameplay
- collisions et danger zones
- overlays de progression

### 4. Couche runtime

Pour mobile et web, il faut viser:

- 2D native dans le navigateur
- parallax limite
- batches et atlas
- profils low, medium, high
- export PWA/mobile wrapper plus tard

Le runtime doit rester declaratif:

- scene spec
- entity spec
- animation spec
- UI spec
- perf budget spec

## Roadmap recommande

## Phase A - Structuration projet

Objectif: transformer la notion de "workspace" en vrai dossier de production.

Livrables:

- scaffold de dossier par jeu
- seed automatique des briefs, prompts et backlog
- dossier reserve par asset
- conventions de nommage et manifests de contexte

Statut dans ce depot:

- partiellement fait au niveau BDD
- a rendre concret sur disque et dans la gouvernance de production

## Phase B - Pipeline HD 2D

Objectif: produire un cast et un premier niveau lisibles en mobile HD sans GPU lourd.

Livrables:

- pipeline hero/enemy/NPC a partir de references
- spritesheets HD et variantes de poses
- extraction de palette et style lock
- pack decor modulaire
- first pass d'animation exploitable

Priorites techniques:

- `packages/pipeline/src/lot0`
- validation alpha et atlas
- budgets de resolution par role d'asset

## Phase C - Scenes jouables et maps modulaires

Objectif: passer des images conceptuelles de niveau a une scene modulaire jouable.

Livrables:

- schema scene biome-first
- points d'ancrage spawn/checkpoint/door/boss
- collisions, hazards, zone tags
- mini-map / vue logique de progression
- test automatique de traversabilite

## Phase D - QA, scoring et revisions

Objectif: rendre chaque sortie IA reevaluable et comparable.

Livrables:

- score de lisibilite par asset
- score de coherence de palette
- smoke test scene
- checklist mobile perf
- journal d'iterations et decisions

## Phase E - Industrialisation workers

Objectif: absorber les traitements plus lourds sans imposer un gros GPU local.

Livrables:

- workers separes CPU / GPU
- object storage compatible S3 ou MinIO
- workflow durable pour retries et longues generations
- queue dediee assets / audio / scenes / builds

Point de vigilance:

Le PDF pousse Temporal et S3. C'est une bonne cible phase 2+, mais inutile de bloquer le lot 2D HD en attendant. Il faut d'abord stabiliser les contrats et la qualite des artefacts.

## Phase F - Export mobile

Objectif: sortir un jeu consultable sur telephone sans changer tout le pipeline.

Livrables:

- profil mobile low/mid/high
- export PWA
- wrapper natif ensuite
- compression textures, audio et bundles
- checklists UX mobile

## Priorites immediates

Si on suit ton objectif et l'etat actuel du depot, voici le meilleur ordre:

1. consolider les workspaces par jeu
2. enrichir le pipeline hero + cast + enemy HD
3. normaliser la fabrication d'un niveau modulaire a partir d'images de reference
4. ajouter les validateurs asset/scene/perf
5. brancher l'export mobile web-first
6. preparer ensuite les workers lourds et l'object store

## Risques a cadrer

- photo de personne: privacy, retention, consentement et export public
- HD mobile: trop de textures tue les performances si les budgets ne sont pas stricts
- generation libre: sans style lock, la coherence visuelle se casse vite
- 3D trop tot: cout et complexite montent plus vite que la valeur produit MVP

## Decision de cadrage

Pour ce depot, je recommande de faire d'Ellipse d'abord une "factory de jeux 2D HD mobiles/web" avant d'en faire une plateforme 3D large.

En termes produit, cela veut dire:

- un cast HD coherent
- une map modulaire propre
- une animation lisible
- une boucle gameplay testable
- une pipeline d'iteration par jeu sans melange

Si ces cinq points sont solides, l'ajout des workers lourds, de la 3D et des exports etendus devient une extension naturelle plutot qu'une re-ecriture.
