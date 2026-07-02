# Playbook FIDÈLE HD 2,5D — logique reproductible (multi-jeux, sans GPU, non vectoriel)

> ⚠️ **REQUALIFIÉ (juillet 2026) : outil de PRÉVIZ/LAYOUT uniquement.**
> Ce pipeline recompose des planches existantes — il ne GÉNÈRE pas d'assets.
> Il reste précieux pour valider une composition en ~1 s, mais **aucun asset
> final ne doit en sortir**. La voie de production est la **Forge**
> (`tools/lib/forge/`, `pnpm forge:game`) : assets générés, identité
> verrouillée, rig squelettal, GDL + runtime générique, auto-play de validation.
> Voir `docs/03-pipelines/FORGE_V2.md`.

> Ce document montre à l'IA et à ses sous-agents **comment reproduire** le pipeline qui
> transforme des **planches concept** en **vrai jeu HD jouable**, fidèle à l'univers,
> 100 % CPU (sharp), déterministe, **sans GPU et sans vectoriel**.
>
> Il a déjà produit **deux jeux finis et jouables** à partir de leurs seules planches :
> - **Veloria — Veille des Lames** : gacha vertical 2,5D (3 lanes, vagues, boss).
> - **Echoes of the Mushroom Realm** : side-scroller plateforme 2,5D (niveau 2304 px).

---

## 0. Principe fondateur

**La planche concept EST la scène intégrée.** On n'extrait plus de sprites détourés (matte/cutout).
On assemble des **zones de planche** en panorama jouable ; la **collision reste en JSON** (layout GDL).

Modèle retenu : `board_integrated_scene_cpu` (panorama + acteurs board_master).

Modèle déprécié : `faithful_board_cutout_cpu` (découpe sprite + collage procédural).

---

## 1. Le moteur de découpe partagé — `tools/lib/hd-faithful/matte.mjs`

Game-agnostique. Seuls changent les **planches**, la **table de crops** et la **palette**.

| Fonction | Rôle | Quand l'utiliser |
|---|---|---|
| `featherMatte(data,w,h,o)` | garde le sujet intégral (même costume sombre), fond les bords, supprime en douceur un fond **sombre** | sujet sur **fond sombre** (bandes « créatures », grands visuels boss) |
| `floodMatte(data,w,h,o)` | remplissage par diffusion depuis les bords : retire un fond **uniforme clair** connecté aux bords, préserve l'intérieur même clair | fiche perso sur **fond clair/taupe** (héros, rois) |
| `textErase` (option de `featherMatte`) | efface des **boîtes** (titres/légendes de planche) à bord doux | retirer « CHEVALIER SPORAL », « ATTAQUES & », etc. |
| `cutoutSprite(board,crop,out,{mode,matte,maxW,flip})` | pipeline complet → PNG détouré (alpha), aspect préservé | tout sprite |
| `buildParallaxLayer(...)` | bande d'une scène → couche de profondeur (luminosité/flou/rampe alpha) | décors 2,5D |

**Règle d'or matte :** fond **sombre** → `feather` ; fond **clair** → `flood`. Ne jamais
floodMatte un sujet sombre sur fond sombre (efface le sujet), ni feather un sujet sombre
sur fond clair sans `bgColor` (garde le fond).

**Aspect toujours préservé :** on impose une hauteur, on dérive la largeur du ratio
naturel. **Jamais d'étirement.**

---

## 2. Pipeline en 7 étapes (à rejouer pour CHAQUE jeu)

1. **Auditer** les planches : lister casting, ennemis, boss, décors, niveaux, mécaniques.
2. **Caler la table de crops** (fractions `{x,y,w,h}` de chaque planche) en calibrant
   visuellement sur fond de test (monter une planche-contact, vérifier, ajuster).
   Choisir `feather`/`flood` selon le fond ; ajouter `textErase` pour les légendes.
3. **Générer les sprites** : `cutoutSprite` pour héros/ennemis/boss → `03_assets/faithful/`.
   `modulate` au besoin (éclaircir un boss sombre, teinter une variante enragée).
4. **Bâtir le décor 2,5D** : couches de parallaxe depuis le panorama du niveau
   (`buildParallaxLayer`), du lointain (sombre, flou) au proche (silhouette). Le flou
   sur les couches lointaines **rend illisibles** les annotations de planche.
5. **Écrire le manifeste** `faithful-manifest.json` (héros, map kind→sprite, parallax,
   méta niveau) — le runtime le consomme sans dépendance.
6. **Brancher le runtime 2,5D** (canvas) : profondeur (échelle far→near), **ombres
   portées**, **flip** selon la direction, animations (bob/lunge/run), HUD, états.
7. **Vérifier jouable** : servir la racine repo (URLs `/workspaces/...` absolues) +
   Playwright (scénario scripté, screenshots, `console`/`pageerror` = 0). Corriger.

Commande type par jeu : un build reproductible (`pnpm <jeu>:hd`) régénère **tout** depuis
les planches en ~1 s.

---

## 3. Spécialisations par genre (mêmes briques, runtime différent)

- **Veloria (gacha vertical, 720×1280)** — `gacha-renderer.js` : 3 lanes en perspective
  (HORIZON/FAR_SCALE/NEAR_SCALE), parallax d'arène, vagues, bénédictions, hazards,
  phases de boss. Boucle hub → choix héroïne → invocation → histoire → combat → victoire.
- **Echoes (side-scroller, 1280×720, niveau 2304)** — `preview.js` : **caméra suiveuse**
  clampée, **4 couches** parallax (ciel/médian/silhouette/spores), physique plateforme
  (gravité, saut, collisions), ennemis à patrouille + **stomp**, dangers, checkpoints,
  zones, cœurs, sortie.

Les deux partagent : sprites fidèles détourés, ombres portées, profondeur, no-GPU.

---

## 4. Enrichir un univers (contenu NEUF mais cohérent, wiré en live)

Après avoir porté les **éléments existants**, on **enrichit** avec des mécaniques qui
**n'existent pas** sur les planches mais découlent du lore — et on les **branche dans le
runtime**, pas seulement dans des données.

| Jeu | Ajout neuf | Ancrage lore | Câblage live |
|---|---|---|---|
| Echoes | **Écho de Spores** : jauge chargée par les spores ; à plein, **onde** qui **étourdit** les créatures du Réseau | « L'Écho, lié aux spores, le seul que le Grand Réseau ne peut pas lire » | jauge HUD, touche **E**, onde + stun + stomp bonus |
| Veloria | **Serment de Lame** : ultime à combo ≥ 8, **frappe balayant les 3 lanes** | « Veille des **Lames** » — lames liées par serment | orbe ULT, touche **E**, AoE + éclat doré |

**Patron d'enrichissement :** (1) trouver un fil de lore non exploité ; (2) en faire une
**ressource + déclencheur + effet + retour visuel** ; (3) le câbler dans `update`/`render`
+ HUD ; (4) vérifier par smoke-test (hook QA `window.__<jeu>State()` en lecture seule).

---

## 5. Reproduire — commandes

```bash
pnpm veloria:hd     # Veloria : sprites fidèles + 7 arènes 2,5D + playbook
pnpm echoes:hd      # Echoes : héros + 5 ennemis + boss + 4 couches parallax + manifeste
```

Jouer : servir la racine du repo, ouvrir
`/workspaces/<jeu>/07_exports/web/preview.html`.

Vérifier : Playwright sur l'URL, piloter le scénario, capturer, exiger
`pageerror=0` et atteindre l'objectif (Veloria : victoire ; Echoes : Porte du Refuge).
