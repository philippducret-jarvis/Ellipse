# Pipeline Photo-to-Game — Phase 1

Package `@ellipse/pipeline` — workers vision Ellipse (sans API tierce).

## Capacités v0

| Étape | Module | Output |
|-------|--------|--------|
| Segmentation / crop | `sharp` | Zone centrale HD |
| Spritesheet | 4 frames | `generated/{sessionId}/player_sheet.png` |
| Palette | stats image | patches GDL `/style/palette` |
| ComfyUI | stub détection | Phase 2 — weights `ellipse-asset-v0` |

## Worker isolé (ORDRE-006)

```bash
pnpm dev:pipeline   # Queue ellipse:pipeline:vision
```

## Usage agent Asset

L'agent Asset appelle `processPhotoToSprite()` inline ; le worker queue est prêt pour charge GPU future.
