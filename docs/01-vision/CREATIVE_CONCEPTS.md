# Concepts créatifs Ellipse

Document de référence pour l'ambition produit — au-delà du MVP technique.

---

## 1. « Dream Session » — Création en flux continu

L'utilisateur ne lance pas une génération ponctuelle : il entre dans une **session de rêve** où le jeu évolue en temps réel pendant qu'il décrit.

- Parler pendant que le jeu se construit (voice-to-intent)
- Voir les agents travailler en parallèle sur une timeline circulaire (orbite Ellipse)
- Chaque orbite = un agent ; la taille = charge de travail

---

## 2. « Photo DNA » — ADN visuel du projet

Chaque photo uploadée est analysée pour extraire un **Photo DNA** :

```json
{
  "dominant_hues": ["#2d4a3e", "#c4a882"],
  "line_style": "organic",
  "subjects": ["canine", "outdoor"],
  "emotion": "joyful",
  "era": "contemporary"
}
```

Tous les agents consomment ce DNA — garantie de cohérence stylistique même avec 20 assets générés.

---

## 3. « Game Modes » génératifs

| Mode | Description |
|------|-------------|
| **Snapshot** | Une photo → mini-jeu en 5 min |
| **Saga** | 3 actes narratifs auto-générés |
| **Arena** | Combat local 1v1 depuis 2 selfies |
| **Museum** | Galerie 3D walkable de vos photos |
| **EduQuest** | Quiz + exploration pour l'éducation |

---

## 4. Sous-IA « Personnalités »

Chaque agent a une voix distincte dans le studio (optionnel, fun) :

- **L'Artiste** — perfectionniste, parle couleurs et composition
- **Le Mouvement** — énergique, obsédé par le game feel
- **L'Architecte** — calme, pense spatialisation
- **Le Game Designer** — pose des questions sur le fun

Renforce la perception d'une **équipe créative** plutôt qu'un outil froid.

---

## 5. Horizon 3D HD — « Cinematic Preview »

Objectif Phase 4 : preview avec qualité proche d'un trailer :

- PBR + IBL dynamique
- Depth of field, bloom sélectif
- Personnages avec subsurface scattering (skin)
- 4K export screenshot / clip partageable

---

## 6. Écosystème ouvert

- **Ellipse Forge** — marketplace de templates de gameplay
- **Style Packs** — palettes + prompts pré-validés
- **Remix** — fork le jeu de quelqu'un, change le héros avec votre photo
- **API Ellipse** — « Ajoutez un mini-jeu à votre app en 3 appels »

---

## 7. Éthique & créativité

- Watermark discret « Made with Ellipse » (tier free)
- Opt-in pour entraînement sur assets utilisateur : **jamais par défaut**
- Crédit artistique sur assets dérivés de photos tierces — warning UX
- Mode « inspiration only » — style sans copier le sujet

---

*Ce document alimente la vision produit — priorisation via [PHASES.md](../04-roadmap/PHASES.md).*
