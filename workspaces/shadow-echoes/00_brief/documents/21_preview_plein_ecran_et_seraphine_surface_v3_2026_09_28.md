# Shadow Echoes — preview Ellipse et Séraphine V3

## Résultat livré

- Le Studio Ellipse propose **Plein écran** dans sa preview intégrée. Le bouton utilise l’API plein écran du navigateur ; si l’hôte la refuse, la fenêtre de preview occupe quand même toute la fenêtre de l’outil. **Échap** sort de ce mode. Un lien **Ouvrir à part** est disponible. L’iframe autorise le plein écran.
- Une erreur de syntaxe qui empêchait le lanceur Electron de se charger a été corrigée dans `apps/ellipse-desktop/electron-main.mjs`.
- Le V2 et les anciennes versions de Séraphine restent disponibles. Le nouveau candidat V3 est indépendant et **non approuvé artistiquement**.

## Candidat de surface V3

La base animée V2 garde son squelette à 72 articulations et ses 42 clips. Seuls les polygones frontaux obsolètes des yeux, du visage et du corset sont retirés. Deux nouvelles surfaces sont construites dans `tools/blender/build_shadow_seraphine_surface_v3.py` : visage anatomique simplifié et corset ajusté avec poitrine, taille, encolure et ourlet. Chacune a une surface haute densité de 12 513 sommets conservée dans le `.blend` et une cage de jeu en quads de 3 185 sommets, UV dépliée et pondérée au rig.

Les deux planches de couleur ont été produites avec le **skill imagegen**, outil intégré, en prenant `turnaround-v1.png` comme **référence** : (1) visage frontal mat de la même héroïne, sans ombre projetée ni accessoires, utilisable comme albedo ; (2) corset gothique frontal noir et bordeaux, dentelle et filigrane d’épines dorées, sans corps ni ombre. Elles sont enregistrées sous `03_assets/characters/seraphine/textures/v3/`. `tools/blender/build_shadow_seraphine_surface_maps.py` en dérive des cartes distinctes de rugosité, métal et normale, alignées sur les UV. Les matériaux exportés possèdent chacun base color, metallic-roughness et normal dans le GLB.

Fichiers principaux :

- `03_assets/characters/seraphine/modeling/seraphine-surface-v3.blend` — sculpt de surface et cages retopologisées éditables ;
- `03_assets/characters/seraphine/modeling/seraphine-surface-v3.glb` — maître animé, 42 clips ;
- `03_assets/characters/seraphine/modeling/seraphine-surface-v3-runtime.glb` — export de revue de combat limité à 8 clips ;
- `07_exports/web/asset-lab.html?hero=seraphine&model=surface` — comparaison artistique, vue de face, détail visage et taille de combat ;
- `07_exports/web/tactics.html?seraphine=surface-v3` — revue V3 dans l’arène tactique, via **Voir étude 3D**.

## Contrôle et décision artistique

Le contrôle GLB passe sans erreur ni avertissement : 3 meshes skinnés, 1 peau, 72 articulations, 42 clips, 183 325 sommets et 12 matériaux. Les captures de revue sont dans `02_production/lot-12/qa/` : `seraphine-v3-atelier.png`, `seraphine-v3-face-detail.png`, `seraphine-v3-face-threequarter.png`, `seraphine-v3-face-side.png`, `seraphine-v3-combat-scale.png` et `seraphine-v3-battle.png`.

Le visage et le corset sont plus lisibles en gros plan, mais le rendu **ne rejoint pas encore la cible** : profil du visage encore trop mince, cheveux en panneaux rigides, couronne, manches, jupe, arme et proportions générales simplifiés. À taille de combat, les nouveaux détails fins sont peu perceptibles ; la silhouette et l’intégration au décor dominent. Le V3 reste donc un candidat d’atelier, et la vue 3D jouable garde le V2 par défaut. Les trois autres Mythiques, les sentinelles et la maçonnerie ne sont pas promus au-delà de l’étude de volume.

Vérifications exécutées : `verify-ellipse-preview-fullscreen.mjs` (parcours réel Studio → iframe → plein écran → retour), deux tests de `PreviewModal`, typecheck et build Studio, audit GLB, `verify-shadow-echoes-surface-v3.mjs`, revue ciblée `verify-shadow-echoes-surface-v3-battle.mjs` et régression `verify-shadow-echoes-tactics.mjs`. Les essais navigateur ont produit les captures listées ci-dessus.

La suite nécessaire est une sculpture manuelle du crâne, des oreilles, des cheveux et des volumes de costume, une retopologie contrôlée des ouvertures et des coutures, puis des matériaux PBR peints pour l’ensemble — notamment cheveux, métaux, soies et arme. La validation doit se faire sur plusieurs angles, en animation et dans l’arène à la taille de combat avant de remplacer le V2 par défaut.

## Reproduction

```powershell
python tools/blender/build_shadow_seraphine_surface_maps.py
& 'C:\Users\phili\AppData\Local\EllipseFactory\tools\blender-5.1.2-windows-x64\blender.exe' --background 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-atelier-v2.blend' --python 'tools/blender/build_shadow_seraphine_surface_v3.py'
& 'C:\Users\phili\AppData\Local\EllipseFactory\tools\blender-5.1.2-windows-x64\blender.exe' --background 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-surface-v3.blend' --python 'tools/blender/export_shadow_seraphine_v3_runtime.py'
node tools/build-shadow-echoes-volume.mjs
node tools/audit-shadow-echoes-hero-assets.mjs --enforce --hero seraphine 'workspaces/shadow-echoes/03_assets/characters/seraphine/modeling/seraphine-surface-v3.glb'
node tools/verify-shadow-echoes-surface-v3.mjs
```
