# Shadow Echoes — Séraphine V4.1 et décor de combat en volume

## État du jalon

Séraphine reste le **pilote artistique** avant toute reprise de la méthode sur Nyxara, Lysael ou Voren. Les candidats V2 et V3 sont conservés. La V4 ajoute au visage et au corset V3 une chevelure, une coiffe à épines et roses, et des panneaux d'étoffe avec UV, cartes PBR et poids de peau. La V4.1 écarte et ondule les mèches pour mieux dégager le visage. Ces fichiers sont **valides techniquement mais non validés artistiquement**. La V2 demeure le choix par défaut du combat ; V4 et V4.1 s'ouvrent seulement en revue.

Le combat « Voir étude 3D » possède maintenant une scène complète : sol et parapet de pierre, colonnes et arcs à plusieurs profondeurs, chaînes, braseros, bannières animées, brouillard et particules. La pierre utilise couleur, normale et rugosité. Le garde-corps qui coupait les personnages a été abaissé, et les armes des sentinelles ont été replacées dans leurs mains. La ville lointaine reste un **panorama atmosphérique** derrière cette architecture 3D ; elle n'est pas présentée comme un château entièrement modélisé. L'ancienne version de la scène et du CSS est archivée dans `02_production/lot-13/legacy/`.

## Accès de revue

- Atelier : `07_exports/web/asset-lab.html?hero=seraphine&model=groom` pour V4.1 ; `model=silhouette` pour V4, et boutons V3/V2 conservés.
- Combat : `07_exports/web/tactics.html?seraphine=groom-v4-1`, puis **Voir étude 3D**. `seraphine=silhouette-v4` charge la V4 antérieure.
- Maître éditable : `03_assets/characters/seraphine/modeling/seraphine-silhouette-v4-1.blend` ; GLB maître à 42 clips et GLB de combat à huit clips dans le même dossier.
- Contrôles visuels : `02_production/lot-13/qa/`, dont `seraphine-v4-1-face-detail.png` et `seraphine-v4-1-battle-modeled.png`.

## Contrôle et écart à la cible

La V4.1 passe l'audit GLB sans erreur ni avertissement : huit maillages skinnés, 72 articulations, 42 animations, 149 899 sommets skinnés, 14 matériaux. La revue navigateur charge l'atelier et l'arène avec les huit clips de combat. Le test tactique couvre encore quatre héros, trois adversaires, les rangs, échanges, compétences, sauvegarde et affichage mobile.

La capture révèle que la forme des mèches reste trop géométrique, la coiffe trop simple, les épaules et manches trop anguleuses et la jupe trop régulière par rapport à la planche de production. Le visage manque de finition anatomique et de rendu peau/cheveux. À taille de combat, la lecture est meilleure qu'en V3, mais la fidélité souhaitée n'est pas atteinte. Le décor a une vraie profondeur au premier plan ; les piliers et le pont doivent encore recevoir une maçonnerie détaillée, des ruptures, sculptures, usure et variation de lumière, et la cité du panorama doit être remplacée progressivement par des volumes de production et des couches atmosphériques.

**Décision :** pas de promotion V4.1 par défaut et pas de propagation aux autres Mythiques. La prochaine passe de Séraphine doit traiter une sculpture artistique du visage, des mèches et du costume à partir des vues de référence, avec retopologie et UV contrôlés, peinture des matières et validation d'animation/éclairage aux trois angles et à l'échelle de combat. Ensuite seulement, établir le gabarit réutilisable pour les autres personnages et les décors HD.

## Reproduction

```powershell
python tools/blender/build_shadow_seraphine_v4_maps.py
python tools/blender/build_shadow_masonry_maps.py
& 'C:\Users\phili\AppData\Local\EllipseFactory\tools\blender-5.1.2-windows-x64\blender.exe' --background 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-surface-v3.blend' --python 'tools/blender/build_shadow_seraphine_silhouette_v4.py'
& 'C:\Users\phili\AppData\Local\EllipseFactory\tools\blender-5.1.2-windows-x64\blender.exe' --background 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-silhouette-v4.blend' --python 'tools/blender/optimize_shadow_seraphine_v4.py'
& 'C:\Users\phili\AppData\Local\EllipseFactory\tools\blender-5.1.2-windows-x64\blender.exe' --background 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-silhouette-v4-optimized.blend' --python 'tools/blender/refine_shadow_seraphine_hair_v4_1.py'
node tools/build-shadow-echoes-volume.mjs
node tools/audit-shadow-echoes-hero-assets.mjs --enforce --hero seraphine 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-silhouette-v4-1.glb'
node tools/verify-shadow-echoes-silhouette-v4.mjs --groom
node tools/verify-shadow-echoes-tactics.mjs
```
