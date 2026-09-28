# Orbes d'Astra — Règles du jeu (base de conception)

Version 1.0 — document de référence. Toute valeur chiffrée ici est la source de vérité du GDL
(`meta.merge_drop`) et de la simulation (`packages/engine/src/sim/merge-drop.ts`).

---

## 1. Boucle de jeu

1. **Hub (Observatoire)** : le joueur choisit un lieu — Puits de fusion (jouer), Sanctuaire
   (invoquer des Gardiens), Reliquaire (invoquer reliques & compagnons), Galerie (gérer les
   Gardiens : sélection, éveil, compétences), Chroniques & Codex (univers, règles).
2. **Préparation** : le loadout actif = 1 Gardien (ult + compétences) + 1 Relique (passif)
   + 1 Compagnon (soutien déclenché).
3. **Combat (le Puits)** : faire descendre des Astres, fusionner les jumeaux, déclencher l'ult,
   survivre à la ligne astrale, viser Astra (rang final).
4. **Récompenses** : éclats gagnés en jeu → invocations → nouveaux personnages/reliques →
   doublons → évolution (étoiles) + essence (éveil) → boucle.

## 2. Le plateau (la Cuve)

- Résolution logique : 720 × 1280 (portrait).
- Cuve : x=72, y=184, largeur=576, hauteur=824.
- **Ligne astrale (défaite)** : y=326. Un Astre posé (vitesse verticale < 90 px/s, âgé de
  plus de 900 ms) dont le sommet dépasse la ligne remplit la jauge de débordement.
- **Grâce de débordement** : 1600 ms (modifiable par compétences/reliques). Jauge qui se
  vide ×1.8 plus vite qu'elle ne se remplit quand le danger cesse.
- Gravité : 1180 px/s². Pas de simulation fixe : 8 ms (déterministe à 60/30/20 FPS).
- Cooldown de drop : 280 ms (réductible, plancher 120 ms).

## 3. Les Astres incarnés (les « billes »)

Huit esprits du Nexus. Deux Astres **du même rang** qui se touchent fusionnent en l'aîné.

| Rang | Persona | Titre      | Rayon | Score | Couleur  |
|------|---------|------------|-------|-------|----------|
| 1    | Pio     | Étincelle  | 24    | 12    | #5eead4  |
| 2    | Lumi    | Rosée      | 31    | 30    | #38bdf8  |
| 3    | Séla    | Lune       | 40    | 72    | #818cf8  |
| 4    | Kori    | Comète     | 50    | 160   | #c084fc  |
| 5    | Hélio   | Soleil     | 62    | 360   | #fb7185  |
| 6    | Auriel  | Couronne   | 76    | 800   | #f59e0b  |
| 7    | Gaïa    | Monde      | 92    | 1800  | #84cc16  |
| 8    | Astra   | Nexus      | 112   | 4200  | #f8fafc  |

- Tirage du prochain Astre : rang 1 = 66 %, rang 2 = 26 %, rang 3 = 8 %.
- Le joueur voit **l'Astre courant en prévisualisation réelle** au point de visée et
  **l'Astre suivant** en miniature dans le HUD avant de cliquer.
- **Victoire de manche** : créer Astra (rang 8) → +200 éclats, Nexus restauré +1, la manche
  se fige en victoire.

## 4. Score, cascades, monnaies

- Score de fusion : `score_du_rang_créé × (1 + min(combo, 8) × 0,12)`.
- **Cascade (combo)** : fenêtre de 1050 ms (extensible) relancée à chaque fusion.
- Éclats gagnés par fusion : `max(1, ⌊points / 35⌋)` (bonus % possibles).
- **Éclats (✧)** : monnaie d'invocation, gagnée uniquement en jeu (aucun achat).
- **Essence (✦)** : obtenue sur les doublons ; sert à **l'éveil** des ults.
- Charge d'ult par fusion : `11 + 3 × rang_créé` (+ bonus), plafonnée à 100.

