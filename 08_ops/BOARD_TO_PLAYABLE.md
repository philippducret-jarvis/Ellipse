# Board vers jeu jouable

Le projet ne doit plus traiter un board comme un simple fond. Un board doit devenir un contrat de production spatial, puis un GDL jouable.

## Traduction obligatoire

1. Lire le board comme une intention:
   - promesse du jeu
   - genre et sous-type
   - humeur visuelle
   - personnages, ennemis, props, lieux, danger, objectif

2. Decouper le board en volume:
   - far background
   - midground landmarks
   - playfield collision
   - actors/interactables
   - foreground occluders
   - lighting/vfx

3. Transformer le volume en gameplay:
   - spawn lisible
   - chemin critique
   - collisions data-driven
   - ennemis/obstacles
   - reward
   - checkpoint ou recovery rule
   - goal ou boss gate

4. Transformer le gameplay en histoire:
   - opening motive
   - mid-slice turn
   - exit hook
   - quetes et dialogues relies a des triggers de zone

5. Bloquer la sortie commerciale si:
   - le player ne comprend pas l'objectif en 30 secondes
   - le board reste un wallpaper sans collision separee
   - les assets clefs restent placeholders
   - aucune route spawn-to-goal n'est prouvee
   - la scene n'a pas de reward, fail state et feedback

## Implementation actuelle

Le module `packages/shared/src/factory/visual-board-compiler.ts` produit:

- `meta.board_to_playable`
- `meta.first_playable_slice`
- `meta.production_contract.playable_slice_contract`
- `scenes[0].playable_volume`
- `scenes[0].story_beats`
- `scenes[0].asset_extraction_manifest`
- `narrative.quests`
- `ui.objective_tracker`

Les agents `producer` et `level` consomment ce contrat pour forcer les work orders et les layouts a converger vers une vraie tranche jouable.

