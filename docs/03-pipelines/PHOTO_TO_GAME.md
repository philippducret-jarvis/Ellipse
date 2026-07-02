# Pipeline Photo-to-Game

Ce document décrit le parcours complet : **de une ou plusieurs photos à un jeu jouable**, sans intervention code.

---

## Vue d'ensemble des étapes

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ 1.INPUT  │ → │ 2.ANalyse│ → │ 3.GEN    │ → │ 4.ASSEMBLE│ → │ 5.PLAY  │
│ Photos   │   │ Vision   │   │ Assets   │   │ GDL+QA   │   │ Preview │
│ + Prompt │   │ + Intent │   │ + Level  │   │          │   │ + Export│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## Étape 1 — Input utilisateur

### Sources acceptées
| Type | Usage typique |
|------|---------------|
| Photo personnage | Sprite / modèle 3D héros |
| Photo lieu | Texture environnement, référence level |
| Photo objet | Item collectible, arme |
| Moodboard (multi) | Style guide global |
| Prompt seul | Génération from scratch |

### Pré-traitement automatique
- EXIF strip, resize max 4K
- Détection qualité (blur, exposure) → warning si insuffisant
- Classification scène (portrait, paysage, objet)

---

## Étape 2 — Analyse vision + intent

### Vision Pipeline (Asset Agent + Maîtresse)
```
Photo
  ├─► Subject Detection (YOLO / Grounding DINO)
  ├─► Segmentation (SAM 2) → mask PNG
  ├─► Depth Estimation (MiDaS / Depth Anything)
  ├─► Style Extraction (palette, ligne, époque)
  └─► Pose (humain/animal) → Animation Agent
```

### Intent fusion
La maîtresse combine :
- Prompt utilisateur (*« platformer humoristique »*)
- Analyse vision (*sujet = chat, fond = salon*)
- Genre implicite ou explicite

**Sortie :** `GenerationPlan` — liste ordonnée de tâches agents.

---

## Étape 3 — Génération par domaine

### 3A — Personnage depuis photo (2D HD)

| Sous-étape | Technologie | Output |
|------------|-------------|--------|
| Détourage | rembg / SAM | `char_mask.png` |
| Stylisation | SDXL img2img + ControlNet | `char_base.png` |
| Spritesheet | Auto-slice + inpainting poses | `char_sheet.png` |
| Metadata | JSON | frames, pivot, hitbox |

**Haute définition :** upscale 4x → sprites 512px/frame minimum pour 1080p.

### 3B — Environnement depuis photo (2D)

| Sous-étape | Output |
|------------|--------|
| Depth → layers | Parallax 3-5 plans |
| Tile extraction | Set tiles seamless |
| Collision mask | Alpha → polygone simplifié |

### 3C — Objet 3D depuis photo

| Sous-étape | Technologie | Output |
|------------|-------------|--------|
| Multi-view synth | Zero123++ | views |
| Reconstruction | TripoSR / InstantMesh | `.glb` |
| Texture bake | Original photo projetée | PBR maps |
| LOD | Decimate | lod0, lod1 |

### 3D HD — Rendu
- PBR materials (albedo, normal, roughness)
- IBL lighting preset selon mood
- Target : 60 FPS @ 1080p sur GPU mid-range (WebGPU)

---

## Étape 4 — Assemblage & gameplay

### Gameplay Agent applique template genre

Exemple **platformer 2D** :
```yaml
systems: [input, platformer_physics, tile_collision, camera_follow]
player:
  components: [platformer_controller, coyote_time, jump_buffer]
enemies:
  template: patrol_walker
win_condition: reach_flag
```

### Level Agent place dans le décor généré
- Spawn player
- Plateformes depuis collision layer
- Flag / porte fin de niveau

### QA Agent
- Bot virtuel tente d'atteindre le flag
- Si échec → Level Agent ajuste gaps / ajoute plateformes

---

## Étape 5 — Preview & export

| Action | Description |
|--------|-------------|
| Hot reload | Changement GDL → preview instantané |
| Play in Studio | Iframe engine embarqué |
| Export Web | Static build + assets CDN |
| Export Desktop | Electron wrapper (Phase 3) |

---

## Exemples de parcours complets

### Parcours A — « Mon chien en platformer »
1. Upload photo chien (jardin)
2. Prompt : *« Jeu platformer fun, le chien collecte des os »*
3. Asset Agent : chien stylisé cartoon + spritesheet
4. Level Agent : jardin → tiles herbe, parallax clôture
5. Gameplay Agent : collectibles, score, 3 vies
6. Audio Agent : aboiements SFX, musique enjouée
7. **Résultat :** 1 niveau jouable en ~10-15 min (cible)

### Parcours B — « Carte postale → exploration 3D »
1. Upload carte postale ville
2. Prompt : *« Exploration libre third person »*
3. Asset Agent : mesh simplifié skyline + textures
4. Level Agent : navmesh sol, points d'intérêt
5. Gameplay Agent : caméra orbit, interactions examine
6. **Résultat :** scène 3D walkable (Phase 4)

---

## Qualité & itération

### Feedback loop utilisateur
```
User: "Le personnage est trop petit"
  → Maîtresse → Asset Agent (re-scale) + Level Agent (tile ratio)
  → Patch GDL transform.scale
  → Preview updated
```

### Style lock
Une fois le style approuvé, toutes les générations suivantes utilisent :
- `style_guide.json` (palette, line weight, saturation)
- Référence embedding CLIP fixe

---

## Limites connues (transparence)

| Limite | Mitigation |
|--------|------------|
| Photo floue | Upscale + warning ; demander autre photo |
| Personnage complexe 3D | Fallback 2.5D billboards |
| Gameplay AAA | Templates mid-core ; pas open-world procédural infini v1 |
| Cohérence animation | Human-in-the-loop mode Guidé |

---

## Métriques pipeline

- **Latency P50** photo → preview : objectif 8 min (Phase 2)
- **Asset reuse rate** : % assets validés sans re-gen
- **QA pass rate** first try : > 60 %
