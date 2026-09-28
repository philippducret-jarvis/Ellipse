# Runtime Godot V2

Premier vertical slice séparé de la V1.

## Ce qui est réellement jouable

- hub 3D avec le GLB blockout de Mira ;
- entrée dans l’arène du Port noyé ;
- lâcher tactile/souris d’Orbes physiques ;
- fusion automatique de deux rangs identiques ;
- dégâts, score, combo et trois phases de boss ;
- `Q` Puits astral, `E` Ultime, `R` Surpuissance ;
- attaque périodique du Léviathan ;
- victoire, résultat, rejouer et retour hub ;
- interface adaptable PC/mobile.

## Ce qui reste un blockout

Mira, Brann, Aster, le Léviathan, l’arène, le lighting, l’audio et les VFX. Le
runtime valide le système et l’échelle ; il ne constitue pas une candidate
commerciale.

## Validation

```powershell
$godot = "CHEMIN_VERS_GODOT.exe"
& $godot --headless --editor --path . --quit
& $godot --headless --path . --quit-after 120
```
