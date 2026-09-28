# Orbes d'Astra

Vertical slice du type `merge_drop_gacha` produit par Ellipse — jeu gacha complet.
Base de conception : `workspaces/orbes-d-astra/02_design/regles-du-jeu.md` (règles détaillées)
et `univers.md` (bible narrative).

- **Intro animée au lancement** (constellation qui se dessine, nuit sans constellation, titre) — skippable.
- Les pièces qui tombent sont des **personnages** : les huit Astres incarnés (Pio → Astra),
  visages ombrés multi-couches, reflets, paillettes, badge de rang. **Prévisualisation réelle**
  de l'Astre au point de visée + miniature du suivant avant de cliquer.
- **FX** : onde de choc et score flottant à chaque fusion, secousse d'écran sur les hauts rangs,
  bannière et flash colorés à l'ult, textes flottants des compagnons.
- **Hub multi-lieux** : Puits de fusion (jouer), Sanctuaire (invocation de Gardiens, autel animé),
  **Reliquaire** (invocation de **reliques** passives et **compagnons** de soutien + équipement),
  **Galerie** (sélection du Gardien, éveil, compétences), Chroniques (univers) et Codex (règles).
- **12 Gardiens** (4 R, 5 SR, 3 SSR), chacun avec un **ult unique** et **2 compétences spécifiques**
  actives en combat quand il est sélectionné.
- **Évolution par doublons** : chaque doublon = +1 étoile (max 5) — 1★ compétence A,
  3★ compétence B, 5★ Transcendance (+20 % d'ult). Les doublons donnent aussi de l'essence.
- **Éveil** : l'essence monte l'ult de 5 niveaux (+20 %/niveau) à la Galerie.
- **Loadout** : 1 Gardien + 1 relique (6 au catalogue) + 1 compagnon (6 au catalogue),
  affiché en jeu ; doublon d'objet = +1 niveau (max 5) puis essence.
- Invocations : Gardiens 100 ✧ (×10 = 900, SR+ garanti) ; Reliquaire 80 ✧ (×10 = 720, SR+ garanti).
  Taux publiés R 70 / SR 25 / SSR 5, pitié SSR au 10e tirage par bannière. Monnaie 100 % gagnée en jeu.
- Sauvegarde locale (roster, étoiles, éveils, objets, équipement, progression).

Commandes : ESPACE ult · G/H Sanctuaire · toucher le loadout = Galerie / Reliquaire ·
R recommencer · Échap retour hub.

```powershell
corepack pnpm orbes:build
corepack pnpm orbes:serve
```

Ouvrir ensuite `http://127.0.0.1:4312/` (4310 est réservé à Ellisphere).

## Application Windows autonome

```powershell
corepack pnpm orbes:desktop
```

Le binaire portable est créé dans
`apps/orbes-astra-desktop/release/Orbes-d-Astra-1.1.0-x64.exe`.
Il ouvre directement le jeu, sans Studio ni Preview. `F11` active le plein écran.
