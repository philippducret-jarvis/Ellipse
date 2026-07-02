/**
 * Playbook pour agents — comment fabriquer des assets HD Veloria (reproductible).
 */
export function buildAgentHdPlaybookMarkdown() {
  return `# Veloria — Playbook usine assets HD

> **Ce document enseigne aux agents Ellipse comment produire des assets HD** à partir des planches concept et des specs design — sans GPU, de façon déterministe et reproductible.

## Philosophie

1. **Les planches (01_inputs/references/)** = intention visuelle, pas livrables finaux.
2. **Les crops (02_cutouts/)** = études de composition — conservés en 01_source/board-cutout-reference.png.
3. **Les assets HD shipping** = vectoriel thématisé → raster CPU → pipeline stages 03–06.

Commande unique :

    pnpm veloria:assets

## Pipeline par pack (03_assets/.../hero__*)

| Stage | Dossier | Agent(s) | Sortie |
|-------|---------|----------|--------|
| 01 | 01_source/ | Art Direction | référence planche + style-lock |
| 02 | 02_cutouts/ | Character | crop board (legacy) |
| **03** | 03_cleanup/ | Character, Decor | silhouette_hd_master.png |
| **04** | 04_rig/ | Animation | rig.json (pivots) |
| **05** | 05_animation/ | Animation | idle_*.png, run_*.png, attack_*.png |
| **06** | 06_exports/ | Integration | runtime_atlas.png + runtime_atlas.json + runtime-manifest.json |
| 07 | 07_qa/ | QA | smoke lisibilité 32px |

## Comment le HD est généré (technique)

### Étape A — Builder vectoriel (procedural-builders.mjs)
- Palette verrouillée : #16131f #241528 #5a3a72 #9e4f5c #c9a227 #5ec7ef #f0d9a6 #702030
- Primitives : rect, circ, elli, poly → AssetSpec
- 1 builder par entité (buildHeroSpec('aureline', frame), etc.)
- Le paramètre frame anime idle/run (sway, bob, pulse)

### Étape B — Rasterisation (writeAssetSpecPng, pipeline)
- SVG pur → sharp CPU, profil high
- Même seed + même builder = même pixel output (rejouable)

### Étape C — Atlas (buildAtlasGrid)
- Grille frames 05_animation → runtime_atlas.png
- JSON avec anchors, clips, frame rects

### Étape D — Câblage GDL
- Héro actif : entities[player].assets.sprite = URL atlas
- Ennemis : layout.enemies[].sprite
- Fond : scenes[0].background.image

## Règles par rôle

### Héroïnes (×6)
- Taille master : 128×192 px vector → raster HD
- Clips : idle×4, run×4, attack×3
- Silhouette : arme lisible (lance, lames, bâton, arbalète, orbe)

### Ennemis (×5) + Boss (×1)
- Ennemi : 96×96, clips walk×4
- Boss : 160×192, clips phase×3

### Environnements (×7)
- 720×1280 portrait — piliers, voûtes, hub circulaire
- 1 frame static + atlas 1 cellule

### Reliques / UI / FX
- Props 64×64, UI cards, FX télégraphes

## Extension par un agent

Pour ajouter un asset :
1. Entrée dans tools/lib/veloria/data.mjs (pack_root, key, role)
2. Builder dans procedural-builders.mjs si silhouette unique
3. Relancer pnpm veloria:assets
4. QA : runtime-manifest.json présent + atlas non vide

## Sprint B — Raffinement héro vs planche (pnpm veloria:sprint-b)

Workflow reproductible pour les 6 héroïnes :

1. **Prep** — cutouts planche dans 02_cutouts/ (pnpm veloria:prep)
2. **Normalisation** — planche → 03_cleanup/board_hd_normalized.png (256×384)
3. **Candidat procédural** — 03_cleanup/procedural_candidate.png via buildHeroSpec
4. **Pixel-diff gate** — IoU silhouette vs planche (seuil pass: 0.42, strong: 0.55)
5. **Décision** :
   - strong_pass → master procédural + frames vectorielles
   - sinon → hybrid board + accent overlay (screen) + frames raster animées
6. **QA** — 07_qa/silhouette-diff-report.json + heatmap PNG

Rapport global : 08_ops/manifests/sprint-b-hero-refinement.json
Bible gates : 02_design/specs/hero-silhouette-gates.json
Profils : tools/lib/veloria/hero-profiles.mjs + HERO_BUILDER_HINTS dans procedural-builders.mjs

## Anti-patterns (ne pas faire)

- Utiliser uniquement un crop board comme sprite final
- Écraser le GDL Veloria avec un template platformer générique
- Sauter l'atlas — le runtime consomme des spritesheets
- Palette hors or/violet/carmin sans validation Art Direction

## Prochaines passes agent

| Agent | Action |
|-------|--------|
| Character | Affiner builders vs planches (pixel-diff gate) |
| Animation | Ajouter skills 1-3 + ultimate par héro |
| Decor | Props cloître modularisés (piliers, bannières) |
| Level | 6 arènes HD + collisions lanes |
| Gameplay | Brancher clips attack dans auto_attack |
| Integration | Export HTML5/PWA portrait |
`;
}
