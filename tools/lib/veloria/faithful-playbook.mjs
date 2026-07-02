/**
 * Playbook agent — produire Veloria en HD FIDÈLE + 2,5D, sans GPU, reproductible.
 * C'est le document de référence que l'IA maîtresse (Cortex) et les sous-agents
 * suivent pour reproduire la logique sur n'importe quel jeu 2D/2,5D à base de planches.
 */
export function buildFaithfulHdPlaybook() {
  return `# Veloria — Playbook IA : du concept art au vrai jeu HD 2,5D (sans GPU)

> **But.** Transformer des planches concept en un **vrai jeu HD jouable, fidèle à l'univers**,
> sans modélisation 3D, sans diffusion GPU, sans rendu vectoriel « approximatif ».
> Tout est **déterministe et rejouable** : mêmes planches + mêmes crops = mêmes pixels.

---

## 0. Principe directeur (le renversement)

L'ancienne approche fabriquait des **silhouettes vectorielles** qui *imitaient* les planches
(\`procedural_hd_vector_cpu\`). Résultat : sprites déformés, non fidèles. **On l'abandonne.**

**Nouvelle loi :** *la planche EST l'art HD final.*
On ne **régénère** pas le personnage — on le **découpe** proprement de la planche et on le
**détoure** pour qu'il vive dans l'arène. La fidélité est garantie par construction.

| | Ancien (rejeté) | Nouveau (fidèle) |
|---|---|---|
| Source sprite | builder vectoriel | **crop de la planche** |
| Détourage | — | **matte feather (CPU)** |
| Fidélité | approximative | **pixel = planche** |
| GPU | non | non |
| Animation | frames vectorielles | **transforms 2D au runtime** |

---

## 1. Chaîne de production (qui fait quoi)

| Étape | Agent | Entrée | Sortie | Outil |
|------|-------|--------|--------|-------|
| Cadrage | **Art Direction** | planche 1448×1086 | table de crops normalisés | œil + \`crop\` {x,y,w,h} |
| Découpe | **Character / Decor** | planche + crop | \`combat_sprite.png\` détouré | \`sharp\` (CPU) |
| Portrait | **Character** | même buffer | \`portrait.png\` 256² | \`sharp\` |
| Arène | **Level / Decor** | scène de planche | \`arena_bg.png\` 720×1280 2,5D | \`sharp\` + SVG overlay |
| Animation | **Animation** | sprite unique | bob / lunge / depth | transforms canvas au runtime |
| Intégration | **Integration** | sprites + GDL | jeu jouable | \`gacha-renderer.js\` |
| QA | **QA** | rendu | lisibilité 2,5D, 60 FPS | screenshot Playwright |

Commande unique reproductible :

    pnpm veloria:hd        # node tools/build-veloria-hd.mjs

---

## 2. La découpe fidèle (cœur technique)

### 2.1 Table de crops (Art Direction)
Pour chaque entité, un rectangle **normalisé** sur la planche source :

    aureline → personnages_principaux_v2.png { x:0.030, y:0.135, w:0.150, h:0.305 }

Règles de cadrage :
- **1 pose par sprite** (la pose principale, pas la « pose alternative »).
- Tête incluse, pieds inclus ; on tolère un peu de texte de carte en périphérie
  (il sera fondu par le matte et invisible à l'échelle lane ~140 px).
- Ennemis : préférer une **source nette** (scène de combat ou vignette « Ennemi Principal »)
  plutôt qu'un mockup chargé de HUD.

### 2.2 Matte « feather » (Character / Decor)
Problème : un costume sombre (Morgane, Isolde) ≈ fond sombre. Un keying par luminance
**efface le personnage**. Un flood-fill **mange** les costumes noirs. Solution fidèle :

> **On ne détoure pas en dur. On garde le personnage intact et on fond les bords dans le noir.**
> Les arènes étant elles-mêmes sombres, le rectangle disparaît, seul le personnage reste lisible.

Algorithme (buffer RGBA brut, CPU) :
1. \`alpha_bord\` = produit de 4 rampes smoothstep (haut/bas/gauche/droite) → fond les bords.
2. \`alpha_sombre\` = smoothstep(luminance) → atténue **doucement** le fond quasi-noir,
   **mais jamais le centre** (où se tient la figure) grâce à un \`centerKeep\`.
3. \`alpha = alpha_bord × (0.35 + 0.65·alpha_sombre)\`.
4. Atténuation ciblée du bloc texte haut-gauche (rôle / archétype / étoiles).

Paramètres par rôle : héroïnes \`top:0.12\`, ennemis \`top:0.08\`, boss \`top:0.08\`.
Déterministe : pas d'aléa, pas de réseau.

### 2.3 Sortie par pack
    03_assets/.../<entité>/06_exports/
      combat_sprite.png   ← sprite fidèle détouré (alpha)
      portrait.png        ← buste carré (hub / cartes)

---

## 3. Les arènes 2,5D (Level / Decor)

Chaque scène d'ambiance de planche **possède déjà sa perspective** (couloir, voûte qui fuit).
On l'exploite :
1. \`extract\` de la scène → \`resize cover\` 720×1280, \`brightness 0.82\` (lisibilité du combat).
2. Overlay SVG : voile d'horizon (brume), vignette radiale, **trapèze de plancher** qui
   converge vers la ligne de fuite (\`HORIZON_Y = 110\`, \`ground = 973\`), voile bas.
3. Le **point de fuite de l'art = la ligne de fuite des lanes** → la 2,5D est cohérente.

---

## 4. La 2,5D au runtime (Animation / Integration)

\`gacha-renderer.js\` ajoute la profondeur **sans assets supplémentaires** :

- **Profondeur de lane.** \`depthAt(y)=clamp((y-HORIZON)/(GROUND-HORIZON))\`,
  \`scaleAt(y)=lerp(0.5, 1.12, depth)\`. Un ennemi naît **petit (far)** en haut et
  **grandit (near)** en descendant. Tri painter's (far d'abord).
- **Ombres portées.** Ellipse au sol sous chaque sprite, taille ∝ profondeur.
- **Parallax.** Le décor se décale de \`-laneShift·22\` px et la ligne de fuite de
  \`-laneShift·8\` px selon la lane du joueur → sensation de volume.
- **Sprites fidèles sans distorsion.** On impose **la hauteur** cible et on dérive la
  largeur de l'\`aspect\` naturel de l'image (jamais d'étirement).
- **Animation 2D** du sprite unique : \`dy = sin(t·4)·3\` (bob idle) \`− lunge·16\`
  (fente à chaque attaque). Pas de spritesheet nécessaire.

---

## 5. Mécaniques branchées (Gameplay)

\`veloria-systems.js\` pilote la boucle, **données issues du GDL** (scenes[i].veloria) :
- **Lanes** (3) + déplacement gauche/droite, **auto-attaque** à portée.
- **Vagues** (12) + soft-cap d'ennemis, **boss en 3 phases** (seuils de PV).
- **Bénédictions** offertes aux vagues 3/6/9 (modificateurs dmg / vitesse / soin),
  affichées en HUD.
- **Hazards** : 1 par arène (effondrement, flammes, piques, marée, cercle occulte,
  lames) — télégraphe pulsé puis dégât sur la lane, dégradé + liseré d'avertissement.
- **Combo / Ultime** (jauge à 8), **PV**, **score**.
- Données meta prêtes à brancher : **runes, sigilles, reliques, invocations, sets,
  soutiens** (déclencheurs alliés) — définis dans \`data.mjs\`, exposés au design.

---

## 6. Histoire + liaison des 6 niveaux (Narrative / Level)

- Hub **Pavillon des Veilles** → descente narrative jusqu'au **Trône du Crépuscule**.
- Carte d'intro + **beat narratif par arène** (\`STORY.levels\`), affichés à l'entrée.
- **Progression** : vaincre l'arène N déverrouille N+1 (\`unlocked\`), écran de victoire
  annonçant l'arène suivante. Sélection d'héroïne au hub (← / →).

---

## 7. Étendre (recette pour un agent)

**Ajouter un personnage**
1. \`data.mjs\` : entrée { key, pack_root, board } + crop dans \`faithful-hd.mjs\`.
2. \`pnpm veloria:hd\` → sprite + portrait fidèles générés.
3. Référencer la key dans \`meta.asset_atlas\` du GDL.

**Ajouter une arène**
1. \`ENV_CROPS\` : scène de planche + \`hazard_script\`.
2. \`pnpm veloria:hd\` → \`arena_bg.png\` 2,5D.
3. Ajouter une scène au GDL (layout 3 lanes + encounters + blessings).

**Porter la logique à un AUTRE jeu (ex. Echoes of the Mushroom)**
> Mêmes 7 étapes : importer les planches → table de crops → \`sharp\` matte → arènes 2,5D
> → câbler le GDL → runtime → QA screenshot. Seules changent les **planches**, les **crops**
> et la **palette**. Le moteur est agnostique du jeu.

---

## 8. Anti-patterns (interdits)

- ❌ Régénérer un personnage en vectoriel « façon planche » (non fidèle).
- ❌ Détourer en dur un costume sombre (trous / personnage effacé).
- ❌ Étirer un sprite à un rectangle d'aspect différent (distorsion).
- ❌ Fond d'arène plat sans plancher de perspective (perd la 2,5D).
- ❌ Écraser le GDL Veloria par un template platformer générique.

---

## 9. Vérification (QA)

- \`node tools/build-veloria-hd.mjs\` se termine sans \`⚠\`.
- 18 \`combat_sprite.png\` + 7 \`arena_bg.png\` présents et non vides.
- Screenshot Playwright : hub lisible, combat 2,5D (ennemis far→near, ombres,
  hazard télégraphié), 0 erreur console.
`;
}
