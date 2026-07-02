# Taxonomie assets Ellipse — référence complète

> Source canonique code : `packages/shared/src/assets/taxonomy.ts`  
> Stages pipeline : `packages/shared/src/assets/pipeline-stages.ts`

---

## Principe fondamental

**Un asset = un dossier isolé = une famille = un rôle principal.**

Ne jamais mélanger héros, ennemis, boss, cartes ou UI dans le même dossier. Chaque entité du jeu possède son propre pipeline 8 stages.

---

## Inventaire complet des types utilisables

### Personnages (`03_assets/characters/`)

| Rôle | Famille | Usage runtime | Exemple Echoes |
|------|---------|---------------|----------------|
| `hero` | heroes | Avatar jouable, combat, inventaire | The Echo |
| `companion` | companions_and_allies | Escorte, compétences | — |
| `ally` | companions_and_allies | Allié combat | — |
| `guide` | companions_and_allies | Tutoriel, quêtes | — |
| `merchant` | companions_and_allies | Boutique | — |
| `npc` | companions_and_allies | Dialogue, ambiance | Myla |
| `enemy` | enemies | Combat standard | Sporeling family |
| `monster` | enemies | Variante forte | — |
| `summon` | enemies | Invocation joueur/ennemi | — |
| `mount` | enemies | Monture | — |
| `boss` | bosses | Combat de boss, phases | Root Guardian |

### Props (`03_assets/props/`)

| Rôle | Famille | Usage |
|------|---------|-------|
| `weapon` | weapons_and_relics | Armes équipables |
| `armor` | weapons_and_relics | Armures |
| `relic` | weapons_and_relics | Reliques, artefacts |
| `prop` | interaction_props | Objets interactifs |
| `checkpoint` | interaction_props | Points de sauvegarde |
| `door` | interaction_props | Portes |
| `portal` | interaction_props | Téléportation |
| `altar` | interaction_props | Choix, upgrades |
| `hazard` | hazards_and_pickups | Dangers environnement |
| `trap` | hazards_and_pickups | Pièges |
| `pickup` | hazards_and_pickups | Ramassables |
| `collectible` | hazards_and_pickups | Collection, codex |

### Environnements (`03_assets/environments/`)

| Rôle | Famille | Usage |
|------|---------|-------|
| `environment` | biomes_and_maps | Kit de niveau complet |
| `biome` | biomes_and_maps | Thème visuel (forêt, grotte…) |
| `background` | biomes_and_maps | Parallax, ciel |
| `tileset` | biomes_and_maps | Tuiles collision + décor |

### Interface (`03_assets/ui/`)

| Rôle | Usage |
|------|-------|
| `ui` | HUD, menus, codex, panneaux dialogue |

### Audio (`03_assets/audio/`)

| Rôle | Usage |
|------|-------|
| `music` | BGM, loops adaptatives |
| `sfx` | Effets gameplay |
| `voice` | Dialogue vocal |

### FX (`03_assets/fx/`)

| Rôle | Usage |
|------|-------|
| `fx` | Particules, juice combat, corruption |

---

## Kinds (formats techniques)

`character`, `environment`, `ui`, `audio`, `model`, `fx`, `prop`, `tileset`, `sprite`, `portrait`, `music`, `voice`, `material`, `animation`

Chaque kind est valide uniquement dans certaines familles — voir `validateRoleKindPair()` dans shared.

---

## Pipeline 8 stages

```
01_source → 02_cutouts → 03_cleanup → 04_rig → 05_animation → 06_exports → 07_qa
                                                                              ↑
08_remote_jobs (GPU parallèle dès 01_source)
```

| Stage | Agents | Outils clés |
|-------|--------|-------------|
| 02_cutouts | character | SAM2, rembg, BiRefNet |
| 03_cleanup | character, decor | Sharp, Aseprite |
| 04_rig | animation, mesh_3d | 2D Pose Editor, Mixamo, TripoSR |
| 05_animation | animation | ComfyUI, Wan 2.x, ControlNet OpenPose |
| 06_exports | integration | Atlas packer, glTF |
| 07_qa | qa | Pixel diff, smoke engine |

---

## Convention nommage

```
<role>__<slug-kebab>
```

Exemples :
- `hero__the-echo-main-hero`
- `enemy__sporeling-family`
- `boss__root-guardian-boss`
- `environment__origin-tree-level-kit`
- `prop__weapon-altar-and-checkpoints`

---

## Registry workspace

Chaque projet possède :

```
03_assets/registry/
  asset-taxonomy.json    # familles + realized_assets
  model-routing.json     # modèles ML par famille/stage
  assets.json            # UUID canoniques BDD
  cast.json              # casting narratif
  animation-specs.json   # state machines attendues
```

Synchronisation : `pnpm echoes:production-hq`
