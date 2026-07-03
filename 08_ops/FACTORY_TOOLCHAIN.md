# Factory toolchain gratuite

Objectif: donner a Ellipse une base operationnelle pour produire des jeux 2D et 2.5D a partir de prompts, boards et images, avec une chaine claire pour assets, niveaux, gameplay, economie/liveops et QA.

## Commandes

- `corepack pnpm run toolchain:doctor`: verifie les outils gratuits, les chemins locaux et les variables a connecter.
- `corepack pnpm run toolchain:setup`: tente les installations WinGet non presentes, avec timeout et garde contre les blocages MSI.

Les rapports generes sont:

- `08_ops/manifests/free-toolchain-report.json`
- `08_ops/manifests/free-toolchain.env.example`

## Outils locaux detectes

- Node, pnpm, Git, Python: base de build et scripts.
- Sharp/background removal et PixiJS: deja integres au workspace.
- Godot: runtime/export 2D optionnel, detecte en portable WinGet.
- Blender: pipeline 2.5D/3D et depth cards, installe en portable dans `AppData/Local/EllipseFactory/tools`.
- Tiled: tilemaps/collisions, extrait en portable via `lessmsi`.
- LDtk: rooms, entity placement et world graphs, installe dans `AppData/Local/Programs/ldtk`.

## Connexions a fournir

Ces services ne peuvent pas etre connectes sans compte/projet/secret utilisateur:

- `COMFYUI_URL`: worker ComfyUI local ou distant pour generation/inpaint/upscale.
- `PLAYFAB_TITLE_ID` et `PLAYFAB_DEV_SECRET_KEY`: catalogues, inventaire, currencies, bundles.
- `FIREBASE_CONFIG`: remote config et A/B tests.
- `GAMEANALYTICS_GAME_KEY` et `GAMEANALYTICS_SECRET_KEY`: telemetry design/economie.
- `UNITY_REMOTE_CONFIG_ENVIRONMENT_ID`: alternative optionnelle a Firebase.

SAM2 et BiRefNet restent des workers GPU manuels. La factory garde un fallback CPU via Sharp/background removal pour ne pas bloquer la production.

## Renforcement IA/factory

- L'agent `producer` fixe le scope, le sous-type, la toolchain, les work orders et les gates.
- L'agent `economy` genere economie gacha/liveops, bannieres, pity/spark, disclosure odds et evenements analytics.
- Le plan Cortex ajoute `producer` en amont et `economy` quand le genre ou les mechanics le demandent.
- Les workflows durables incluent le bootstrap toolchain, l'asset cutout SAM2/BiRefNet/Sharp/ComfyUI, la scene assembly Tiled/LDtk et le pipeline gacha liveops.
