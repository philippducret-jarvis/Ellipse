# Lot 0 — Réalisation d'assets depuis une image

> **Phase fondatrice** du pipeline photo-to-game Ellipse.  
> Outils deterministes (sharp) · IA maîtresse via agents · ORDRE-001/003.

## Objectif

À partir **d'une seule photo**, produire des assets jouables :

| Sortie | Fichier | Agent |
|--------|---------|-------|
| Spritesheet 2D base | `player_sheet.png` | Le Héros |
| Spritesheet recouvert | `player_layered_sheet.png` | Le Héros |
| Éléments extraits | `element_head.png`, `element_torso.png`, … | Le Héros |
| Manifest session | `lot0/lot0_manifest.json` | Pipeline |
| Animations | GDL `animations` + `animation_state` | Le Mouvement |
| Modèle 3D | `lot0/hero.glb` + `hero_texture.png` | Le Sculpteur |

## Pipeline

```
Photo uploadée
     │
     ▼
extractImageElements ──► éléments (tête / torse / base / accents)
     │
     ▼
processPhotoToSprite ──► spritesheet 4 frames
     │
     ▼
composeLayeredSpriteSheet ──► recouvrement éléments sur chaque frame
     │
     ├──► buildLot0Animations ──► presets idle/run/jump/attack
     │
     └──► generateMeshFromSilhouette ──► billboard glTF texturé (si 3D)
```

## Extraction d'éléments

1. Normalisation 256×256 (fit contain)
2. Estimation fond (4 coins)
3. Masques par bandes horizontales : tête (0–32 %), torse (28–68 %), base (62–100 %)
4. Accents : grille 4×4, cellules les plus contrastées vs fond
5. Seuil chromatique → PNG alpha par élément

## Recouvrement (layers)

Chaque frame de la spritesheet reçoit les éléments extraits positionnés par ancre :

- `head` → 8 % hauteur
- `torso` → 35 %
- `base` → 72 %
- `accent` → overlay 45 %

Légère oscillation (`wobble`) sur les frames de course pour simuler le mouvement des accessoires.

## GDL produit

```json
{
  "entities": [{
    "assets": {
      "sprite": "/generated/{session}/lot0/player_layered_sheet.png",
      "base_sprite": "/generated/{session}/player_sheet.png",
      "layers": [{ "elementId": "head", "url": "...", "anchor": "head", "offsetY": 10 }],
      "frame_count": 4,
      "animations": { "run": { "frames": [0,1,2,3], "fps": 10 } },
      "lot0_manifest": "/generated/{session}/lot0/lot0_manifest.json"
    }
  }]
}
```

## Package

`@ellipse/pipeline` · `src/lot0/`

- `runLot0Pipeline()` — orchestrateur complet
- `readLot0Manifest()` — lecture inter-agents
- `generateMeshFromSilhouette()` — mesh 3D Lot 0

## Phase 2 (évolution)

- Segmentation sémantique (weights locaux ComfyUI / rembg)
- TripoSR pour mesh volumétrique réel
- Rigging automatique des layers extraits

## Test

```powershell
cd packages/pipeline
npx vitest run src/lot0/lot0.test.ts
```