## 5. Les Gardiens (12) — ult + compétences spécifiques

Le Gardien **sélectionné** détermine l'ult ET les compétences passives actives en combat.

### 5.1 Ults (charge 100 %)

| Gardien | Rareté | Ult | Effet de base |
|---------|--------|-----|----------------|
| Mira    | R  | Puits astral        | Attire tous les Astres vers le centre (impulsion + poussée vers le bas). |
| Brann   | R  | Frappe runique      | Le prochain Astre lâché est forgé +1 rang (É3 d'éveil : +2). |
| Kael    | R  | Pluie d'étoiles     | Dissout jusqu'à 3 Astres du plus petit rang → score + éclats. |
| Orin    | R  | Écho jumeau         | La prochaine fusion vaut ×3 points/éclats. |
| Lys     | SR | Temps suspendu      | Ralenti 6 s + tasse l'Astre le plus haut + purge la jauge. |
| Noor    | SR | Ascension           | Élève 2 petits Astres d'un rang. |
| Vesper  | SR | Voile stellaire     | Purge la jauge, tasse la pile, bref ralenti. |
| Saphira | SR | Éclat pur           | Brise l'Astre le plus haut (le plus dangereux) → 80 % de sa valeur. |
| Nyx     | SR | Bascule du vide     | Améliore d'un rang l'Astre courant ET le suivant. |
| Aster   | SSR| Supernova           | Fusionne une paire de chaque rang. |
| Élya    | SSR| Constellation       | Effondre toutes les paires du plateau en cascade complète. |
| Solveig | SSR| Aurore boréale      | 8 s : fusions ×2 points et cascade entretenue. |

### 5.2 Éveil (essence)

- Coût : 40 ✦, +30 ✦ par niveau. Maximum : niveau 5.
- Chaque niveau : +20 % de puissance d'ult (durées, forces, quantités selon l'ult).

### 5.3 Évolution (doublons → étoiles) et compétences

- Chaque **doublon** du Gardien : +1 ★ (max 5 ★) **et** essence de compensation
  (R 15 / SR 35 / SSR 80).
- Déblocages : **1 ★ → compétence A**, **3 ★ → compétence B**, **5 ★ → Transcendance**
  (+20 % de puissance d'ult permanent, cumulable avec l'éveil).
- Les compétences ne s'appliquent **que si le Gardien est sélectionné**.

| Gardien | Compétence A (1★) | Compétence B (3★) |
|---------|-------------------|--------------------|
| Mira    | Fil d'argent — éclats de fusion +10 % | Cœur du puits — +2 charge par fusion |
| Brann   | Braises — score +8 % | Souffle de forge — +2 charge par drop |
| Kael    | Instinct de chasse — éclats +12 % | Ciel dégagé — grâce +250 ms |
| Orin    | Ressac — cascade +200 ms | Marée montante — score +10 % |
| Lys     | Rosée persistante — ralenti 1,5 s sur cascade ×3 | Sablier fêlé — cascade +300 ms |
| Noor    | Aube claire — commence à 20 % de charge | Élan céleste — +3 charge par fusion |
| Vesper  | Garde du soir — grâce +400 ms | Pas feutré — cooldown de drop −60 ms |
| Saphira | Tranchant — score +12 % | Facettes — éclats +8 % |
| Nyx     | Ombre utile — cooldown −50 ms | Regard du vide — +3 charge par drop |
| Aster   | Héritage — +4 charge par fusion | Noblesse — score +15 % |
| Élya    | Chœur mineur — éclats +15 % | Harmonie — cascade +350 ms |
| Solveig | Premier rayon — commence à 30 % de charge | Chaleur douce — ralenti 2 s sur cascade ×3 |

## 6. Invocations

### 6.1 Sanctuaire (Gardiens)

- ×1 : 100 ✧. ×10 : 900 ✧ avec **au moins un SR+ garanti**.
- Taux publiés : R 70 % · SR 25 % · SSR 5 %.
- **Pitié** : SSR garanti au 10ᵉ tirage sans SSR (compteur propre au Sanctuaire).
- Doublon : +1 ★ d'évolution (si < 5★) + essence.

### 6.2 Reliquaire (reliques & compagnons)

- Bannière mixte : 6 reliques + 6 compagnons dans le même pool.
- ×1 : 80 ✧. ×10 : 720 ✧ avec **au moins un SR+ garanti**. Pitié SSR au 10ᵉ (compteur propre).
- Nouvel objet → niveau 1 (auto-équipé si l'emplacement est vide).
- Doublon → **+1 niveau** (max 5) ; au-delà → essence de compensation.
- Niveau : effet ×(1 + 0,25 × (niveau − 1)).

### 6.3 Reliques (passif permanent, 1 équipée)

| Relique | Rareté | Effet niveau 1 |
|---------|--------|-----------------|
| Prisme de rosée   | R  | Éclats de fusion +8 % |
| Marteau stellaire | R  | +1 charge d'ult par drop |
| Larme de comète   | SR | Fenêtre de cascade +250 ms |
| Couronne naine    | SR | Score +10 % |
| Cœur de Nexus     | SSR| Commence la manche à 40 % de charge |
| Astrolabe brisé   | SSR| Grâce de débordement +500 ms |

### 6.4 Compagnons (soutien déclenché, 1 équipé)

| Compagnon | Rareté | Déclencheur | Effet niveau 1 |
|-----------|--------|-------------|-----------------|
| Lumen        | R  | toutes les 12 fusions | +18 ✧ |
| Bulle        | R  | toutes les 15 fusions | jauge de débordement −50 % |
| Nébulin      | SR | toutes les 10 fusions | +8 charge d'ult |
| Stellina     | SR | toutes les 12 fusions | +60 score |
| Croc-de-Lune | SSR| 1×/manche, jauge ≥ 85 % | purge la jauge + ralenti 4 s |
| Aïon         | SSR| toutes les 20 fusions (−2/niveau, min 12) | élève le plus petit Astre d'un rang |

## 7. Défaite, victoire, relance

- **Défaite** : jauge de débordement pleine → « Puits instable ». Le méta-progrès
  (éclats, essence, roster, étoiles, niveaux, équipement) est conservé ; seul le plateau
  et le score de manche sont réinitialisés.
- **Victoire** : création d'Astra. Récompense +200 ✧, Nexus restauré +1.
- Relance : bouton overlay ou touche R.

## 8. Économie & éthique

- **Aucun achat réel** : toutes les monnaies se gagnent en jouant.
- Taux publiés en jeu (Sanctuaire, Reliquaire et HUD).
- Pitié transparente, garantie ×10 affichée, compensation des doublons publiée.
- Les doublons ont toujours de la valeur : étoiles/niveaux tant que non maxés, essence sinon.

## 9. Contrôles

- Pointeur : glisser = viser, taper dans la cuve = lâcher l'Astre.
- Clavier : ←/→ ou A/D viser · Entrée/↓ lâcher · ESPACE ult · G ou H ouvrir le Sanctuaire ·
  R recommencer · Échap retour hub.
- La sélection du Gardien, l'éveil, l'équipement relique/compagnon se font au hub (Galerie
  et Reliquaire).

## 10. Rendu & feedback (contrat visuel)

- Les Astres sont des personnages : visage, capuche, accessoire de rang, badge de rang,
  ombrage multi-couches, reflet spéculaire, halo.
- Prévisualisation : personnage réel semi-transparent au point de visée + miniature du suivant.
- FX obligatoires : onde de choc à chaque fusion, score flottant, éclats de particules,
  flash coloré et bannière au déclenchement d'ult, secousse d'écran sur les fusions de rang ≥ 6,
  texte flottant sur proc de compagnon.
- Intro animée au lancement (ciel étoilé, constellation qui se dessine, éclat du titre) — skippable.
